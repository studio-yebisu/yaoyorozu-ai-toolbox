"""Prepare both orientations of credited MP4 downloads, leaving playback originals intact."""
import argparse
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import date
import hashlib
import json
import os
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / 'data/video-downloads.json'
LINES = [json.loads((ROOT / 'data/projects.json').read_text('utf-8'))['title'], '@studio_yebisu']
SPEC = 'credit-footer-english-v4'


def sha(path):
    with path.open('rb') as handle:
        return hashlib.file_digest(handle, 'sha256').hexdigest()


def probe(path):
    return json.loads(subprocess.check_output(['ffprobe', '-v', 'error', '-show_streams',
                                              '-show_format', '-of', 'json', str(path)], encoding='utf-8'))


def render(case, orientation, encoder, text_paths, prior, font, site_url):
    source = ROOT / case['video_' + orientation]
    destination = ROOT / 'media/downloads' / (case['id'] + '-' + orientation + '-credited-v4.mp4')
    source_hash = sha(source)
    font_hash = sha(font)
    if destination.exists():
        if prior and prior['source_sha256'] == source_hash and prior['spec'] == SPEC and prior['font_sha256'] == font_hash and prior['sha256'] == sha(destination):
            return prior
        raise FileExistsError(f'Existing output has no matching receipt; preserve it and choose a fresh destination: {destination}')
    def ffpath(path):
        return path.as_posix().replace(':', r'\:')
    before = probe(source)
    bv = next(s for s in before['streams'] if s['codec_type'] == 'video')
    width, height = bv['width'], bv['height']
    # A slim, single-line signature; fit the full diagram without covering any labels.
    short_side = min(width, height)
    strip = max(36, round(short_side * .06 / 2) * 2)
    size = max(13, round(short_side * .0236))
    inset = max(18, round(width * .025))
    filters = [f'scale={width}:{height - strip}:force_original_aspect_ratio=decrease:force_divisible_by=2',
               f'pad={width}:{height}:(ow-iw)/2:0:color=0xf2eee3',
               f'drawbox=x=0:y=ih-{strip}:w=iw:h={strip}:color=0x111817:t=fill',
               f'drawbox=x={inset}:y=ih-{strip}/2-2:w=4:h=4:color=0xff7046:t=fill']
    for text_path, color, x in [(text_paths[0], '0xeef1ee', str(inset + 12)),
                                (text_paths[1], '0xa8b5b0', f'w-tw-{inset}')]:
        filters.append(f"drawtext=fontfile='{ffpath(font)}':textfile='{ffpath(text_path)}':expansion=none:"
                       f'fontsize={size}:fontcolor={color}:x={x}:y=h-{strip}/2-th/2')
    temporary = destination.with_name(destination.stem + '.working.mp4')
    encoding = ['-c:v', 'h264_nvenc', '-preset', 'p5', '-rc', 'vbr', '-cq', '19', '-b:v', '0'] if encoder == 'h264_nvenc' else ['-c:v', 'libx264', '-preset', 'veryfast', '-crf', '19', '-threads', '6']
    try:
        subprocess.run(['ffmpeg', '-n', '-v', 'error', '-i', str(source), '-map', '0:v:0', '-map', '0:a?',
                        '-vf', ','.join(filters), *encoding, '-pix_fmt', 'yuv420p', '-c:a', 'copy',
                        '-metadata', 'copyright=' + ' '.join(LINES),
                        '-metadata', 'comment=Source: ' + site_url + 'case.html?id=' + case['id'],
                        '-movflags', '+faststart', str(temporary)], check=True)
    except subprocess.CalledProcessError:
        if temporary.exists():
            temporary.unlink()
        raise
    after = probe(temporary)
    av = next(s for s in after['streams'] if s['codec_type'] == 'video')
    assert (av['width'], av['height']) == (bv['width'], bv['height']), 'Download dimensions changed'
    assert abs(float(after['format']['duration']) - float(before['format']['duration'])) < .1, 'Download duration changed'
    assert sum(s['codec_type'] == 'audio' for s in before['streams']) == sum(s['codec_type'] == 'audio' for s in after['streams']), 'Audio stream lost'
    temporary.rename(destination)
    return {'case_id': case['id'], 'orientation': orientation, 'source': source.relative_to(ROOT).as_posix(),
            'source_sha256': source_hash, 'path': destination.relative_to(ROOT).as_posix(),
            'sha256': sha(destination), 'spec': SPEC, 'font_sha256': font_hash, 'encoder': encoder,
            'width': av['width'], 'height': av['height'], 'duration': float(after['format']['duration'])}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--case', help='Prepare a representative case before the full batch')
    parser.add_argument('--encoder', choices=['libx264', 'h264_nvenc'], default='libx264')
    parser.add_argument('--jobs', type=int, choices=[1, 2], default=2)
    args = parser.parse_args()
    cases = [json.loads(p.read_text('utf-8')) for p in sorted((ROOT / 'data/cases').glob('*.json'))]
    if args.case:
        cases = [c for c in cases if c['id'] == args.case]
        if not cases:
            parser.error('Unknown case id')
    font = Path(os.environ.get('WINDIR', 'C:/Windows')) / 'Fonts/segoeui.ttf'
    if not font.is_file():
        parser.error('Install Segoe UI before rendering credits')
    cache = ROOT / '.local/video-downloads'
    cache.mkdir(parents=True, exist_ok=True)
    texts = [cache / f'line-{i + 1}.txt' for i in range(len(LINES))]
    for path, line in zip(texts, LINES):
        path.write_text(line, encoding='utf-8')
    (ROOT / 'media/downloads').mkdir(exist_ok=True)
    manifest = json.loads(MANIFEST.read_text('utf-8')) if MANIFEST.exists() else {'schema_version': 1, 'assets': []}
    assets = {(a['case_id'], a['orientation']): a for a in manifest['assets']}
    site_url = json.loads((ROOT / 'data/projects.json').read_text('utf-8'))['site_url']
    with ThreadPoolExecutor(max_workers=args.jobs) as pool:
        tasks = [pool.submit(render, c, o, args.encoder, texts, assets.get((c['id'], o)), font, site_url)
                 for c in cases for o in ('portrait', 'landscape')]
        for future in as_completed(tasks):
            result = future.result()
            assets[result['case_id'], result['orientation']] = result
            manifest.update({'updated_on': date.today().isoformat(), 'watermark': LINES,
                             'production': 'Local FFmpeg composition; no AI model inference.',
                             'assets': sorted(assets.values(), key=lambda a: (a['case_id'], a['orientation']))})
            MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', 'utf-8')
            print(f"Ready {result['case_id']} {result['orientation']}", flush=True)
    for case in cases:
        path = ROOT / 'data/cases' / (case['id'] + '.json')
        current = json.loads(path.read_text('utf-8'))
        for orientation in ('portrait', 'landscape'):
            assert current['video_' + orientation] == case['video_' + orientation], 'Playback source changed during rendering'
            current['video_download_' + orientation] = assets[case['id'], orientation]['path']
        path.write_text(json.dumps(current, ensure_ascii=False, indent=2) + '\n', 'utf-8')
    print(f'Prepared downloads for {len(cases)} case(s)', flush=True)


if __name__ == '__main__':
    main()
