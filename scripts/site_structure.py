"""One navigation and URL hierarchy for the hub and its specialist guides."""
from html import escape, unescape
from html.parser import HTMLParser
import json
import posixpath
from pathlib import Path
import re
from urllib.parse import quote, urlencode, urljoin, urlsplit
from xml.etree import ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
MARKER = '<!-- Unified site navigation -->'
BRAND = 'Yaoyorozu AI ToolBox'


def site_map():
    return json.loads((ROOT / 'data/site-map.json').read_text('utf-8'))


def relative_url(page, destination):
    path, sep, fragment = destination.partition('#')
    directory = posixpath.dirname(page) or '.'
    target = posixpath.relpath(path or '.', directory)
    if (not path or path.endswith('/')) and target != '.':
        target += '/'
    if target == '.':
        target = './'
    return target + (sep + fragment if sep else '')


def link(page, destination, label, extra=''):
    return f'<a href="{escape(relative_url(page, destination), quote=True)}"{extra}>{escape(label)}</a>'


def unified_url(value, page='index.html'):
    """Move navigation only; standalone examples and binary assets keep their host."""
    for guide in site_map()['guides']:
        ident = guide['id']
        prefix = f'https://studio-yebisu.github.io/yaoyorozu-ai-toolbox-{ident}/'
        if not value.startswith(prefix):
            continue
        suffix = value[len(prefix):]
        parsed = urlsplit(suffix)
        if not parsed.path or parsed.path in guide['pages']:
            return relative_url(page, f'guides/{ident}/' + suffix)
    return value


def remap_navigation(text, page):
    return re.sub(r'https://studio-yebisu\.github\.io/yaoyorozu-ai-toolbox-(?:slides|motion|ui-ux)/[^\s\"\'<>`]*',
                  lambda m: unified_url(m[0], page), text)


class TagAttributes(HTMLParser):
    def handle_starttag(self, tag, attrs):
        self.attrs = dict(attrs)


def tag_attributes(text):
    parser = TagAttributes()
    parser.attrs = {}
    parser.feed(text)
    return parser.attrs


def canonical_metadata(text, canonical):
    # Attribute order and quote style vary between the original guide generators.
    text = re.sub(r'<link\b[^>]*>', lambda m: '' if 'canonical' in tag_attributes(m[0]).get('rel', '').split() else m[0], text, flags=re.I)
    def meta(match):
        attrs = tag_attributes(match[0])
        if attrs.get('property', attrs.get('name')) != 'og:url':
            return match[0]
        return f'<meta property="og:url" content="{escape(canonical, quote=True)}">' if canonical else ''
    text = re.sub(r'<meta\b[^>]*>', meta, text, flags=re.I)
    if canonical:
        text = text.replace('</head>', f'<link rel="canonical" href="{escape(canonical, quote=True)}"></head>')
    return text


def header(page, mapping, page_title=''):
    guide = next((g for g in mapping['guides'] if page.startswith(g['path'])), None)
    tabs = ''.join(link(page, n['path'], n['label'], f' data-site-nav="{n["id"]}"') for n in mapping['navigation'])
    sites = ''.join(
        link(page, g['path'], g['label'],
             f' data-site-nav="{g["id"]}"'
             + (' aria-current="' + ('page' if page == g['path'] + 'index.html' else 'location') + '"'
                if guide and g['id'] == guide['id'] else ''))
        for g in mapping['guides'])
    brand = link(page, '', BRAND, f' class="sy-brand" aria-label="{BRAND} トップ"')
    crumb = ''
    if page != 'index.html':
        parts = [link(page, '', 'ホーム')]
        if guide:
            parts += [link(page, 'guides/', '制作ガイド')]
            parts += [f'<span aria-current="page">{escape(guide["label"])}</span>'] if page == guide['path'] + 'index.html' else [link(page, guide['path'], guide['label']), f'<span aria-current="page">{escape(page_title or "ガイドの詳細")}</span>']
        else:
            label = {'guides/index.html': '制作ガイド', 'case.html': '道具の紹介', 'open-models.html': 'OpenWeight', 'media-rights.html': '動画の利用条件', 'sitemap.html': 'サイトマップ'}.get(page, 'ページ')
            parts += [f'<span aria-current="page">{escape(label)}</span>']
        crumb = '<nav class="sy-breadcrumb" aria-label="現在地">' + '<span aria-hidden="true">/</span>'.join(parts) + '</nav>'
    return (MARKER + '<header class="sy-header"><div class="sy-header-inner">' + brand
            + '<nav class="sy-nav" aria-label="サイト全体">' + tabs + '</nav>'
            + '<nav class="sy-sites" aria-label="専門の案内サイト">' + sites + '</nav></div></header>' + crumb,
            '<nav class="sy-dock" aria-label="主な移動先">' + tabs + sites + '</nav>')


