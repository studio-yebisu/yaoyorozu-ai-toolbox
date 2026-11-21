"""Build the static public allowlist, with no local state or linked workspaces.

The allowlist is rendered into a fresh staging directory under the private
.local/ workspace and moved into dist/ only after the whole render succeeds.
The previous dist/ is archived under .local/build-history/ (never deleted
outright); files that the fresh publication reproduces byte-for-byte are
removed from that archive only after equality verification.
"""
import filecmp
import json
import os
from pathlib import Path
import re
import shutil
import sys
from datetime import datetime, timezone
import unicodedata
import uuid
from catalog import build_catalog
from social_cards import build_social_pages
from site_structure import build_structure
from case_presentation import project_cases

ROOT = Path(__file__).resolve().parents[1]
INTERNAL_SKILLS = {'studio-yebisu'}
PUBLIC_GUIDES = {'ui-ux', 'slides', 'motion'}
HISTORICAL_BRANDING_RECEIPTS = {'site-rebrand-20261022.json'}
STAGING_ROOT = Path('.local') / 'build-staging'
HISTORY_ROOT = Path('.local') / 'build-history'
HISTORY_MANIFEST = 'build-history.json'


def publication_ignore(source, names):
    ignored = set(shutil.ignore_patterns('node_modules', '__pycache__', '.local', 'reviews', 'out')(source, names))
    if Path(source).resolve() == (ROOT / 'skills').resolve():
        ignored.update(INTERNAL_SKILLS.intersection(names))
    if Path(source).resolve() == (ROOT / 'data/production').resolve():
        ignored.update(HISTORICAL_BRANDING_RECEIPTS.intersection(names))
    return ignored


STUDIO_TOOL_PAGES = (
    {
        'id': 'tool-finder',
        'title': '用途ファインダー・レシピ',
        'subtitle': 'やりたいことや条件から、組み合わせるスキル・ツール・レシピを絞り込む。',
        'category': 'studio',
        'category_label': 'スタジオ機能',
        'kind': '道具選び',
        'href': 'finder.html',
        'tags': ['用途ファインダー', 'レシピ', '絞り込み', '検索'],
    },
    {
        'id': 'tool-workbench',
        'title': '道具箱ワークベンチ',
        'subtitle': '保存したスキル・ツールを並べて比較し、作業メモや組み合わせを整理する。',
        'category': 'studio',
        'category_label': 'スタジオ機能',
        'kind': 'ワークベンチ',
        'href': 'workbench.html',
        'tags': ['ワークベンチ', '比較', '保存', '組み合わせ'],
    },
    {
        'id': 'tool-prompt-studio',
        'title': '依頼ブリーフ作成',
        'subtitle': '目的・入力・制約・完了条件を組み立てて、AIに渡す依頼ブリーフを整える。',
        'category': 'studio',
        'category_label': 'スタジオ機能',
        'kind': 'ブリーフ作成',
        'href': 'prompt-studio.html',
        'tags': ['依頼文', 'ブリーフ', 'プロンプト', '完成条件'],
    },
    {
        'id': 'tool-open-models',
        'title': 'OpenWeight',
        'subtitle': '画像・音声・文字起こし・予測など、用途に特化した重み公開モデルの一覧。',
        'category': 'owm-tools',
        'category_label': 'OpenWeight',
        'kind': 'モデル一覧',
        'href': 'open-models.html',
        'tags': ['OpenWeight', '重み公開', '特化モデル'],
    },
    {
        'id': 'tool-media-rights',
        'title': '動画の利用条件',
        'subtitle': '独自制作のデモ・説明動画の利用条件、必須クレジット、@studio_yebisu表記の案内。',
        'category': 'studio',
        'category_label': 'スタジオ案内',
        'kind': '利用条件',
        'href': 'media-rights.html',
        'tags': ['動画', 'クレジット', 'ライセンス', '利用条件'],
    },
    {
        'id': 'tool-sitemap',
        'title': 'サイトマップ',
        'subtitle': 'Yaoyorozu AI ToolBox全体の入口、制作ガイド、分野別カタログの一覧。',
        'category': 'studio',
        'category_label': 'スタジオ案内',
        'kind': 'サイト案内',
        'href': 'sitemap.html',
        'tags': ['サイトマップ', '案内', '一覧'],
    },
)


def _norm_text(value):
    return ' '.join(unicodedata.normalize('NFKC', str(value or '')).lower().split())


