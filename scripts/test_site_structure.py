"""Regression checks for content preservation and the public URL contract."""
import json
from pathlib import Path
import re
import sys
import tempfile
import unittest
from xml.etree import ElementTree as ET
from html.parser import HTMLParser

SCRIPTS_DIR = Path(__file__).resolve().parent
if str(SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPTS_DIR))

from build import build_search_index
from site_structure import apply_chrome, build_structure, canonical_metadata, footer, header, remap_navigation, render_map, site_map, unified_url

ROOT = SCRIPTS_DIR.parent
BRAND = 'Yaoyorozu AI ToolBox'
# Copy the generator may never reintroduce (rejected brand, generic how-to section).
REJECTED_COPY = (
    '八百万図',
    '#howto',
    'AIへの頼み方',
    'やりたいことから選ぶ',
    '依頼文と条件を確かめる',
    '完成条件で結果を見る',
    'つくりたいことから、道具と進め方を選ぶ。',
)
HOME_SOURCE = ('<html><head><title>Yaoyorozu AI ToolBox｜用途から選ぶAIの道具箱</title></head>'
               '<body class="home"><header class="masthead">'
               '<a class="wordmark" href="./" aria-label="Yaoyorozu AI ToolBox トップ">Yaoyorozu AI ToolBox</a>'
               '</header><main><h1>本文</h1></main>'
               '<footer class="colophon"><p>Yaoyorozu AI ToolBox</p></footer>'
               '<nav class="tabbar" aria-label="主な移動先"></nav></body></html>')
MARKER_SOURCE = ('<html><head><title>ガイド</title></head><body>'
                 '<!-- SITE_HEADER --><main><h1>ガイド</h1></main><!-- SITE_FOOTER -->'
                 '</body></html>')


class Tags(HTMLParser):
    def __init__(self, text):
        super().__init__()
        self.tags = []
        self.feed(text)

    def handle_starttag(self, tag, attrs):
        self.tags.append((tag, dict(attrs)))


class StructureTests(unittest.TestCase):
    def test_nested_old_navigation_preserves_following_content(self):
        source = '<html><head></head><body><header class="masthead"><nav class="tabbar">old</nav></header><main><h1>本文</h1><p id="preserve">Keep this exact content.</p></main><footer>old footer</footer></body></html>'
        result = apply_chrome(source, 'index.html', site_map())
        self.assertIn('<p id="preserve">Keep this exact content.</p>', result)
        self.assertEqual(result.count('<header class="sy-header">'), 1)
        self.assertEqual(result.count('<main>'), 1)

    def test_nested_footer_inside_main_is_preserved(self):
        source = ('<html><head></head><body>'
                  '<header class="masthead"></header>'
                  '<main><h1>本文</h1><article><p>quote</p><footer>出典メモ</footer></article></main>'
                  '<footer class="colophon">old site footer</footer>'
                  '</body></html>')
        result = apply_chrome(source, 'index.html', site_map())
        self.assertIn('<footer>出典メモ</footer>', result)
        self.assertNotIn('old site footer', result)
        self.assertEqual(result.count('<footer class="sy-footer">'), 1)

    def test_metadata_is_independent_of_attribute_order(self):
        source = '<head><meta content="https://old.example/" property="og:url"><link href="https://old.example/" rel="canonical"></head>'
        expected = 'https://studio-yebisu.github.io/yaoyorozu-ai-toolbox/guides/motion/'
        tags = Tags(canonical_metadata(source, expected)).tags
        self.assertEqual([a['href'] for tag, a in tags if tag == 'link'], [expected])
        self.assertEqual([a['content'] for tag, a in tags if tag == 'meta'], [expected])

    def test_navigation_keeps_query_and_fragment_but_not_standalone_examples(self):
        old = 'https://studio-yebisu.github.io/yaoyorozu-ai-toolbox-motion/'
        self.assertEqual(unified_url(old + 'projects.html?category=three#three', 'guides/slides/guide.html'), '../motion/projects.html?category=three#three')
        self.assertEqual(unified_url(old + 'examples/demo.html'), old + 'examples/demo.html')
        self.assertEqual(unified_url(old + 'demo.html'), old + 'demo.html')

    def test_guide_hub_root_links_are_remapped_and_duplicate_site_navs_stripped(self):
        hub = 'https://studio-yebisu.github.io/yaoyorozu-ai-toolbox/'
        source = (
            '<html><head></head><body>'
            '<header class="site-header">'
            '<nav aria-label="メインメニュー">'
            f'<a href="{hub}">ツールボックスへ</a>'
            '<a href="projects.html">作例とツール</a>'
            '</nav>'
            '<nav class="header-sites" aria-label="専門の案内サイト">'
            f'<a href="{hub}guides/ui-ux/">UI・UX</a>'
            '<a href="../slides/">AIスライド</a>'
            '<a href="./" aria-current="page">モーション</a>'
            '</nav>'
            '<nav aria-label="案内">'
            '<a href="../ui-ux/">UI・UX</a>'
            '<a href="../slides/">AIスライド</a>'
            '<a href="./">モーション</a>'
            '</nav>'
            '</header>'
            '<main><h1>モーション</h1></main>'
            '<footer>old</footer>'
            '</body></html>'
        )
        remapped = remap_navigation(source, 'guides/motion/index.html')
        self.assertNotIn(f'href="{hub}"', remapped)
        self.assertIn('href="../../"', remapped)
        result = apply_chrome(remapped, 'guides/motion/index.html', site_map())
        local = re.search(r'<nav class="sy-guide-local"[^>]*>(.*?)</nav>', result, re.S)
        self.assertIsNotNone(local)
        self.assertIn('href="../../"', local[1])
        self.assertIn('href="projects.html"', local[1])
        self.assertNotIn('header-sites', local[1])
        self.assertNotIn('>UI・UX</a>', local[1])
        self.assertNotIn('>AIスライド</a>', local[1])


