"""One navigation and URL hierarchy for the hub and its specialist guides."""
from collections import Counter
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
HUB_ORIGIN = 'https://studio-yebisu.github.io/yaoyorozu-ai-toolbox/'
ATOM_NS = 'http://www.w3.org/2005/Atom'

PAGE_LABELS = {
    'guides/index.html': '制作ガイド',
    'case.html': '道具の紹介',
    'finder.html': '用途ファインダー・レシピ',
    'workbench.html': '道具箱ワークベンチ',
    'prompt-studio.html': '依頼ブリーフ作成',
    'open-models.html': 'OpenWeight',
    'media-rights.html': '動画の利用条件',
    'sitemap.html': 'サイトマップ',
    '404.html': 'ページが見つかりません',
}

GUIDE_SUBPAGES = {
    'ui-ux': [
        ('ATTRIBUTION.md', '出典・利用条件'),
    ],
    'slides': [
        ('guide.html', 'スライドの使い方'),
        ('projects.html', 'プロジェクト一覧'),
        ('licenses.html', '原典・利用条件'),
        ('status.html', '制作の状況'),
        ('archive.html', '出発点のカタログ'),
    ],
    'motion': [
        ('projects.html', '作例とツール'),
        ('guide.html', '制作の始め方'),
        ('ATTRIBUTION.md', '出典・利用条件'),
    ],
}

COLLECTION_PAGES = {'finder.html', 'workbench.html', 'prompt-studio.html', 'open-models.html', 'guides/index.html'}
CATEGORY_GROUP_ORDER = ('つくる', '仕事を進める', '学ぶ', 'モデル')


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
    text = re.sub(
        r'https://studio-yebisu\.github\.io/yaoyorozu-ai-toolbox-(?:slides|motion|ui-ux)/[^\s\"\'<>`]*',
        lambda m: unified_url(m[0], page),
        text,
    )
    if page.startswith('guides/'):
        text = re.sub(
            re.escape(HUB_ORIGIN) + r'((?:#|guides/)[^\s\"\'<>`]*)?(?=["\'\s<>`]|$)',
            lambda m: relative_url(page, m[1] or ''),
            text,
        )
    return text


class TagAttributes(HTMLParser):
    def handle_starttag(self, tag, attrs):
        self.attrs = dict(attrs)


def tag_attributes(text):
    parser = TagAttributes()
    parser.attrs = {}
    parser.feed(text)
    return parser.attrs


class NavLinks(HTMLParser):
    def __init__(self, text):
        super().__init__()
        self.nav_attrs = {}
        self.links = []
        self._in_a = False
        self._href = ''
        self._label = []
        self.feed(text)

    def handle_starttag(self, tag, attrs):
        d = dict(attrs)
        if tag == 'nav' and not self.nav_attrs:
            self.nav_attrs = d
        elif tag == 'a':
            self._in_a = True
            self._href = d.get('href', '')
            self._label = []

    def handle_data(self, data):
        if self._in_a:
            self._label.append(data)

    def handle_endtag(self, tag):
        if tag == 'a' and self._in_a:
            self.links.append((self._href, ''.join(self._label).strip()))
            self._in_a = False


def _normalize_nav_href(href):
    path = urlsplit(href).path
    if path.endswith('index.html'):
        path = path[:-10] or './'
    return path


def _is_specialist_switcher_nav(nav_html, page, mapping):
    parsed = NavLinks(nav_html)
    attrs = parsed.nav_attrs
    classes = set(attrs.get('class', '').split())
    if classes.intersection({'masthead-sites', 'header-sites', 'footer-sites'}) or attrs.get('aria-label') == '専門の案内サイト':
        return True
    if not parsed.links:
        return False
    guide_labels = {g['label'] for g in mapping['guides']}
    hub_labels = {BRAND, 'ツールボックスへ', '総合カタログ', 'ホーム'}
    allowed_labels = guide_labels | hub_labels
    allowed_hrefs = {_normalize_nav_href(relative_url(page, g['path'])) for g in mapping['guides']} | {
        _normalize_nav_href(relative_url(page, '')),
        HUB_ORIGIN,
    }
    return all(
        label in allowed_labels or _normalize_nav_href(href) in allowed_hrefs or href == HUB_ORIGIN
        for href, label in parsed.links
    )