def _load_alias_groups(root):
    alias_path = Path(root) / 'data/tag-aliases.json'
    if not alias_path.is_file():
        return []
    raw = json.loads(alias_path.read_text('utf-8')).get('aliases', {})
    groups = []
    for key, synonyms in raw.items():
        terms = []
        seen = set()
        for term in [key, *synonyms]:
            normalized = _norm_text(term)
            if normalized and normalized not in seen:
                seen.add(normalized)
                terms.append(normalized)
        if terms:
            groups.append(terms)
    return groups


def _term_matches(term, base_text, tag_set):
    if term in tag_set:
        return True
    if re.fullmatch(r'[a-z0-9 _.-]+', term):
        return bool(re.search(r'(?<![a-z0-9])' + re.escape(term) + r'(?![a-z0-9])', base_text))
    return term in base_text


def _build_search_text(fields, tags, alias_groups):
    base_parts = [_norm_text(field) for field in fields if field]
    base_text = ' '.join(part for part in base_parts if part)
    tag_set = {_norm_text(tag) for tag in tags if tag}
    extras = []
    seen = set(base_text.split())
    for group in alias_groups:
        if any(_term_matches(term, base_text, tag_set) for term in group):
            for term in group:
                if term not in seen:
                    seen.add(term)
                    extras.append(term)
    return base_text if not extras else f'{base_text} {" ".join(extras)}'


def build_search_index(catalog, cases, root=ROOT):
    """Build a unified normalized search index across catalog, cases, models, guides, and studio pages."""
    root = Path(root)
    alias_groups = _load_alias_groups(root)
    category_labels = {cat['id']: cat['label'] for cat in catalog.get('categories', [])}
    case_by_entry = {case.get('catalog_entry', {}).get('id'): case for case in cases if case.get('catalog_entry')}
    items = []

    for entry in catalog.get('entries', []):
        if entry.get('resource_type') == 'open-weight-model':
            item_type = 'model'
        elif entry['id'] in case_by_entry or str(entry.get('guide_url', '')).startswith('case.html?id='):
            item_type = 'case'
        else:
            item_type = 'catalog'
        category_id = entry['category']
        category_label = category_labels.get(category_id, '')
        tags = entry.get('tags') or []
        href = entry.get('guide_url') or (
            f'case.html?id={case_by_entry[entry["id"]]["id"]}' if entry['id'] in case_by_entry else f'case.html?entry={entry["id"]}'
        )
        stage = entry.get('verification_stage') or ('case-published' if item_type == 'case' else 'catalog-listed')
        items.append({
            'id': entry['id'],
            'type': item_type,
            'title': entry['name'],
            'subtitle': entry['summary'],
            'category': category_id,
            'category_label': category_label,
            'kind': entry['kind'],
            'stage': stage,
            'href': href,
            'search': _build_search_text(
                [entry['id'], entry['name'], entry['summary'], category_id, category_label, entry['kind'],
                 entry.get('use_case', ''), entry.get('license', ''), *tags],
                tags,
                alias_groups,
            ),
        })

    site_map_path = root / 'data/site-map.json'
    if site_map_path.is_file():
        guides = json.loads(site_map_path.read_text('utf-8')).get('guides', [])
        for guide in guides:
            tags = ['制作ガイド', guide['id'], guide['label']]
            items.append({
                'id': 'guide-' + guide['id'],
                'type': 'guide',
                'title': guide['title'],
                'subtitle': guide.get('description', ''),
                'category': guide['id'],
                'category_label': guide['label'],
                'kind': '制作ガイド',
                'stage': 'guide',
                'href': guide['path'],
                'search': _build_search_text(
                    ['guide-' + guide['id'], guide['title'], guide.get('description', ''), guide['id'], guide['label'], '制作ガイド'],
                    tags,
                    alias_groups,
                ),
            })

    for page in STUDIO_TOOL_PAGES:
        items.append({
            'id': page['id'],
            'type': 'tool',
            'title': page['title'],
            'subtitle': page['subtitle'],
            'category': page['category'],
            'category_label': page['category_label'],
            'kind': page['kind'],
            'stage': 'studio-page',
            'href': page['href'],
            'search': _build_search_text(
                [page['id'], page['title'], page['subtitle'], page['category'], page['category_label'], page['kind'], *page['tags']],
                page['tags'],
                alias_groups,
            ),
        })

    return {
        'updated_on': catalog.get('updated_on', ''),
        'items': items,
    }


