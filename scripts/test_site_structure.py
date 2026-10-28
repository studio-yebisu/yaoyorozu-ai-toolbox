"""Regression checks for content preservation and the public URL contract."""
import re
import unittest
from html.parser import HTMLParser
from site_structure import apply_chrome, canonical_metadata, footer, header, site_map, unified_url

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


class ApprovedNavigationTests(unittest.TestCase):
    """The approved contract: exact brand, three specialist guide tabs, no how-to."""

    def test_site_map_matches_approved_navigation(self):
        mapping = site_map()
        self.assertEqual(
            [(n['id'], n['label'], n['path']) for n in mapping['navigation']],
            [('cases', 'ツール', '#cases'), ('fields', '分野', '#fields'), ('catalog', 'カタログ', '#catalog')])
        self.assertEqual([g['id'] for g in mapping['guides']], ['ui-ux', 'slides', 'motion'])
        self.assertEqual([g['label'] for g in mapping['guides']], ['UI・UX', 'AIスライド', 'モーション'])
        for entry in mapping['information']:
            self.assertNotEqual(entry['label'], 'AIへの頼み方')
            self.assertFalse(entry['path'].startswith('#howto'), entry)

    def test_brand_restored_in_accessible_name_and_visible_chrome(self):
        result = apply_chrome(HOME_SOURCE, 'index.html', site_map())
        self.assertEqual(result.count(f'aria-label="{BRAND} トップ"'), 1)
        self.assertIn(f'<p class="sy-footer-brand">{BRAND}</p>', result)
        self.assertIn(f'>{BRAND}</a>', result)

    def test_generator_cannot_reintroduce_rejected_brand_or_howto(self):
        pages = {
            'index.html': HOME_SOURCE,
            'case.html': HOME_SOURCE,
            'sitemap.html': HOME_SOURCE,
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


if __name__ == '__main__':
    unittest.main()