def _extract_guide_local_nav(old_header, page, mapping):
    kept = []
    for match in re.finditer(r'<nav\b[^>]*>(.*?)</nav>', old_header, re.S | re.I):
        if not _is_specialist_switcher_nav(match[0], page, mapping):
            kept.append(match[1])
    if not kept:
        return ''
    return '<nav class="sy-guide-local" aria-label="このガイドのメニュー">' + ''.join(kept) + '</nav>'


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
    actions = (
        '<div class="sy-header-actions">'
        '<button type="button" class="sy-cmd-trigger" data-cmd-open aria-label="サイト全体を検索 (Ctrl+K)">検索 <kbd>Ctrl+K</kbd></button>'
        '<button type="button" class="sy-theme-toggle" data-theme-toggle aria-label="配色を切り替え">テーマ</button>'
        '</div>'
    )
    crumb = ''
    if page != 'index.html':
        parts = [link(page, '', 'ホーム')]
        if guide:
            parts += [link(page, 'guides/', '制作ガイド')]
            parts += [f'<span aria-current="page">{escape(guide["label"])}</span>'] if page == guide['path'] + 'index.html' else [link(page, guide['path'], guide['label']), f'<span aria-current="page">{escape(page_title or "ガイドの詳細")}</span>']
        else:
            label = PAGE_LABELS.get(page, 'ページ')
            parts += [f'<span aria-current="page">{escape(label)}</span>']
        crumb = '<nav class="sy-breadcrumb" aria-label="現在地">' + '<span aria-hidden="true">/</span>'.join(parts) + '</nav>'
    return (MARKER + '<header class="sy-header"><div class="sy-header-inner">' + brand
            + '<nav class="sy-nav" aria-label="サイト全体">' + tabs + '</nav>'
            + actions
            + '<nav class="sy-sites" aria-label="専門の案内サイト">' + sites + '</nav></div></header>' + crumb,
            '<nav class="sy-dock" data-tabbar aria-label="主な移動先">' + tabs + sites + '</nav>')


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
        in_main = any(item[0] == 'main' for item in self.stack)
        role = ('header' if tag == 'header' and not in_main and classes.intersection({'masthead', 'site-header', 'header'}) else
                'dock' if tag == 'nav' and 'tabbar' in classes else
                'old-hub' if tag == 'nav' and a.get('aria-label') == '総合サイト' else
                'footer' if tag == 'footer' and not in_main else None)
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
                local_nav = _extract_guide_local_nav(old, page, mapping)
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
    if f'href="{css}"' not in text:
        text = text.replace('</head>', f'<link rel="stylesheet" href="{css}"></head>')
    refinements = escape(relative_url(page, 'site-refinements.css'), quote=True)
    if f'href="{refinements}"' not in text:
        text = text.replace('</head>', f'<link rel="stylesheet" href="{refinements}"></head>')
    script = escape(relative_url(page, 'site-shell.js'), quote=True)
    if f'src="{script}"' not in text:
        text = text.replace('</head>', f'<script src="{script}" defer></script></head>')
    if page == '404.html' and not re.search(r'<meta\b[^>]*name=["\']robots["\']', text, re.I):
        text = text.replace('</head>', '<meta name="robots" content="noindex"></head>')
    text = re.sub(r'<body\b([^>]*)>', lambda m: '<body' + m[1] + f' data-site-shell data-site-page="{escape(page, quote=True)}">', text, count=1, flags=re.I)
    return text