def footer(page, mapping):
    guides = ''.join(link(page, g['path'], g['label']) for g in mapping['guides'])
    information = ''.join(link(page, g['path'], g['label']) for g in mapping['information'])
    extra = ''
    guide = next((g for g in mapping['guides'] if page.startswith(g['path'])), None)
    if guide:
        specific = [('index.html', 'このガイドのトップ')]
        if guide['id'] == 'slides':
            specific += [('guide.html', 'スライドの使い方'), ('licenses.html', '原典・利用条件'), ('status.html', '制作の状況')]
        elif guide['id'] == 'motion':
            specific += [('projects.html', '作例とツール'), ('guide.html', '制作の始め方'), ('ATTRIBUTION.md', '出典・利用条件')]
        else:
            specific += [('ATTRIBUTION.md', '出典・利用条件')]
        extra = '<nav aria-label="このガイドの案内">' + ''.join(link(page, guide['path'] + p, label) for p, label in specific)
        extra += f'<a href="https://github.com/studio-yebisu/yaoyorozu-ai-toolbox-{guide["id"]}">GitHubでソースを見る ↗</a></nav>'
    updated = '<p class="sy-footer-note">カタログ更新日　<span data-updated>—</span></p>' if page == 'index.html' else ''
    return ('<footer class="sy-footer"><div><p class="sy-footer-brand">' + escape(BRAND) + '</p>'
            '<p>掲載しているスキル・ツール・モデルの説明は、それぞれの原典をもとに日本語でまとめたものです。使うときは原典のライセンスと最新の説明を確かめてください。</p>'
            '<p>独自制作の動画はクレジット表記必須。Xでは @studio_yebisu を記載してください。' + link(page, 'media-rights.html', '動画の利用条件') + '</p>'
            + updated + '</div>'
            '<nav aria-label="専門の案内サイト">' + guides + '<a href="https://github.com/studio-yebisu/yaoyorozu-ai-toolbox">Yaoyorozu AI ToolBox</a></nav>'
            '<nav aria-label="サイトの案内">' + information + '</nav>' + extra
            + '</footer>')


class Regions(HTMLParser):
    """Locate whole elements without relying on their internal indentation."""
    def __init__(self, text):
        super().__init__(convert_charrefs=False)
        self.text = text
        self.lines = [0] + [m.end() for m in re.finditer('\n', text)]
        self.stack = []
        self.ranges = []

    def source_offset(self):
        row, col = self.getpos()
        return self.lines[row - 1] + col

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        classes = set(a.get('class', '').split())
        role = ('header' if tag == 'header' and classes.intersection({'masthead', 'site-header', 'header'}) else
                'dock' if tag == 'nav' and 'tabbar' in classes else
                'old-hub' if tag == 'nav' and a.get('aria-label') == '総合サイト' else
                'footer' if tag == 'footer' else None)
        if tag not in {'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'}:
            self.stack.append((tag, self.source_offset(), role))

    def handle_endtag(self, tag):
        for i in range(len(self.stack) - 1, -1, -1):
            if self.stack[i][0] == tag:
                _, start, role = self.stack[i]
                if role:
                    end = self.text.find('>', self.source_offset()) + 1
                    self.ranges.append((start, end, role))
                del self.stack[i:]
                break


def apply_chrome(text, page, mapping):
    if MARKER in text:
        raise ValueError(f'Navigation already applied: {page}')
    heading = re.search(r'<h1\b[^>]*>(.*?)</h1>', text, re.I | re.S)
    page_title = unescape(re.sub(r'<[^>]*>', '', heading[1])).strip() if heading else ''
    top, dock = header(page, mapping, page_title)
    bottom = footer(page, mapping)
    regions = Regions(text)
    regions.feed(text)
    found_header = found_footer = False
    local_nav = ''
    ranges = [item for item in regions.ranges if not any(other[0] <= item[0] and other[1] >= item[1] and other != item for other in regions.ranges)]
    for start, end, role in sorted(ranges, reverse=True):
        replacement = ''
        if role == 'header':
            old = text[start:end]
            if page.startswith('guides/'):
                navs = re.findall(r'<nav\b[^>]*>(.*?)</nav>', old, re.S | re.I)
                local_nav = '<nav class="sy-guide-local" aria-label="このガイドのメニュー">' + ''.join(navs) + '</nav>' if navs else ''
            replacement = top + local_nav
            found_header = True
        elif role == 'footer':
            replacement = bottom
            found_footer = True
        text = text[:start] + replacement + text[end:]
    if '<!-- SITE_HEADER -->' in text:
        text = text.replace('<!-- SITE_HEADER -->', top)
        found_header = True
    if not found_header:
        text = re.sub(r'(<body\b[^>]*>)', lambda m: m[1] + top, text, count=1, flags=re.I)
    if '<!-- SITE_FOOTER -->' in text:
        text = text.replace('<!-- SITE_FOOTER -->', bottom)
        found_footer = True
    if not found_footer:
        text = text.replace('</body>', bottom + '</body>')
    text = text.replace('</body>', dock + '</body>')
    css = escape(relative_url(page, 'portal.css'), quote=True)
    text = text.replace('</head>', f'<link rel="stylesheet" href="{css}"></head>')
    refinements = escape(relative_url(page, 'site-refinements.css'), quote=True)
    text = text.replace('</head>', f'<link rel="stylesheet" href="{refinements}"></head>')
    script = escape(relative_url(page, 'site-shell.js'), quote=True)
    text = text.replace('</head>', f'<script src="{script}" defer></script></head>')
    text = re.sub(r'<body\b([^>]*)>', lambda m: '<body' + m[1] + f' data-site-shell data-site-page="{escape(page, quote=True)}">', text, count=1, flags=re.I)
    return text


