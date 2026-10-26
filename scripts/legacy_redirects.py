"""Prepare reviewable legacy-guide redirect overlays; never deploy them.

Overlay these HTML files after each specialist site's existing build. Keep its
assets, example documents and downloads at their published URLs.
"""
import argparse
from html import escape
import json
from pathlib import Path
from urllib.parse import urljoin, urlsplit

ROOT = Path(__file__).resolve().parents[1]


def prepare(guide, output, base):
    if not base.endswith('/') or urlsplit(base).scheme not in ('http', 'https'):
        raise ValueError('Expected an HTTP(S) base URL ending with /')
    output.mkdir(parents=True, exist_ok=True)
    routes = []
    config = next(g for g in json.loads((ROOT / 'data/site-map.json').read_text('utf-8'))['guides'] if g['id'] == guide)
    for name in config['pages']:
        original = ROOT / 'integrations' / guide / name
        suffix = '' if original.name == 'index.html' else original.name
        destination = urljoin(base, f'guides/{guide}/' + suffix)
        # A JSON string is a JS literal; escape the HTML script terminator too.
        literal = json.dumps(destination, ensure_ascii=False).replace('<', '\\u003c')
        page = f'''<!doctype html>
<html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>ガイドの移転先｜八百万図AIツールボックス</title>
<link rel="canonical" href="{escape(destination, quote=True)}">
<script>const target=new URL({literal});target.search=location.search;target.hash=location.hash;location.replace(target.href);</script>
</head><body><main><h1>ガイドを総合サイトへまとめました。</h1><p>八百万図AIツールボックスから、作例・制作ガイド・道具を続けて探せます。</p>
<p><a id="destination" href="{escape(destination, quote=True)}">同じガイドを新しい場所で開く →</a></p>
<noscript><p>JavaScriptが無効な場合は、上のリンクから移動してください。検索条件は移動先で選び直せます。</p></noscript>
<script>document.getElementById('destination').href=target.href;</script></main></body></html>'''
        (output / original.name).write_text(page, 'utf-8')
        routes.append({'old_path': original.name, 'new_url': destination, 'preserves': ['query', 'fragment']})
    (output / 'routes.json').write_text(json.dumps(routes, ensure_ascii=False, indent=2) + '\n', 'utf-8')
    return len(routes)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('guide', choices=['slides', 'motion'])
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--base', default='https://studio-yebisu.github.io/yaoyorozu-ai-toolbox/')
    args = parser.parse_args()
    print(json.dumps({'guide': args.guide, 'prepared_pages': prepare(args.guide, args.output, args.base), 'deployed': False}))
