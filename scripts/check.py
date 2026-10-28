"""Check user-facing artifacts and links in the generated publication."""
from html.parser import HTMLParser
import hashlib
import json
from check_open_models import check_open_models
from production_records import check_download_asset, check_production_artifacts
from mechanical_maintenance import MechanicalMaintenance
from pathlib import Path
import subprocess
import re
from catalog import load_categories, model_entries
from social_cards import check_social_pages
from check_navigation import check_navigation
from case_presentation import validate_presentation_aggregate
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / 'dist'


def local_file(value, base=DIST):
    url = urlsplit(value)
    if url.scheme or url.netloc or not url.path or url.path.startswith('#'):
        return
    target = (base / unquote(url.path)).resolve()
    if not target.is_relative_to(DIST.resolve()):
        raise ValueError(f'Path escapes publication: {value}')
    if not target.exists():
        raise FileNotFoundError(f'Broken local link: {value} (from {base})')


class Links(HTMLParser):
    def __init__(self, page):
        super().__init__()
        self.page = page

    def handle_starttag(self, tag, attrs):
        for name, value in attrs:
            if name in ('href', 'src', 'poster') and value:
                local_file(value, self.page.parent)


def main():
    for page in DIST.rglob('*.html'):
        Links(page).feed(page.read_text('utf-8'))
    catalog = json.loads((DIST / 'data/catalog.json').read_text('utf-8'))
    ids = [e['id'] for e in catalog['entries']]
    assert len(ids) == len(set(ids)), 'Duplicate catalog ids'
    assert catalog['categories'] == load_categories(), 'Published categories differ from the canonical taxonomy'
    category_ids = {category['id'] for category in catalog['categories']}
    assert all(entry['category'] in category_ids for entry in catalog['entries']), 'Unknown entry category'
    assert 'agents-studio-yebisu' not in ids, 'Internal orchestrator leaked into the catalog'
    assert not (DIST / 'skills/studio-yebisu').exists(), 'Internal orchestrator was distributed'
    home = (DIST / 'index.html').read_text('utf-8')
    assert 'data-models-featured' not in home and 'href="#models"' not in home, 'Models must remain normal catalog categories, without the homepage teaser'
    model_data = json.loads((DIST / 'data/open-models.json').read_text('utf-8'))
    model_resources = [entry for entry in catalog['entries'] if entry.get('resource_type') == 'open-weight-model']
    assert model_resources == model_entries(model_data), 'Models were omitted, duplicated or changed during catalog integration'
    for entry in catalog['entries']:
        for key in ('source_url', 'guide_url', 'license_url', 'image', 'skill_download', 'example_url'):
            if entry.get(key):
                local_file(entry[key])
        if entry.get('verification_stage') in ('source-reviewed', 'runtime-reviewed'):
            assert re.fullmatch(r'[0-9a-f]{40}', entry.get('source_commit', '')), 'Curated source is not pinned'
            assert entry['source_commit'] in entry['source_url'], 'Curated URL does not point to the reviewed commit'
            assert entry['source_commit'] in entry['license_url'], 'License does not point to the reviewed commit'
        if entry.get('verification_stage') == 'source-reviewed':
            assert entry.get('workflow') and entry.get('requirements'), 'Curated guide is incomplete'
            assert not entry.get('example_url') and not entry.get('image'), 'Source review cannot claim a new example'
            assert entry.get('source_note') and entry.get('license_note'), 'Curated provenance or conditions missing'
    published_cases = json.loads((DIST / 'data/cases.json').read_text('utf-8'))
    cases = [json.loads(p.read_text('utf-8')) for p in sorted((DIST / 'data/cases').glob('*.json'))]
    like_ids = set(ids) | {case.get('catalog_entry', {}).get('id') or 'case-' + case['id'] for case in cases}
    allowed_likes = json.loads((ROOT / 'services/likes/items.json').read_text('utf-8'))
    assert allowed_likes == sorted(like_ids), 'Likes allowlist is stale; run python scripts/prepare_likes.py and redeploy the likes service'
    validate_presentation_aggregate(published_cases, cases)
    assert cases, 'No finished case'
    maintenance = MechanicalMaintenance(DIST, cases)
    local_file('MEDIA-LICENSE.md')
    downloads = json.loads((DIST / 'data/video-downloads.json').read_text('utf-8'))
    download_assets = {(a['case_id'], a['orientation']): a for a in downloads['assets']}
    assert len(download_assets) == len(cases) * 2, 'Credited downloads missing or duplicated'
    case_entries = {case.get('catalog_entry', {}).get('id'): case for case in cases if case.get('catalog_entry')}
    for entry in catalog['entries']:
        if entry.get('verification_stage') != 'runtime-reviewed':
            continue
        case = case_entries.get(entry['id'])
        assert case, 'Executed resource has no finished case'
        assert entry.get('source_commit'), 'Executed resource lost its fixed source'
        proof_path = DIST / 'data/production' / (case['id'] + '.json')
        proof = json.loads(proof_path.read_text('utf-8'))
        assert proof['model']['requested'] == 'claude-opus-5-5', 'Unexpected production model'
        assert proof['model']['reported'] == ['claude-opus-5-5'], 'Production model lacks execution proof'
        assert proof['upstream']['commit'] == entry['source_commit'], 'Runtime proof refers to another upstream version'
        assert proof['runtime']['status'] == 'passed', 'Resource runtime proof is incomplete'
        assert proof['runtime']['sample_count'] > 0, 'Executed resource has no real sample'
        assert proof.get('artifacts_sha256'), 'Resource artifact hashes missing'
        check_production_artifacts(DIST, case, proof_path, proof, maintenance)
    for case in cases:
        for source in case.get('sources', []):
            if source.get('url'):
                local_file(source['url'])
        assert case['video_license']['id'] == 'LicenseRef-Yaoyorozu-Video-Credit', 'Video reuse conditions missing'
        assert case['video_license']['x_mention'] == '@studio_yebisu', 'Mandatory X attribution missing'
        local_file(case['video_license']['url'])
        for orientation in ('portrait', 'landscape'):
            asset = download_assets[case['id'], orientation]
            assert case['video_download_' + orientation] == asset['path'], 'Download link does not refer to the credited video'
            local_file(asset['path'])
            assert asset['source'] == case['video_' + orientation], 'Download was composed from another source'
            assert hashlib.sha256((DIST / asset['source']).read_bytes()).hexdigest() == asset['source_sha256'], 'Playback source changed after watermarking'
            assert hashlib.sha256((DIST / asset['path']).read_bytes()).hexdigest() == asset['sha256'], 'Credited download changed after verification'
            check_download_asset(DIST, case, asset)
        for key in ('demo', 'video', 'poster', 'skill', 'samples'):
            local_file(case[key])
        variants = {}
        for orientation, video_key, poster_key in (
                ('portrait', 'video_portrait', 'poster_portrait'),
                ('landscape', 'video_landscape', 'poster_landscape')):
            assert case.get(video_key) and case.get(poster_key), f'Missing {orientation} media: {case["id"]}'
            local_file(case[video_key])
            local_file(case[poster_key])
            info = json.loads(subprocess.check_output([
                'ffprobe', '-v', 'error', '-select_streams', 'v:0',
                '-show_entries', 'stream=width,height:format=duration', '-of', 'json',
                str(DIST / case[video_key])], encoding='utf-8'))
            stream = info['streams'][0]
            assert ((stream['height'] > stream['width']) == (orientation == 'portrait')), f'Wrong {orientation} video: {case["id"]}'
            assert min(stream['width'], stream['height']) >= 540, f'Low-resolution variant: {case["id"]}'
            variants[orientation] = float(info['format']['duration'])
        assert abs(variants['portrait'] - variants['landscape']) <= 0.1, f'Variant timelines differ: {case["id"]}'
        result = subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration:stream=codec_type,width,height', '-of', 'json', str(DIST / case['video'])], encoding='utf-8')
        video = json.loads(result)
        assert float(video['format']['duration']) >= 20, 'Explainer is too short'
        assert any(max(s.get('width', 0), s.get('height', 0)) >= 960 and min(s.get('width', 0), s.get('height', 0)) >= 540 for s in video['streams']), 'Video resolution is too low (long edge 960, short edge 540 required)'
        sample_data = json.loads((DIST / case['samples']).read_text('utf-8'))
        samples = sample_data['samples']
        assert samples, f'No samples for {case["id"]}'
        sample_ids = [sample['id'] for sample in samples]
        assert len(sample_ids) == len(set(sample_ids)), f'Duplicate sample ids: {case["id"]}'
        sample_format = case.get('sample_format', 'brief')
        assert sample_format in ('brief', 'input-output'), f'Unknown sample format: {sample_format}'
        for sample in samples:
            if sample_format == 'input-output':
                assert sample_data.get('format') == sample_format
                for key in ('label', 'input', 'output'):
                    assert sample.get(key), f'Missing sample field {key}'
            else:
                brief = sample['brief']
                for key in ('request', 'category', 'goal', 'inputs', 'skill_refs', 'deliverables', 'acceptance'):
                    assert brief.get(key), f'Missing brief field {key}'
    forbidden = [p for p in DIST.rglob('*') if {'.local', '.git', 'workspace'} & set(p.relative_to(DIST).parts)]
    assert not forbidden, 'Private workspace leaked into publication'
    models_result = check_open_models(DIST)
    social_result = check_social_pages(DIST, cases)
    navigation_result = check_navigation(DIST)
    print(json.dumps({'status': 'passed', 'catalog_entries': len(ids), 'categories': len(category_ids), 'curated_resources': sum(e.get('verification_stage') in ('source-reviewed', 'runtime-reviewed') for e in catalog['entries']), 'new_resources_with_examples': sum(e.get('verification_stage') == 'runtime-reviewed' for e in catalog['entries']), 'cases': len(cases), 'html_pages': len(list(DIST.rglob('*.html'))), **models_result, **social_result, **navigation_result}, ensure_ascii=False))


if __name__ == '__main__':
    main()
