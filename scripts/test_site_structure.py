"""Regression checks for content preservation and the public URL contract."""
import unittest
from html.parser import HTMLParser
from site_structure import apply_chrome, canonical_metadata, site_map, unified_url


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


if __name__ == '__main__':
    unittest.main()
