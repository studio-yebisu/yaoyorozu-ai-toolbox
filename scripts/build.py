"""Build the static public allowlist, with no local state or linked workspaces."""
import json
from pathlib import Path
import shutil
from catalog import build_catalog
from social_cards import build_social_pages
from site_structure import build_structure

ROOT = Path(__file__).resolve().parents[1]
INTERNAL_SKILLS = {'studio-yebisu'}
PUBLIC_GUIDES = {'ui-ux', 'slides', 'motion'}


def publication_ignore(source, names):
    ignored = set(shutil.ignore_patterns('node_modules', '__pycache__', '.local', 'reviews', 'out')(source, names))
    if Path(source).resolve() == (ROOT / 'skills').resolve():
        ignored.update(INTERNAL_SKILLS.intersection(names))
    return ignored


def main():
    target = ROOT / 'dist'
    target.mkdir(exist_ok=True)
    # Remove earlier generated copies as well, while keeping the local source.
    for name in INTERNAL_SKILLS:
        private_copy = target / 'skills' / name
        if private_copy.exists():
            if not private_copy.resolve().is_relative_to(target.resolve()):
                raise ValueError(f'Unexpected publication path: {private_copy}')
            shutil.rmtree(private_copy)
    cases = [json.loads(p.read_text('utf-8')) for p in sorted((ROOT / 'data/cases').glob('*.json'))]
    (ROOT / 'data/cases.json').write_text(json.dumps({'cases': cases}, ensure_ascii=False, indent=2) + '\n', 'utf-8')
    for p in (ROOT / 'src').rglob('*'):
        if p.is_file():
            dest = target / p.relative_to(ROOT / 'src')
            dest.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(p, dest)
    for folder in ('data', 'examples', 'media', 'skills'):
        shutil.copytree(ROOT / folder, target / folder, dirs_exist_ok=True, ignore=publication_ignore)
    catalog = build_catalog(cases)
    if any(entry['id'] == 'agents-' + name for entry in catalog['entries'] for name in INTERNAL_SKILLS):
        raise ValueError('An internal skill was added to the public catalog')
    (target / 'data/catalog.json').write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + '\n', 'utf-8')
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
        shutil.copytree(ROOT / 'integrations' / name, guides / name,
                        dirs_exist_ok=True, ignore=publication_ignore)
    for name in ('LICENSE', 'MEDIA-LICENSE.md', 'README.md'):
        if (ROOT / name).is_file():
            shutil.copy2(ROOT / name, target / name)
    navigation_pages = build_structure(target, catalog)
    (target / '.nojekyll').touch()
    print(f'Built {len(cases)} case(s), {social_count} sharing pages and {navigation_pages} unified pages -> {target}')


if __name__ == '__main__':
    main()