def render_map(page, mapping, catalog):
    groups = [('入口', mapping['navigation']), ('制作ガイド', mapping['guides']), ('サイトの案内', mapping['information'])]
    groups.append(('分野から道具を探す', [{'path': '#' + c['id'], 'label': c['label']} for c in catalog['categories']]))
    output = []
    for title, entries in groups:
        items = ''.join('<li>' + link(page, e['path'], e['label']) + '</li>' for e in entries)
        output.append(f'<section class="sy-map-group"><h2>{escape(title)}</h2><ul>{items}</ul></section>')
    return '<div class="sy-map-grid">' + ''.join(output) + '</div>'


def build_structure(target, catalog):
    mapping = site_map()
    base = json.loads((ROOT / 'data/projects.json').read_text('utf-8'))['site_url']
    pages = sorted(set(target.glob('*.html')) | {p for p in (target / 'guides').glob('*/index.html')} | {p for p in (target / 'guides').glob('*/*.html')})
    if (target / 'guides/index.html').is_file():
        pages.append(target / 'guides/index.html')
    paths = []
    for path in pages:
        page = path.relative_to(target).as_posix()
        text = remap_navigation(path.read_text('utf-8'), page)
        if page == 'guides/slides/index.html' and 'id="examples"' not in text:
            # Older slide pages and incoming links used #examples for this list.
            text = re.sub(r'(<section\b[^>]*\bid="skills"[^>]*>)', r'\1<span id="examples" aria-hidden="true"></span>', text, count=1)
        if '<!-- SITE_MAP -->' in text:
            text = text.replace('<!-- SITE_MAP -->', render_map(page, mapping, catalog))
        text = apply_chrome(text, page, mapping)
        text = text.replace('</head>', f'<meta name="sy-public-base" content="{escape(base, quote=True)}"></head>')
        dynamic = page in ('case.html', 'guides/slides/case.html', 'guides/slides/repository.html')
        canonical = None if dynamic else urljoin(base, page[:-10] if page.endswith('index.html') else page)
        text = canonical_metadata(text, canonical)
        path.write_text(text, 'utf-8')
        if page not in ('case.html', 'guides/slides/case.html', 'guides/slides/repository.html'):
            paths.append(page[:-10] if page.endswith('index.html') else page)
    cases = json.loads((target / 'data/cases.json').read_text('utf-8'))['cases']
    case_entries = {case.get('catalog_entry', {}).get('id') for case in cases}
    paths += ['case.html?' + urlencode({'entry': entry['id']}) for entry in catalog['entries'] if entry['id'] not in case_entries and not entry.get('guide_url', '').startswith(('case.html?id=', 'open-models.html'))]
    paths += ['case.html?' + urlencode({'id': case['id']}) for case in cases]
    slides = json.loads((target / 'guides/slides/data/product-collection.json').read_text('utf-8'))
    paths += ['guides/slides/repository.html?repo=' + quote(entry['repository'], safe='') for entry in slides['entries']]
    namespace = 'http://www.sitemaps.org/schemas/sitemap/0.9'
    ET.register_namespace('', namespace)
    root = ET.Element('{' + namespace + '}urlset')
    for path in sorted(set(paths)):
        item = ET.SubElement(root, '{' + namespace + '}url')
        ET.SubElement(item, '{' + namespace + '}loc').text = urljoin(base, path)
    ET.ElementTree(root).write(target / 'sitemap.xml', encoding='utf-8', xml_declaration=True)
    (target / 'robots.txt').write_text('User-agent: *\nAllow: /\nSitemap: ' + urljoin(base, 'sitemap.xml') + '\n', 'utf-8')
    return len(pages)