class ApprovedNavigationTests(unittest.TestCase):
    """The approved contract: exact brand, three specialist guide tabs, no how-to."""

    def test_site_map_matches_approved_navigation(self):
        mapping = site_map()
        self.assertEqual(
            [(n['id'], n['label'], n['path']) for n in mapping['navigation']],
            [('cases', 'ツール', '#cases'), ('fields', '分野', '#fields'), ('catalog', 'カタログ', '#catalog')])
        self.assertEqual([g['id'] for g in mapping['guides']], ['ui-ux', 'slides', 'motion'])
        self.assertEqual([g['label'] for g in mapping['guides']], ['UI・UX', 'AIスライド', 'モーション'])
        info_paths = [entry['path'] for entry in mapping['information']]
        for expected_path in ('finder.html', 'workbench.html', 'prompt-studio.html', 'guides/', '#fields', 'open-models.html', 'media-rights.html', 'sitemap.html'):
            self.assertIn(expected_path, info_paths)
        for entry in mapping['information']:
            self.assertNotEqual(entry['label'], 'AIへの頼み方')
            self.assertFalse(entry['path'].startswith('#howto'), entry)

    def test_brand_restored_in_accessible_name_and_visible_chrome(self):
        result = apply_chrome(HOME_SOURCE, 'index.html', site_map())
        self.assertEqual(result.count(f'aria-label="{BRAND} トップ"'), 1)
        self.assertIn(f'<p class="sy-footer-brand">{BRAND}</p>', result)
        self.assertIn(f'>{BRAND}</a>', result)

    def test_header_has_command_and_theme_controls_and_dock_has_data_tabbar(self):
        top, dock = header('finder.html', site_map())
        self.assertIn('data-cmd-open', top)
        self.assertIn('data-theme-toggle', top)
        self.assertIn('<nav class="sy-dock" data-tabbar', dock)
        nav_match = re.search(r'<nav class="sy-nav"[^>]*>(.*?)</nav>', top, re.S)
        sites_match = re.search(r'<nav class="sy-sites"[^>]*>(.*?)</nav>', top, re.S)
        self.assertNotIn('data-cmd-open', nav_match[1])
        self.assertNotIn('data-cmd-open', sites_match[1])
        self.assertIn('用途ファインダー・レシピ', top)

    def test_breadcrumb_labels_cover_new_studio_pages_and_404(self):
        for page, label in (
            ('finder.html', '用途ファインダー・レシピ'),
            ('workbench.html', '道具箱ワークベンチ'),
            ('prompt-studio.html', '依頼ブリーフ作成'),
            ('404.html', 'ページが見つかりません'),
        ):
            top, _ = header(page, site_map())
            self.assertIn(f'<span aria-current="page">{label}</span>', top)

    def test_generator_cannot_reintroduce_rejected_brand_or_howto(self):
        src_404 = (ROOT / 'src/404.html').read_text('utf-8')
        pages = {
            'index.html': HOME_SOURCE,
            'case.html': HOME_SOURCE,
            'sitemap.html': HOME_SOURCE,
            '404.html': src_404,
            'guides/index.html': MARKER_SOURCE,
            'guides/slides/index.html': MARKER_SOURCE,
            'guides/slides/guide.html': MARKER_SOURCE,
            'guides/motion/projects.html': MARKER_SOURCE,
        }
        for page, source in pages.items():
            result = apply_chrome(source, page, site_map())
            for rejected in REJECTED_COPY:
                self.assertNotIn(rejected, result, f'{rejected!r} came back on {page}')
            self.assertIn(BRAND, result, f'brand missing on {page}')

    def test_single_coherent_chrome_without_legacy_landmarks(self):
        result = apply_chrome(HOME_SOURCE, 'index.html', site_map())
        self.assertEqual(result.count('<!-- Unified site navigation -->'), 1)
        self.assertEqual(result.count('<header class="sy-header">'), 1)
        self.assertEqual(result.count('<footer class="sy-footer">'), 1)
        self.assertEqual(result.count('class="sy-dock"'), 1)
        self.assertNotIn('class="masthead"', result)
        self.assertNotIn('class="tabbar"', result)
        self.assertNotIn('class="colophon"', result)

    def test_specialist_guide_links_are_relative_on_every_page(self):
        expected = {
            'index.html': ('guides/ui-ux/', 'guides/slides/', 'guides/motion/'),
            'case.html': ('guides/ui-ux/', 'guides/slides/', 'guides/motion/'),
            'sitemap.html': ('guides/ui-ux/', 'guides/slides/', 'guides/motion/'),
            'guides/index.html': ('ui-ux/', 'slides/', 'motion/'),
            'guides/slides/guide.html': ('../ui-ux/', './', '../motion/'),
            'guides/motion/index.html': ('../ui-ux/', '../slides/', './'),
        }
        for page, hrefs in expected.items():
            top, dock = header(page, site_map())
            sites = re.search(r'<nav class="sy-sites"[^>]*>(.*?)</nav>', top, re.S)
            self.assertIsNotNone(sites, page)
            for href in hrefs:
                self.assertIn(f'href="{href}"', sites[1], f'{href} missing on {page}')
                self.assertIn(f'href="{href}"', dock, f'{href} missing from dock on {page}')
            self.assertNotIn('studio-yebisu.github.io', top)
            self.assertNotIn('studio-yebisu.github.io', dock)
            for label in ('UI・UX', 'AIスライド', 'モーション'):
                self.assertIn(f'>{label}</a>', sites[1], f'{label} missing on {page}')

    def test_current_guide_is_marked_on_guide_pages_only(self):
        top, dock = header('guides/slides/index.html', site_map())
        self.assertIn('data-site-nav="slides" aria-current="page"', top)
        self.assertIn('data-site-nav="slides" aria-current="page"', dock)
        top, _ = header('guides/motion/projects.html', site_map())
        self.assertIn('data-site-nav="motion" aria-current="location"', top)
        home_top, home_dock = header('index.html', site_map())
        self.assertNotIn('aria-current', home_top.split('sy-sites')[1].split('</nav>')[0])
        self.assertNotIn('aria-current', home_dock)

    def test_footer_keeps_source_license_and_media_information(self):
        for page, prefix in (('index.html', ''), ('guides/slides/index.html', '../../')):
            bottom = footer(page, site_map())
            self.assertIn('それぞれの原典をもとに日本語でまとめたものです', bottom)
            self.assertIn('独自制作の動画はクレジット表記必須。Xでは @studio_yebisu を記載してください。', bottom)
            self.assertIn(f'href="{prefix}media-rights.html"', bottom)
            self.assertIn('OpenWeight', bottom)
            self.assertIn('サイトマップ', bottom)
            self.assertIn('https://github.com/studio-yebisu/yaoyorozu-ai-toolbox', bottom)
        home_footer = footer('index.html', site_map())
        self.assertIn('カタログ更新日', home_footer)
        self.assertNotIn('sy-footer-note', footer('case.html', site_map()))

    def test_render_map_includes_counts_groups_and_guide_subpages(self):
        categories = json.loads((ROOT / 'data/categories.json').read_text('utf-8'))['categories']
        catalog = {
            'categories': categories,
            'entries': [
                {'id': 'a', 'category': 'slides'},
                {'id': 'b', 'category': 'slides'},
                {'id': 'c', 'category': 'owm-tools'},
            ],
        }
        rendered = render_map('sitemap.html', site_map(), catalog)
        for group in ('つくる', '仕事を進める', '学ぶ', 'モデル'):
            self.assertIn(f'分野：{group}', rendered)
        self.assertIn('2件', rendered)
        self.assertIn('1件', rendered)
        self.assertIn('guides/slides/guide.html', rendered)
        self.assertIn('guides/motion/projects.html', rendered)
        self.assertIn('guides/ui-ux/ATTRIBUTION.md', rendered)

    def test_build_structure_generates_feed_jsonld_and_excludes_404_from_sitemap(self):
        base = json.loads((ROOT / 'data/projects.json').read_text('utf-8'))['site_url']
        categories = json.loads((ROOT / 'data/categories.json').read_text('utf-8'))['categories']
        with tempfile.TemporaryDirectory() as tmp:
            target = Path(tmp)
            (target / 'data').mkdir(parents=True)
            (target / 'guides/slides/data').mkdir(parents=True)
            (target / 'index.html').write_text(HOME_SOURCE, 'utf-8')
            (target / 'finder.html').write_text('<html><head><title>用途ファインダー</title></head><body><!-- SITE_HEADER --><main><h1>用途ファインダー・レシピ</h1></main><!-- SITE_FOOTER --></body></html>', 'utf-8')
            (target / '404.html').write_text((ROOT / 'src/404.html').read_text('utf-8'), 'utf-8')
            (target / 'guides/index.html').write_text(MARKER_SOURCE, 'utf-8')
            (target / 'guides/slides/index.html').write_text(MARKER_SOURCE, 'utf-8')
            (target / 'guides/slides/data/product-collection.json').write_text(json.dumps({'entries': []}), 'utf-8')
            (target / 'data/cases.json').write_text(json.dumps({
                'cases': [{'id': 'c1', 'title': 'Case One', 'category': 'agents', 'summary': 'Summary one', 'updated_on': '2026-10-25'}]
            }), 'utf-8')
            (target / 'data/open-models.json').write_text(json.dumps({
                'updated_on': '2026-10-21',
                'models': [{'id': 'm1', 'name': 'Model One', 'category': 'owm-tools', 'summary': 'Model summary', 'verification': {'checked_on': '2026-10-26'}}]
            }), 'utf-8')
            catalog = {'updated_on': '2026-10-26', 'categories': categories, 'entries': [{'id': 'e1', 'category': 'agents', 'guide_url': 'case.html?entry=e1'}]}

            count = build_structure(target, catalog)
            self.assertEqual(count, 5)

            sitemap_locs = [node.text for node in ET.parse(target / 'sitemap.xml').findall('.//{*}loc')]
            self.assertIn(base, sitemap_locs)
            self.assertIn(base + 'finder.html', sitemap_locs)
            self.assertIn(base + 'guides/', sitemap_locs)
            self.assertNotIn(base + '404.html', sitemap_locs)

            not_found_html = (target / '404.html').read_text('utf-8')
            self.assertEqual(not_found_html.count('name="robots"'), 1)
            self.assertIn('<meta name="robots" content="noindex">', not_found_html)
            self.assertIn(f'<link rel="canonical" href="{base}404.html">', not_found_html)

            home_html = (target / 'index.html').read_text('utf-8')
            self.assertIn('application/atom+xml', home_html)
            self.assertIn('"@type":"WebSite"', home_html)
            finder_html = (target / 'finder.html').read_text('utf-8')
            self.assertIn('"@type":"CollectionPage"', finder_html)

            feed_root = ET.parse(target / 'feed.xml').getroot()
            self.assertEqual(feed_root.tag, '{http://www.w3.org/2005/Atom}feed')
            entries = feed_root.findall('{http://www.w3.org/2005/Atom}entry')
            self.assertEqual(len(entries), 2)
            # Sorted newest first: 2026-10-26 model before 2026-10-25 case
            self.assertIn('Model One', entries[0].find('{http://www.w3.org/2005/Atom}title').text)
            self.assertEqual(entries[1].find('{http://www.w3.org/2005/Atom}id').text, base + 'case.html?id=c1')

    def test_search_index_and_tag_aliases_shape_and_openweight_policy(self):
        alias_data = json.loads((ROOT / 'data/tag-aliases.json').read_text('utf-8'))
        aliases = alias_data['aliases']
        self.assertTrue(aliases)
        serialized_aliases = json.dumps(aliases, ensure_ascii=False).lower()
        for forbidden in ('deepseek', 'chatgpt', 'gpt-4', 'gemini', 'llama', 'qwen', 'openllm'):
            self.assertNotIn(forbidden, serialized_aliases)

        categories = json.loads((ROOT / 'data/categories.json').read_text('utf-8'))['categories']
        catalog = {
            'updated_on': '2026-10-28',
            'categories': categories,
            'entries': [
                {
                    'id': 'slide-helper',
                    'name': 'Slide Helper',
                    'summary': 'PPTXスライドを作成',
                    'category': 'slides',
                    'kind': 'スキル',
                    'guide_url': 'case.html?id=slide-case',
                    'tags': ['pptx'],
                    'verification_stage': 'runtime-reviewed',
                },
                {
                    'id': 'owm-model-1',
                    'name': 'Audio Model',
                    'summary': '音声合成モデル',
                    'category': 'owm-tools',
                    'kind': 'モデル',
                    'resource_type': 'open-weight-model',
                    'guide_url': 'open-models.html#model-1',
                    'tags': ['OpenWeight', '音声合成'],
                    'verification_stage': 'model-source-reviewed',
                },
                {
                    'id': 'cat-entry-1',
                    'name': 'Diagram Maker',
                    'summary': '図解を描く',
                    'category': 'graphics',
                    'kind': 'ツール',
                    'guide_url': 'case.html?entry=cat-entry-1',
                    'tags': ['diagram'],
                },
            ],
        }
        cases = [{'id': 'slide-case', 'catalog_entry': {'id': 'slide-helper'}}]
        index = build_search_index(catalog, cases, ROOT)
        self.assertEqual(index['updated_on'], '2026-10-28')
        items = {item['id']: item for item in index['items']}
        expected_keys = {'id', 'type', 'title', 'subtitle', 'category', 'category_label', 'kind', 'stage', 'href', 'search'}
        for item in index['items']:
            self.assertEqual(set(item.keys()), expected_keys)
        self.assertEqual(items['slide-helper']['type'], 'case')
        self.assertIn('powerpoint', items['slide-helper']['search'])
        self.assertIn('パワーポイント', items['slide-helper']['search'])
        self.assertEqual(items['owm-model-1']['type'], 'model')
        self.assertIn('重み公開', items['owm-model-1']['search'])
        self.assertEqual(items['cat-entry-1']['type'], 'catalog')
        self.assertIn('mermaid', items['cat-entry-1']['search'])
        self.assertEqual(items['guide-slides']['type'], 'guide')
        self.assertEqual(items['tool-finder']['type'], 'tool')


if __name__ == '__main__':
    unittest.main()