def render_publication(target, root=ROOT):
    """Generate the complete public allowlist into a fresh, empty target directory."""
    target = Path(target)
    root = Path(root)
    if target.is_dir():
        if any(target.iterdir()):
            raise ValueError(f'Refusing to render into a non-empty directory: {target}')
    else:
        target.mkdir(parents=True)
    # Remove earlier generated copies as well, while keeping the local source.
    for name in INTERNAL_SKILLS:
        private_copy = target / 'skills' / name
        if private_copy.exists():
            if not private_copy.resolve().is_relative_to(target.resolve()):
                raise ValueError(f'Unexpected publication path: {private_copy}')
            shutil.rmtree(private_copy)
    cases = [json.loads(p.read_text('utf-8')) for p in sorted((root / 'data/cases').glob('*.json'))]
    (root / 'data/cases.json').write_text(json.dumps({'cases': project_cases(cases)}, ensure_ascii=False, indent=2) + '\n', 'utf-8')
    for p in (root / 'src').rglob('*'):
        if p.is_file():
            dest = target / p.relative_to(root / 'src')
            dest.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(p, dest)
    for folder in ('data', 'examples', 'media', 'skills'):
        shutil.copytree(root / folder, target / folder, dirs_exist_ok=True, ignore=publication_ignore)
    for name in HISTORICAL_BRANDING_RECEIPTS:
        stale = target / 'data/production' / name
        if stale.is_file():
            stale.unlink()
    # Ship only the public API address, never database credentials.
    likes = json.loads((root / 'data/likes.json').read_text('utf-8'))
    if 'YAOYOROZU_LIKES_API_URL' in os.environ:
        likes['api_url'] = os.environ['YAOYOROZU_LIKES_API_URL']
    (target / 'data/likes.json').write_text(json.dumps(likes, indent=2) + '\n', 'utf-8')
    catalog = build_catalog(cases)
    if any(entry['id'] == 'agents-' + name for entry in catalog['entries'] for name in INTERNAL_SKILLS):
        raise ValueError('An internal skill was added to the public catalog')
    (target / 'data/catalog.json').write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + '\n', 'utf-8')
    search_index = build_search_index(catalog, cases, root)
    (target / 'data/search-index.json').write_text(json.dumps(search_index, ensure_ascii=False, indent=2) + '\n', 'utf-8')
    social_count = build_social_pages(target, cases)
    guides = target / 'guides'
    if guides.is_dir():
        for old_guide in guides.iterdir():
            if old_guide.name not in PUBLIC_GUIDES | {'index.html'}:
                if not old_guide.resolve().is_relative_to(target.resolve()):
                    raise ValueError(f'Unexpected generated guide path: {old_guide}')
                if old_guide.is_dir():
                    shutil.rmtree(old_guide)
                else:
                    old_guide.unlink()
    for name in PUBLIC_GUIDES:
        shutil.copytree(root / 'integrations' / name, guides / name,
                        dirs_exist_ok=True, ignore=publication_ignore)
    for name in ('LICENSE', 'MEDIA-LICENSE.md', 'README.md'):
        if (root / name).is_file():
            shutil.copy2(root / name, target / name)
    navigation_pages = build_structure(target, catalog)
    (target / '.nojekyll').touch()
    return {'cases': len(cases), 'social_pages': social_count, 'unified_pages': navigation_pages}


def _require_within(path, root, label):
    resolved = Path(path).resolve()
    if not resolved.is_relative_to(Path(root).resolve()):
        raise ValueError(f'{label} escapes the repository: {path}')
    return resolved


def _unique_dir(parent, prefix, create=True):
    parent.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')
    for _ in range(1000):
        candidate = parent / f'{prefix}-{stamp}-{uuid.uuid4().hex[:8]}'
        try:
            candidate.mkdir()
            if not create:
                # Windows rename requires an absent destination. Reserve a
                # unique name, then release only our own empty directory.
                candidate.rmdir()
            return candidate
        except FileExistsError:
            continue
    raise RuntimeError(f'Could not allocate a unique build directory under {parent}')


def _rename(source, destination):
    os.rename(source, destination)


def _reject_symlinks(directory):
    for dirpath, dirnames, filenames in os.walk(directory, followlinks=False):
        for name in dirnames + filenames:
            path = Path(dirpath) / name
            if path.is_symlink() or getattr(path, 'is_junction', lambda: False)():
                raise ValueError(f'Unexpected symlink in the existing publication: {Path(dirpath) / name}')


def _swap_into_place(staging, dist, archive):
    """Move staging to dist, restoring the archived previous dist if the move fails."""
    try:
        _rename(staging, dist)
        return
    except OSError as error:
        restored = False
        if archive is not None and not dist.exists():
            try:
                _rename(archive, dist)
                restored = True
            except OSError as rollback_error:
                raise RuntimeError(
                    f'Publication swap failed and could not roll back; the previous output is preserved at {archive}'
                ) from rollback_error
        if restored:
            raise RuntimeError(
                f'Publication swap failed; the previous dist/ was restored. Staging output remains at {staging}'
            ) from error
        location = f' The previous output is preserved at {archive}.' if archive is not None else ''
        raise RuntimeError(f'Publication swap failed; staging output remains at {staging}.{location}') from error