def render_map(page, mapping, catalog):
    counts = Counter(entry.get('category') for entry in catalog.get('entries', []))
    nav_items = ''.join('<li>' + link(page, e['path'], e['label']) + '</li>' for e in mapping['navigation'])
    info_items = ''.join('<li>' + link(page, e['path'], e['label']) + '</li>' for e in mapping['information'])
    guide_items = []
    for guide in mapping['guides']:
        sub_links = ''.join(
            '<li>' + link(page, guide['path'] + sub_path, sub_label) + '</li>'
            for sub_path, sub_label in GUIDE_SUBPAGES.get(guide['id'], ())
        )
        sub_html = f'<ul class="sy-map-sub">{sub_links}</ul>' if sub_links else ''
        guide_items.append('<li>' + link(page, guide['path'], guide['title']) + sub_html + '</li>')

    output = [
        f'<section class="sy-map-group"><h2>入口</h2><ul>{nav_items}</ul></section>',
        f'<section class="sy-map-group"><h2>制作ガイド</h2><ul>{"".join(guide_items)}</ul></section>',
        f'<section class="sy-map-group"><h2>サイトの案内</h2><ul>{info_items}</ul></section>',
    ]

    by_group = {}
    for category in catalog.get('categories', []):
        group_name = category.get('group') or '分野'
        by_group.setdefault(group_name, []).append(category)
    ordered_groups = [g for g in CATEGORY_GROUP_ORDER if g in by_group] + [g for g in by_group if g not in CATEGORY_GROUP_ORDER]
    for group_name in ordered_groups:
        items = []
        for category in by_group[group_name]:
            count = counts.get(category['id'], 0)
            href = escape(relative_url(page, '#' + category['id']), quote=True)
            label = escape(category['label'])
            items.append(f'<li><a href="{href}"><span>{label}</span><span class="sy-map-count">{count}件</span></a></li>')
        output.append(f'<section class="sy-map-group"><h2>分野：{escape(group_name)}</h2><ul>{"".join(items)}</ul></section>')
    return '<div class="sy-map-grid">' + ''.join(output) + '</div>'


def _json_ld_payload(page, base, canonical, page_title):
    if page == 'index.html':
        return {
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            'name': BRAND,
            'url': base,
            'inLanguage': 'ja',
            'potentialAction': {
                '@type': 'SearchAction',
                'target': urljoin(base, '?q={search_term_string}#catalog'),
                'query-input': 'required name=search_term_string',
            },
        }
    if page in COLLECTION_PAGES and canonical:
        return {
            '@context': 'https://schema.org',
            '@type': 'CollectionPage',
            'name': page_title or PAGE_LABELS.get(page, BRAND),
            'url': canonical,
            'inLanguage': 'ja',
            'isPartOf': {
                '@type': 'WebSite',
                'name': BRAND,
                'url': base,
            },
        }
    return None


