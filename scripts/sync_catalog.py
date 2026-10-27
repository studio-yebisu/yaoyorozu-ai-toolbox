"""Normalize committed specialist catalogs; leave dirty source checkouts untouched."""
from datetime import datetime
import hashlib
import json
from pathlib import Path
import re
import subprocess
from zoneinfo import ZoneInfo
from branding import SITE_NAME, rebrand_site_text
from workspace import repository_path

ROOT = Path(__file__).resolve().parents[1]


def write(path, value):
    target = ROOT / path
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n', 'utf-8')


def git(folder, *args):
    return subprocess.check_output(['git', '-C', str(folder), *args])


def read(folder, ref, path):
    return json.loads(git(folder, 'show', f'{ref}:{path}').decode('utf-8'))


def slug(value):
    return re.sub(r'[^a-z0-9-]+', '-', value.lower()).strip('-')


def main():
    config = json.loads((ROOT / 'data/projects.json').read_text('utf-8'))
    output, snapshots = [], []
    for project in config['projects']:
        category = project['id']
        if category == 'agents':
            continue
        folder = repository_path(project)
        # Import the consolidated main of each independent specialist repository.
        ref = 'main'
        commit = git(folder, 'rev-parse', ref).decode().strip()
        source_file = {'motion': 'data/projects.json', 'ui-ux': 'data/catalog.json', 'slides': 'data/product-collection.json'}[category]
        data = read(folder, ref, source_file)
        records = data['projects'] if category == 'motion' else data['entries']
        if category == 'ui-ux':
            # This specialist guide has no live Pages URL. Ship its small committed
            # static app inside the unified site, including attribution and its demo.
            allowed_root = {'index.html', 'app.js', 'styles.css', 'README.md', 'LICENSE', 'ATTRIBUTION.md', 'RESEARCH.md'}
            files = git(folder, 'ls-tree', '-r', '--name-only', ref).decode('utf-8').splitlines()
            for relative in files:
                if relative not in allowed_root and not relative.startswith(('data/', 'examples/')):
                    continue
                if Path(relative).suffix.lower() not in {'.html', '.js', '.css', '.json', '.md', '.svg', '.png', '.webp'} and Path(relative).name != 'LICENSE':
                    continue
                payload = git(folder, 'show', f'{ref}:{relative}')
                # The specialist snapshot keeps its URLs and copyright notices;
                # the guide published inside this site uses its current display name.
                if Path(relative).suffix.lower() in {'.html', '.js', '.css'} or Path(relative).name == 'README.md':
                    payload = rebrand_site_text(payload.decode('utf-8')).encode('utf-8')
                if relative == 'index.html':
                    text = payload.decode('utf-8')
                    text = text.replace('<body>', f'<body><nav aria-label="総合サイト" style="padding:12px 24px;border-bottom:1px solid currentColor"><a href="../../index.html#ui-ux">{SITE_NAME} 総合カタログへ</a></nav>', 1)
                    payload = text.encode('utf-8')
                destination = ROOT / 'integrations/ui-ux' / relative
                destination.parent.mkdir(parents=True, exist_ok=True)
                destination.write_bytes(payload)
        cases = {c['id']: c for c in read(folder, ref, 'data/case-studies.json')} if category == 'slides' else {}
        for item in records:
            entry = {'category': category, 'source_project': category, 'source_commit': commit}
            if category == 'motion':
                preview = item.get('preview') or {}
                files = preview.get('files', {})
                media_base = project.get('media_url', project['url'])
                entry.update(id='motion-' + item['id'], name=item['name'], kind='スキル' if 'スキル' in item['kind'] else 'ツール', summary=item['summary'], use_case=item['use_case'], tags=item.get('tags', []), license=item['license_label'], license_url=item['license_url'], source_url=item['readme_url'], guide_url=project['url'] + 'projects.html#' + item['id'], verification='既存ガイドの作例あり' if preview else '原典を確認', prompt=item.get('opus_relation', ''))
                if files.get('webp'):
                    entry['image'] = media_base + files['webp']['path']
                if files.get('mp4'):
                    entry['example_url'] = media_base + files['mp4']['path']
            elif category == 'ui-ux':
                entry.update(id='ui-ux-' + item['id'], name=item['name'], kind='ライブラリ' if item['kind'] == 'library' else 'スキル', summary=item['summary'], use_case=item['best_for'], tags=item.get('tags', []), license=item['license'], license_url=item['license_url'], source_url=item['source_url'], guide_url=project['url'] + '#' + item['id'], prompt=item.get('task_brief', ''), verification='制作デスクへ指針を適用' if item.get('application') else '原典を確認')
                if item.get('application'):
                    entry['example_url'] = project['url'] + 'examples/studio-desk/index.html'
            else:
                case = cases.get(item.get('featured_case_id'), {})
                repo = item['repository']
                identifier = 'slides-' + slug(repo)
                upstream = case.get('upstream_commit')
                source = f'https://github.com/{repo}'
                if upstream:
                    source += '/tree/' + upstream
                entry.update(id=identifier, name=item['title_ja'], kind='スキル', summary=item['description_ja'], use_case=case.get('use_case', '日本語のスライド制作'), tags=[item.get('style', ''), case.get('format', '資料')], license=item['license'], license_url=f'https://github.com/{repo}', source_url=source, guide_url=project['url'], prompt=case.get('prompt_text', ''), verification='日本語の作例を制作。統合版は表紙と依頼文を掲載', case_title=case.get('title', ''), case_id=case.get('id', ''), page_count=case.get('page_count'), license_note=item.get('license_notice_ja', ''))
                cover = case.get('cover')
                if cover:
                    suffix = Path(cover).suffix.lower()
                    if suffix not in {'.png', '.webp', '.jpg', '.jpeg', '.svg'}:
                        raise ValueError(f'Unsupported cover: {cover}')
                    payload = git(folder, 'show', f'{ref}:{cover}')
                    image = ROOT / f'media/imported/{identifier}{suffix}'
                    image.parent.mkdir(parents=True, exist_ok=True)
                    image.write_bytes(payload)
                    entry['image'] = image.relative_to(ROOT).as_posix()
                    entry['example_url'] = 'case.html?entry=' + identifier
            output.append(entry)
        snapshots.append({'project': category, 'repository': project['repository'], 'commit': commit, 'source_file': source_file, 'records': len(records), 'data_sha256': hashlib.sha256(git(folder, 'show', f'{ref}:{source_file}')).hexdigest(), 'scope': 'Committed catalog snapshot; upstream licenses and original runtime checks retained as reported. Not a new runtime audit.'})
    for identifier, name, summary, use in [
        ('brief-to-demo', 'ひと言から、作れる依頼へ', '短い依頼を、目的・入力・制作スキル・完成条件が揃うブリーフにする。', '作例づくりの前に、AIへ渡す依頼を具体化する。')]:
        output.append({'id': 'agents-' + identifier, 'name': name, 'category': 'agents', 'kind': 'スキル', 'summary': summary, 'use_case': use, 'tags': [SITE_NAME, '日本語', '作例制作'], 'license': 'MIT', 'license_url': 'LICENSE', 'source_url': f'skills/{identifier}/SKILL.md', 'guide_url': 'case.html?id=brief-to-demo', 'example_url': 'examples/brief-to-demo/index.html', 'skill_download': f'skills/{identifier}/SKILL.md', 'prompt': f'${identifier} を使って、このスキルの使い方が分かる作例を制作してください。', 'verification': '今回の一件に実際に適用', 'source_project': 'agents'})
    today = datetime.now(ZoneInfo('Asia/Tokyo')).date().isoformat()
    # Physical specialist projects and browsing categories are independent. New
    # curated entries remain in their own source file and survive a snapshot sync.
    from catalog import load_categories
    write('data/catalog.json', {'updated_on': today, 'categories': load_categories(), 'entries': output})
    write('data/import-manifest.json', {'updated_on': today, 'sources': snapshots})
    print(json.dumps({'entries': len(output), 'categories': {p['id']: sum(e['category'] == p['id'] for e in output) for p in config['projects']}}, ensure_ascii=False))


if __name__ == '__main__':
    main()