def _prune_identical(archive, dist):
    """Drop archived files reproduced byte-for-byte in dist; keep everything missing or changed."""
    retained = []
    deduplicated = 0
    for dirpath, _dirnames, filenames in os.walk(archive):
        for name in filenames:
            old = Path(dirpath) / name
            relative = old.relative_to(archive)
            new = dist / relative
            _require_within(old, archive, 'Archived file')
            _require_within(new, dist, 'Published file')
            if (old.is_file() and not old.is_symlink() and new.is_file() and not new.is_symlink()
                    and old.stat().st_size == new.stat().st_size
                    and filecmp.cmp(old, new, shallow=False)):
                old.unlink()
                deduplicated += 1
            else:
                retained.append(relative.as_posix())
    for dirpath, dirnames, _filenames in os.walk(archive, topdown=False):
        for name in dirnames:
            try:
                (Path(dirpath) / name).rmdir()
            except OSError:
                pass
    return sorted(retained), deduplicated


def _publish_staging(root, staging, dist):
    _require_within(staging, root, 'Staging directory')
    if staging.is_symlink() or getattr(staging, 'is_junction', lambda: False)() or not staging.is_dir():
        raise ValueError(f'Unexpected staging path: {staging}')
    if dist.is_symlink() or getattr(dist, 'is_junction', lambda: False)():
        raise ValueError(f'Refusing to replace a symlinked publication path: {dist}')
    archive = None
    if dist.exists():
        if not dist.is_dir():
            raise ValueError(f'Refusing to replace a non-directory publication path: {dist}')
        _reject_symlinks(dist)
        _require_within(root / HISTORY_ROOT, root, 'History directory')
        archive = _unique_dir(root / HISTORY_ROOT, 'dist', create=False)
        _require_within(archive, root, 'History archive')
        _rename(dist, archive)
    _swap_into_place(staging, dist, archive)
    if archive is None:
        return
    try:
        retained, deduplicated = _prune_identical(archive, dist)
        manifest_path = archive / HISTORY_MANIFEST
        if manifest_path.exists():
            # An unknown old file already occupies the manifest name; keep it and choose another.
            manifest_path = archive / f'{HISTORY_MANIFEST[:-5]}-{uuid.uuid4().hex[:8]}.json'
        manifest = {
            'source': 'dist',
            'owner': 'scripts/build.py',
            'adoption_status': 'private history; not part of the current publication',
            'next_step': 'Retain for manual review; do not copy stale output back into dist.',
            'reason': 'previous publication retained before the staged swap',
            'note': 'Files byte-identical to the fresh dist were removed after verification; '
                    'retained files vanished from or changed in the new publication.',
            'deduplicated_files': deduplicated,
            'retained_files': retained,
        }
        manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', 'utf-8')
    except OSError as error:
        print(f'Could not trim the retained history at {archive}: {error}', file=sys.stderr)
    print(f'Previous publication retained privately at {archive}', file=sys.stderr)


def build(root=ROOT, render=None):
    """Render the publication into private staging, then publish it to <root>/dist.

    The previous dist/ moves into a unique .local/build-history directory before
    the swap, so a failure during rendering or the swap leaves it in place and
    only the current allowlist ever ships. Nothing outside dist/ and the private
    .local/ workspace is ever moved or deleted.
    """
    root = Path(root).resolve()
    if render is None:
        def render(staging):
            return render_publication(staging, root)
    dist = root / 'dist'
    _require_within(dist, root, 'Publication target')
    _require_within(root / STAGING_ROOT, root, 'Staging parent')
    staging = _unique_dir(root / STAGING_ROOT, 'staging')
    try:
        counts = render(staging)
    except BaseException:
        print(f'Build failed before publication; the existing {dist} is untouched. '
              f'Partial staging output remains at {staging}', file=sys.stderr)
        raise
    if not any(staging.iterdir()):
        raise ValueError(f'Render produced no output in {staging}')
    _publish_staging(root, staging, dist)
    return counts


def main(root=ROOT):
    counts = build(root)
    print(f'Built {counts["cases"]} case(s), {counts["social_pages"]} sharing pages and {counts["unified_pages"]} unified pages -> {Path(root) / "dist"}')


if __name__ == '__main__':
    main()