def inject_structured_data(text, page, base, canonical):
    if page == 'index.html' and 'application/atom+xml' not in text:
        feed_href = escape(relative_url(page, 'feed.xml'), quote=True)
        text = text.replace('</head>', f'<link rel="alternate" type="application/atom+xml" title="{escape(BRAND, quote=True)} 更新フィード" href="{feed_href}"></head>')
    if 'application/ld+json' not in text:
        heading = re.search(r'<h1\b[^>]*>(.*?)</h1>', text, re.I | re.S)
        page_title = unescape(re.sub(r'<[^>]*>', '', heading[1])).strip() if heading else ''
        payload = _json_ld_payload(page, base, canonical, page_title)
        if payload is not None:
            encoded = json.dumps(payload, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/')
            text = text.replace('</head>', f'<script type="application/ld+json">{encoded}</script></head>')
    return text


def _iso_timestamp(date_str):
    if date_str and re.fullmatch(r'\d{4}-\d{2}-\d{2}', date_str):
        return f'{date_str}T00:00:00Z'
    if date_str and 'T' in date_str:
        return date_str
    return '2026-10-28T00:00:00Z'


def build_feed(target, base, catalog, cases):
    items = []
    fallback_date = catalog.get('updated_on', '')
    for case in cases:
        date_str = case.get('updated_on') or fallback_date
        href = urljoin(base, 'case.html?' + urlencode({'id': case['id']}))
        title = case.get('catalog_entry', {}).get('name') or case.get('title') or case['id']
        summary = ' '.join(str(case.get('summary') or case.get('catalog_entry', {}).get('summary') or '').split())
        items.append({
            'date': date_str,
            'id': href,
            'title': title,
            'summary': summary,
            'category': case.get('category', ''),
        })
    models_path = target / 'data/open-models.json'
    if models_path.is_file():
        models_data = json.loads(models_path.read_text('utf-8'))
        model_fallback = models_data.get('updated_on') or fallback_date
        for model in models_data.get('models', []):
            date_str = model.get('verification', {}).get('checked_on') or model_fallback
            href = urljoin(base, 'open-models.html#' + model['id'])
            summary = ' '.join(str(model.get('summary') or model.get('headline') or '').split())
            items.append({
                'date': date_str,
                'id': href,
                'title': f'{model["name"]}（OpenWeight）',
                'summary': summary,
                'category': model.get('category', 'owm-tools'),
            })
    items.sort(key=lambda item: (item['date'], item['id']), reverse=True)
    latest_date = max([item['date'] for item in items if item['date']] + ([fallback_date] if fallback_date else []), default='2026-10-28')

    ET.register_namespace('', ATOM_NS)
    feed = ET.Element('{' + ATOM_NS + '}feed')
    ET.SubElement(feed, '{' + ATOM_NS + '}title').text = BRAND
    ET.SubElement(feed, '{' + ATOM_NS + '}subtitle').text = 'AIスキル・ツール・OpenWeightの使いどころとAIへの依頼文を、原典をもとに日本語でまとめた統合カタログ。'
    ET.SubElement(feed, '{' + ATOM_NS + '}id').text = base
    ET.SubElement(feed, '{' + ATOM_NS + '}link', {'rel': 'alternate', 'type': 'text/html', 'href': base})
    ET.SubElement(feed, '{' + ATOM_NS + '}link', {'rel': 'self', 'type': 'application/atom+xml', 'href': urljoin(base, 'feed.xml')})
    ET.SubElement(feed, '{' + ATOM_NS + '}updated').text = _iso_timestamp(latest_date)
    author = ET.SubElement(feed, '{' + ATOM_NS + '}author')
    ET.SubElement(author, '{' + ATOM_NS + '}name').text = 'Yaoyorozu AI ToolBox / studio_yebisu'
    for item in items:
        entry = ET.SubElement(feed, '{' + ATOM_NS + '}entry')
        ET.SubElement(entry, '{' + ATOM_NS + '}title').text = item['title']
        ET.SubElement(entry, '{' + ATOM_NS + '}id').text = item['id']
        ET.SubElement(entry, '{' + ATOM_NS + '}link', {'rel': 'alternate', 'type': 'text/html', 'href': item['id']})
        ET.SubElement(entry, '{' + ATOM_NS + '}updated').text = _iso_timestamp(item['date'])
        if item['category']:
            ET.SubElement(entry, '{' + ATOM_NS + '}category', {'term': item['category']})
        if item['summary']:
            ET.SubElement(entry, '{' + ATOM_NS + '}summary').text = item['summary']
    ET.ElementTree(feed).write(target / 'feed.xml', encoding='utf-8', xml_declaration=True)


def build_structure(target, catalog):
    mapping = site_map()
    base = json.loads((ROOT / 'data/projects.json').read_text('utf-8'))['site_url']
    pages = sorted(set(target.glob('*.html')) | set((target / 'guides').glob('*.html')) | set((target / 'guides').glob('*/*.html')))
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
        text = inject_structured_data(text, page, base, canonical)
        path.write_text(text, 'utf-8')
        if page not in ('case.html', 'guides/slides/case.html', 'guides/slides/repository.html', '404.html'):
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
    build_feed(target, base, catalog, cases)
    return len(pages)
