"""Verify the public hub hierarchy, guide imports and navigable deep links."""
import hashlib
from html.parser import HTMLParser
import json
from pathlib import Path
from urllib.parse import parse_qs, unquote, urljoin, urlsplit
from xml.etree import ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
BASE = 'https://navigation-check.example/'


class Page(HTMLParser):
    def __init__(self, text):
        super().__init__()
        self.ids = set()
        self.links = []
        self.brand = []
        self.navs = []
        self.in_nav = False
        self.headers = 0
        self.canonicals = []
        self.og_urls = []
        self.mains = self.footers = self.old_headers = 0
        self.feed(text)

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        classes = set(attrs.get('class', '').split())
        if attrs.get('id'):
            self.ids.add(attrs['id'])
        if tag == 'header' and 'sy-header' in classes:
            self.headers += 1
        if tag == 'header' and classes.intersection({'header', 'masthead', 'site-header'}):
            self.old_headers += 1
        if tag == 'main':
            self.mains += 1
        if tag == 'footer':
            self.footers += 1
        if tag == 'nav' and attrs.get('aria-label') == 'サイト全体':
            self.in_nav = True
        if tag == 'a':
            if attrs.get('href'):
                self.links.append(attrs['href'])
            if 'sy-brand' in classes:
                self.brand.append(attrs.get('href'))
            if self.in_nav:
                self.navs.append(attrs.get('href'))
        if tag == 'link' and attrs.get('rel') == 'canonical':
            self.canonicals.append(attrs.get('href'))
        if tag == 'meta' and attrs.get('property', attrs.get('name')) == 'og:url':
            self.og_urls.append(attrs.get('content'))

    def handle_endtag(self, tag):
        if tag == 'nav':
            self.in_nav = False


def check_navigation(dist):
    mapping = json.loads((ROOT / 'data/site-map.json').read_text('utf-8'))
    config = json.loads((ROOT / 'data/projects.json').read_text('utf-8'))
    catalog = json.loads((dist / 'data/catalog.json').read_text('utf-8'))
    dynamic_anchors = {category['id'] for category in catalog['categories']}
    pages = sorted(dist.glob('*.html')) + sorted((dist / 'guides').glob('*.html')) + sorted((dist / 'guides').glob('*/*.html'))
    parsed = {p.relative_to(dist).as_posix(): Page(p.read_text('utf-8')) for p in pages}
    expected = [urljoin(BASE, n['path']) for n in mapping['navigation']]
    deep_links = 0
    for path, page in parsed.items():
        assert page.headers == 1, f'Expected one common header: {path}'
        assert page.old_headers == 0 and page.mains == 1 and page.footers == 1, f'Page landmarks are inconsistent: {path}'
        assert len(page.brand) == 1 and urljoin(BASE + path, page.brand[0]) == BASE, f'Brand does not return home: {path}'
        actual = [urljoin(BASE + path, href) for href in page.navs]
        assert actual == expected, f'Global navigation differs: {path}: {actual}'
        if path not in ('case.html', 'guides/slides/case.html', 'guides/slides/repository.html'):
            canonical = urljoin(config['site_url'], path[:-10] if path.endswith('index.html') else path)
            assert page.canonicals == [canonical], f'Canonical URL differs: {path}: {page.canonicals}'
            assert all(url == canonical for url in page.og_urls), f'Open Graph URL differs: {path}'
        else:
            assert not page.canonicals, f'Query-driven page has a generic canonical: {path}'
        for href in page.links:
            resolved = urlsplit(urljoin(BASE + path, href))
            if resolved.netloc != 'navigation-check.example':
                for guide in mapping['guides']:
                    prefix = f'https://studio-yebisu.github.io/yaoyorozu-ai-toolbox-{guide["id"]}/'
                    if href.startswith(prefix):
                        suffix = urlsplit(href[len(prefix):]).path
                        assert suffix and suffix not in guide['pages'], f'Legacy navigation escaped the hub: {path}: {href}'
                continue
            target = unquote(resolved.path.lstrip('/'))
            if not target or target.endswith('/'):
                target += 'index.html'
            assert (dist / target).is_file(), f'Broken navigation: {path}: {href}'
            if resolved.fragment and target in parsed:
                anchor = unquote(resolved.fragment)
                if target == 'index.html' and anchor in dynamic_anchors:
                    continue
                # Slide filters and example previews are driven by their recorded query state.
                assert anchor in parsed[target].ids, f'Broken anchor: {path}: {href}'
                deep_links += 1
    for guide in mapping['guides']:
        assert guide['path'] + 'index.html' in parsed, f'Guide is missing: {guide["id"]}'
        project = next(p for p in config['projects'] if p['id'] == guide['id'])
        assert project['url'] == guide['path'], 'Project navigation left the hub'
        for page in guide['pages']:
            assert guide['path'] + page in parsed, f'Guide reading page missing: {guide["id"]}/{page}'
    for ident, source in json.loads((ROOT / 'data/guide-sources.json').read_text('utf-8')).items():
        assert len(source['revision']) == 40
        for item in source['files']:
            payload = (ROOT / 'integrations' / ident / item['path']).read_bytes()
            assert hashlib.sha256(payload).hexdigest() == item['integrated_sha256'], f'Guide import changed without a new record: {ident}/{item["path"]}'
    urls = [node.text for node in ET.parse(dist / 'sitemap.xml').findall('.//{*}loc')]
    assert len(urls) == len(set(urls)), 'Sitemap contains duplicate URLs'
    assert config['site_url'] in urls
    for guide in mapping['guides']:
        assert urljoin(config['site_url'], guide['path']) in urls
    cases = {case['id'] for case in json.loads((dist / 'data/cases.json').read_text('utf-8'))['cases']}
    entries = {entry['id'] for entry in catalog['entries']}
    repositories = {entry['repository'] for entry in json.loads((dist / 'guides/slides/data/product-collection.json').read_text('utf-8'))['entries']}
    for url in urls:
        assert url.startswith(config['site_url']), f'Foreign sitemap URL: {url}'
        relative = urlsplit(url[len(config['site_url']):]).path or 'index.html'
        if relative.endswith('/'):
            relative += 'index.html'
        assert (dist / unquote(relative)).is_file(), f'Sitemap target missing: {url}'
        query = parse_qs(urlsplit(url).query)
        if query:
            if relative == 'case.html' and set(query) == {'id'}:
                assert len(query['id']) == 1 and query['id'][0] in cases, f'Unknown sitemap case: {url}'
            elif relative == 'case.html' and set(query) == {'entry'}:
                assert len(query['entry']) == 1 and query['entry'][0] in entries, f'Unknown sitemap entry: {url}'
            elif relative == 'guides/slides/repository.html' and set(query) == {'repo'}:
                assert len(query['repo']) == 1 and query['repo'][0] in repositories, f'Unknown sitemap repository: {url}'
            else:
                raise AssertionError(f'Unexpected sitemap query: {url}')
    return {'unified_navigation_pages': len(pages), 'navigation_deep_links_checked': deep_links, 'sitemap_urls': len(urls)}


if __name__ == '__main__':
    print(json.dumps(check_navigation(ROOT / 'dist'), ensure_ascii=False))
