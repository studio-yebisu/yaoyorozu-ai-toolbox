"""Recompose saved reference/Japanese videos for wide and stacked mobile viewing."""
import argparse
import os
from pathlib import Path
import subprocess

HERE = Path(__file__).resolve().parent


def render(output, portrait):
    font = Path(os.environ.get('WINDIR', 'C:/Windows')) / 'Fonts/arial.ttf'
    font_arg = font.as_posix().replace(':', r'\:')
    width, height = (720, 1280) if portrait else (1280, 720)
    panel_w, panel_h = (672, 378) if portrait else (592, 334)
    x1, y1, x2, y2 = (24, 170, 24, 680) if portrait else (32, 176, 656, 176)
    labels = [(24, 130, 'REFERENCE'), (24, 640, 'JAPANESE / SVG + GSAP')] if portrait else [
        (32, 136, 'REFERENCE'), (656, 136, 'JAPANESE / SVG + GSAP')]
    labels += [(24 if portrait else 32, 35, 'Motion2Code'),
               (24 if portrait else 32, 1190 if portrait else 645, '八百万図AIツールボックス')]
    filters = [
        f'color=c=0xf2eee3:s={width}x{height}:r=30:d=20[bg]',
        f'[0:v]fps=30,trim=duration=10,setpts=PTS-STARTPTS,loop=loop=1:size=300:start=0,scale={panel_w}:{panel_h}:force_original_aspect_ratio=decrease:force_divisible_by=2,setsar=1,'
        f'pad={panel_w}:{panel_h}:(ow-iw)/2:(oh-ih)/2:color=0xfbf9f3[a]',
        f'[1:v]fps=30,trim=duration=10,setpts=PTS-STARTPTS,loop=loop=1:size=300:start=0,scale={panel_w}:{panel_h}:force_original_aspect_ratio=decrease:force_divisible_by=2,setsar=1,'
        f'pad={panel_w}:{panel_h}:(ow-iw)/2:(oh-ih)/2:color=0xfbf9f3[b]',
        f'[bg][a]overlay={x1}:{y1}[one]',
        f'[one][b]overlay={x2}:{y2}[two]',
    ]
    text = ','.join(f"drawtext=fontfile='{font_arg}':text='{value}':x={x}:y={y}:"
                    f"fontsize={34 if value == 'Motion2Code' else 21}:fontcolor=0x17150f"
                    for x, y, value in labels)
    filters.append('[two]' + text + '[out]')
    subprocess.run(['ffmpeg', '-n', '-v', 'error', '-i', str(HERE / 'assets/source.mp4'),
                    '-i', str(HERE / 'assets/japanese.mp4'),
                    '-filter_complex', ';'.join(filters), '-map', '[out]', '-t', '20', '-an',
                    '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p',
                    '-movflags', '+faststart', str(output)], check=True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--out', type=Path, required=True)
    args = parser.parse_args()
    args.out.mkdir(parents=True, exist_ok=True)
    for orientation in ('portrait', 'wide'):
        render(args.out / (orientation + '.mp4'), orientation == 'portrait')
