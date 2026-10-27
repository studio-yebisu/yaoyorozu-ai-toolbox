"""Import a small, pinned public guide shell; keep original media/download hosting.

Run explicitly after reviewing a specialist revision. The normal site build never
accesses the network or reads a linked/private specialist workspace.
"""
import argparse
import hashlib
import json
from pathlib import Path
import posixpath
import re
import subprocess
from urllib.parse import urljoin, urlsplit

ROOT = Path(__file__).resolve().parents[1]
CODE = {'.css', '.js', '.mjs', '.svg'}
RESOURCE_DIRS = r'(?:assets|examples|downloads|skills|skill-forks|sources|docs)'
QUOTED_RESOURCE = re.compile(r'([\"\'`])((?:\./|\.\./)?' + RESOURCE_DIRS + r'/[^\"\'`<>\s]*)')
ATTRIBUTE = re.compile(r'((?:href|src|poster|data-src|data-gif|data-open-preview|data-interactive-page)\s*=\s*)([\"\'])(.*?)(\2)', re.I)


def digest(value):
    return hashlib.sha256(value).hexdigest()


def import_guide(ident):
    source = ROOT / 'workspace' / ident
    target = ROOT / 'integrations' / ident
    if target.exists():
        raise ValueError(f'Review existing snapshot before replacing it: {target}')
    revision = subprocess.check_output(['git', '-C', str(source), 'rev-parse', 'HEAD'], text=True).strip()
    if not re.fullmatch('[a-f0-9]{40}', revision):
        raise ValueError('Source revision is not pinned')
    base = f'https://studio-yebisu.github.io/yaoyorozu-ai-toolbox-{ident}/'
    guide = next(g for g in json.loads((ROOT / 'data/site-map.json').read_text('utf-8'))['guides'] if g['id'] == ident)
    files = {source / page for page in guide['pages']} | {source / 'LICENSE'}
    files |= {p for p in (source / 'assets').rglob('*') if p.is_file() and p.suffix in CODE}
    # Only data used by public HTML/JS belongs in the imported shell.
    data_refs = set()
    for p in list(files):
        if p.suffix in {'.html', '.js', '.mjs'}:
            data_refs.update(re.findall(r'data/[A-Za-z0-9_.-]+\.json', p.read_text('utf-8')))
    files |= {source / ref for ref in data_refs}
    for path in files:
        if not path.is_file():
            raise FileNotFoundError(f'Guide runtime input is missing: {path}')
    names = {p.relative_to(source).as_posix() for p in files}
    # Fail an import rather than ship a missing relative JS module dependency.
    for path in files:
        if path.suffix not in {'.js', '.mjs'}:
            continue
        imports = re.findall(r'(?:\bfrom\s*|\bimport\s*\(?\s*)[\"\'](\.[^\"\']+)[\"\']', path.read_text('utf-8'))
        for dependency in imports:
            dependency_path = (path.parent / urlsplit(dependency).path).resolve()
            if dependency_path not in {p.resolve() for p in files}:
                raise ValueError(f'Relative module dependency was not imported: {path}: {dependency}')

    def resolve(value, relative='', document_root=False):
        if not value or value.startswith(('#', 'data:', 'mailto:', 'javascript:')):
            return value
        parsed = urlsplit(value)
        if parsed.scheme or parsed.netloc:
            return value
        context = '' if document_root else posixpath.dirname(relative) + '/'
        path = posixpath.normpath(posixpath.join(context, parsed.path))
        if path in ('.', '') or path in names:
            return value
        return urljoin(base + context, value)

    records = []
    for path in sorted(files):
        relative = path.relative_to(source).as_posix()
        raw = subprocess.check_output(['git', '-C', str(source), 'show', f'{revision}:{relative}'])
        text = raw.decode('utf-8').replace('\r\n', '\n')
        if path.suffix == '.json':
            def rewrite(value):
                if isinstance(value, dict):
                    return {key: rewrite(item) for key, item in value.items()}
                if isinstance(value, list):
                    return [rewrite(item) for item in value]
                if isinstance(value, str) and re.match(r'^(?:\./)?' + RESOURCE_DIRS + '/', value):
                    return resolve(value, document_root=True)
                return value
            text = json.dumps(rewrite(json.loads(text)), ensure_ascii=False, indent=2) + '\n'
        elif path.suffix in {'.html', '.js', '.mjs'}:
            if path.suffix == '.html':
                text = ATTRIBUTE.sub(lambda m: m[1] + m[2] + resolve(m[3], relative) + m[4], text)
            text = QUOTED_RESOURCE.sub(lambda m: m[1] + resolve(m[2], document_root=True), text)
            if path.suffix in {'.js', '.mjs'}:
                text = re.sub(r'(new\s+URL\(\s*)([\"\'])([^\"\']+)\2(\s*,\s*import\.meta\.url)',
                              lambda m: m[1] + m[2] + resolve(m[3], relative) + m[2] + m[4], text)
        elif path.suffix == '.css':
            text = re.sub(r'url\(([\"\']?)([^)\"\']+)\1\)', lambda m: 'url(' + m[1] + resolve(m[2], relative) + m[1] + ')', text)
        dest = target / relative
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_bytes(text.encode('utf-8'))
        records.append({'path': relative, 'source_sha256': digest(raw), 'integrated_sha256': digest(dest.read_bytes())})
    (target / 'ATTRIBUTION.md').write_text(
        f'# {ident} guide source\n\nSource: https://github.com/studio-yebisu/yaoyorozu-ai-toolbox-{ident}/tree/{revision}\n\n'
        'The public navigation, styles, scripts and their data are imported from the revision above. '
        'Original author attributions, LICENSE and per-resource conditions remain applicable. '
        'Media, example documents, source bundles and font files continue to use the original specialist publication. '
        'Only their URL references are rebased; this integration does not regenerate or revalidate those artifacts.\n', 'utf-8', newline='\n')
    record = {'repository': f'studio-yebisu/yaoyorozu-ai-toolbox-{ident}', 'revision': revision,
              'media_base': base, 'scope': 'public HTML, code assets and referenced runtime JSON; original media hosting retained', 'files': records}
    manifest = ROOT / 'data/guide-sources.json'
    data = json.loads(manifest.read_text('utf-8')) if manifest.exists() else {}
    data[ident] = record
    manifest.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', 'utf-8', newline='\n')
    print(json.dumps({'guide': ident, 'revision': revision, 'files': len(records)}, ensure_ascii=False))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('guide', choices=['slides', 'motion'])
    import_guide(parser.parse_args().guide)
