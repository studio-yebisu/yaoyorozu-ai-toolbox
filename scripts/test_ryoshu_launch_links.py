"""Opt-in launch links and current-video sharing; every other case keeps its existing page."""
import copy
import hashlib
import json
from pathlib import Path
import re
import subprocess
import unittest
from urllib.parse import parse_qs, urlsplit

from case_presentation import project_case, validate_launch

ROOT = Path(__file__).resolve().parents[1]
# src/case.js is pinned as a shared artifact (data/production/mechanical-maintenance.json) and src/case.html
# appears in historical production manifests. The launch controls therefore live at the end of the
# unpinned src/share.js; case.js and case.html stay byte-identical and no script is added.
PINNED_CASE_JS = '18e6ee3b14be1c1295686e6c2b8a76999bd589c117dfcc7801a7b98d1451040e'
EXE = 'https://github.com/studio-yebisu/ryoshu/releases/download/v1.4.0/Ryoshu-1.4.0-windows-x64-setup.exe'
GITHUB = 'https://github.com/studio-yebisu/ryoshu'
EVIDENCE = 'https://studio-yebisu.github.io/ryoshu/docs/testing/v1.4/'
GUIDE = 'https://github.com/studio-yebisu/ryoshu/blob/main/docs/INSTALL.md'
FILM = 'media/ryoshu-copy-renewal-20261026/ryoshu-promo-v1.4.0.mp4'
SITE = 'https://studio-yebisu.github.io/yaoyorozu-ai-toolbox/'
ARTICLE = SITE + 'case.html?id=ryoshu-local'

# Executes the real combined src/share.js once, then the pinned src/case.js, in page order;
# only window.SY helpers and the DOM are minimal stubs (safeHref mirrors src/ui.js).
HARNESS = r'''
const fs = require('fs'), vm = require('vm');
const run = JSON.parse(fs.readFileSync(0, 'utf8'));
class Text { constructor(v) { this.textContent = String(v); } }
class El {
  constructor(tag) { this.tag = tag; this.attrs = {}; this.nodes = []; this.className = ''; this.dataset = {};
    this.hidden = false; this.disabled = false; this.parentElement = null; this.classList = {toggle() {}, add() {}}; }
  get tagName() { return this.tag.toUpperCase(); }
  get children() { return this.nodes.filter(n => n instanceof El); }
  get id() { return this.attrs.id || ''; }
  setAttribute(k, v) { this.attrs[k] = String(v); }
  getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; }
  removeAttribute(k) { delete this.attrs[k]; }
  addEventListener() {}
  adopt(n) { const x = typeof n === 'string' ? new Text(n) : n;
    if (x.parentElement) x.parentElement.nodes = x.parentElement.nodes.filter(c => c !== x);
    x.parentElement = this; return x; }
  append(...ns) { for (const n of ns) this.nodes.push(this.adopt(n)); }
  prepend(...ns) { this.nodes.unshift(...ns.map(n => this.adopt(n))); }
  insertBefore(n, ref) { const x = this.adopt(n); this.nodes.splice(this.nodes.indexOf(ref), 0, x); }
  replaceWith(n) { const p = this.parentElement; const x = p.adopt(n);
    p.nodes.splice(p.nodes.indexOf(this), 1, x); this.parentElement = null; }
  after(n) { const p = this.parentElement; const x = p.adopt(n); p.nodes.splice(p.nodes.indexOf(this) + 1, 0, x); }
  replaceChildren(...ns) { this.nodes = []; this.append(...ns); }
  contains() { return false; } focus() {} select() {} remove() {} scrollIntoView() {}
  set textContent(v) { this.nodes = [new Text(v)]; }
  get textContent() { return this.nodes.map(c => c.textContent).join(''); }
  set href(v) { this.attrs.href = String(v); }
  get href() { return this.attrs.href; }
}
function h(tag, attrs, ...children) {
  const el = new El(tag);
  for (const [key, value] of Object.entries(attrs || {})) {
    if (value === null || value === undefined || value === false) continue;
    if (key === 'class') el.className = value;
    else if (key.startsWith('on')) continue;
    else el.setAttribute(key, value === true ? '' : value);
  }
  for (const child of children.flat(Infinity)) {
    if (child === null || child === undefined || child === false) continue;
    el.append(child instanceof El ? child : String(child));
  }
  return el;
}
function safeHref(value) {
  if (typeof value !== 'string') return null;
  const url = value.trim();
  if (!url || /[\u0000-\u001F\u007F\\]/.test(url)) return null;
  if (/^https?:\/\/[^/]/i.test(url)) return url;
  if (/^[a-z][a-z0-9+.-]*:/i.test(url) || url.startsWith('//')) return null;
  return url;
}
const root = new El('main');
const data = {'data/catalog.json': {entries: [], categories: []}, 'data/cases.json': {cases: [run.item]},
  'data/projects.json': {site_url: run.site}};
const SY = {h, safeHref, isExternal: u => /^https?:/i.test(u), displayUrl: u => u.replace(/^https?:\/\//i, ''),
  $: s => s === '[data-root]' ? root : null, announce() {}, setTabbar() {},
  loadJSON: async url => { if (url in data) return JSON.parse(JSON.stringify(data[url])); throw new Error('missing ' + url); },
  media: {create: () => new El('video')}, itemActions: {create: () => h('div', {class: 'item-actions'})}, likes: {caseID: i => i.id}};
const context = {window: {SY, getSelection: () => null, isSecureContext: false},
  document: {title: '', getElementById: () => null, execCommand: () => false},
  location: {search: '?id=' + encodeURIComponent(run.item.id), hash: ''},
  navigator: {}, URL, URLSearchParams, setTimeout, clearTimeout, queueMicrotask, console,
  matchMedia: q => ({matches: q.includes('699px') && run.narrow, addEventListener() {}})};
for (const file of ['src/share.js', 'src/case.js'])
  vm.runInNewContext(fs.readFileSync(file, 'utf8'), context, {filename: file});
const all = el => [el, ...el.children.flatMap(all)];
const find = (el, test) => all(el).filter(test);
setTimeout(() => {
  const head = root.children.find(c => c.tag === 'header');
  const bars = head.children.filter(e => e.className === 'actions');
  const share = find(root, e => e.className === 'video-share')[0];
  const downloads = find(root, e => e.className === 'downloads')[0];
  const anchors = el => el ? find(el, e => e.tag === 'a').map(a => ({href: a.attrs.href || null, cls: a.className,
    text: a.textContent, download: 'download' in a.attrs})) : [];
  const save = share ? find(share, e => e.tag === 'a' && e.className === 'btn btn-ink')[0] : null;
  const intro = share ? find(share, e => e.tag === 'pre' && e.attrs['aria-label'] === 'X用の紹介文')[0] : null;
  const xLink = share ? find(share, e => e.tag === 'a' && e.textContent === 'Xで紹介')[0] : null;
  process.stdout.write(JSON.stringify({
    headTags: head.children.map(e => e.tag + '.' + e.className), bars: bars.length,
    actions: anchors(bars[0]), headNotes: head.children.filter(e => e.className === 'd-note').map(e => e.textContent),
    downloads: anchors(downloads),
    share: share ? {save: save ? {href: save.attrs.href, text: save.textContent, download: 'download' in save.attrs} : null,
      hrefs: anchors(share).map(a => a.href), text: share.textContent,
      intro: intro ? intro.textContent : null, x: xLink ? xLink.attrs.href : null} : null}));
}, 50);
'''


def render(item, narrow=False):
    result = subprocess.run(['node', '-e', HARNESS], input=json.dumps({'item': item, 'narrow': narrow, 'site': SITE}),
                            capture_output=True, text=True, cwd=ROOT, check=True, timeout=30)
    return json.loads(result.stdout)


def base_case():
    return {
        'id': 'ryoshu-local', 'title': 'Ryoshu', 'category': 'documents',
        'demo': 'examples/ryoshu-local/index.html', 'request': 'request text',
        'video': FILM, 'video_primary': True,
        'poster': 'media/ryoshu-copy-renewal-20261026/ryoshu-promo-v1.4.0.poster.png',
        'video_width': 1920, 'video_height': 1080,
        'video_landscape': 'media/ryoshu-copy-renewal-20261026/ryoshu-32s-wide.mp4',
        'video_portrait': 'media/ryoshu-copy-renewal-20261026/ryoshu-32s-portrait.mp4',
        'poster_landscape': 'media/ryoshu-copy-renewal-20261026/ryoshu-32s-wide.webp',
        'poster_portrait': 'media/ryoshu-copy-renewal-20261026/ryoshu-32s-portrait.webp',
        'video_download_landscape': 'media/ryoshu-copy-renewal-20261026/ryoshu-32s-wide-credited-ja.mp4',
        'video_download_portrait': 'media/ryoshu-copy-renewal-20261026/ryoshu-32s-portrait-credited-ja.mp4',
        'video_license': {'id': 'LicenseRef-Yaoyorozu-Video-Credit', 'x_mention': '@studio_yebisu'},
    }


def launch_case():
    # Placeholder ASCII labels; the published strings come from site-copy.json.
    return dict(base_case(),
                primary_actions=[{'kind': 'primary', 'label': 'L-installer', 'href': EXE},
                                 {'kind': 'secondary', 'label': 'L-github', 'href': GITHUB},
                                 {'kind': 'secondary', 'label': 'L-evidence', 'href': EVIDENCE}],
                primary_actions_note='L-note',
                app_downloads=[{'label': 'D-installer', 'note': 'N-installer', 'href': EXE},
                               {'label': 'D-guide', 'note': 'N-guide', 'href': GUIDE}],
                video_share_mode='primary-current',
                video_share_copy={'save_label': 'S-save', 'intro_copy_label': 'S-intro',
                                  'intro_summary_label': 'S-summary', 'share_note': 'S-note'})


class PinnedRendererTests(unittest.TestCase):
    def test_case_js_is_the_pinned_shared_artifact(self):
        self.assertEqual(hashlib.sha256((ROOT / 'src/case.js').read_bytes()).hexdigest(), PINNED_CASE_JS)

    def test_no_separate_launch_script_and_case_html_script_order(self):
        self.assertFalse((ROOT / 'src/case-launch.js').exists(), 'launch code must stay inside src/share.js')
        html = (ROOT / 'src/case.html').read_text('utf-8')
        scripts = [Path(urlsplit(src).path).name for src in re.findall(r'<script[^>]*\bsrc="([^"]+)"', html)]
        self.assertNotIn('case-launch.js', scripts)
        self.assertIn('share.js', scripts)
        self.assertIn('case.js', scripts)
        # The extension wraps SY.videoShare.create, so share.js must load before case.js renders.
        self.assertLess(scripts.index('share.js'), scripts.index('case.js'))


class ValidationTests(unittest.TestCase):
    def test_absent_fields_project_exactly_as_before(self):
        for case in (base_case(), dict(base_case(), video_primary=False), dict(base_case(), id='other')):
            with self.subTest(case=case['id'], primary=case['video_primary']):
                expected = copy.deepcopy(case)
                if case.get('video_primary'):
                    for field in ('video_landscape', 'video_portrait', 'poster_landscape', 'poster_portrait'):
                        expected.pop(field)
                self.assertEqual(project_case(case), expected)

    def test_launch_fields_pass_through_and_keep_download_evidence(self):
        case = launch_case()
        projected = project_case(case)
        for key in ('primary_actions', 'primary_actions_note', 'app_downloads', 'video_share_mode',
                    'video_share_copy', 'video_download_landscape', 'video_download_portrait'):
            self.assertEqual(projected[key], case[key])

    def test_invalid_launch_fields_fail_closed(self):
        bad_hrefs = ('javascript:alert(1)', 'http://github.com/studio-yebisu/ryoshu', 'https://example.test/x.exe',
                     'https://github.com/other/ryoshu', 'https://github.com:444/studio-yebisu/ryoshu',
                     'https://user@github.com/studio-yebisu/ryoshu', GITHUB + '?x=1', GITHUB + '#x',
                     '//github.com/studio-yebisu/ryoshu', '../x.exe', 'media\\x.mp4', ' ' + EXE, '', None)
        mutations = []
        for href in bad_hrefs:
            mutations.append(('primary_actions', 0, 'href', href))
            mutations.append(('app_downloads', 1, 'href', href))
        for label in ('', ' x', 'x\n', 'x' * 41, None, 3):
            mutations.append(('primary_actions', 0, 'label', label))
        for kind in ('secondary', 'other', None):
            mutations.append(('primary_actions', 0, 'kind', kind))
        mutations.append(('primary_actions', 1, 'kind', 'primary'))
        for field, index, key, value in mutations:
            with self.subTest(field=field, key=key, value=value):
                case = launch_case()
                case[field][index][key] = value
                with self.assertRaises(ValueError):
                    validate_launch(case)
        for change in (
                lambda c: c['primary_actions'].append({'kind': 'secondary', 'label': 'x', 'href': GITHUB, 'note': 'x'}),
                lambda c: c.update(primary_actions=[]),
                lambda c: c.update(primary_actions=c['primary_actions'] * 2),
                lambda c: c.pop('primary_actions'),
                lambda c: c['app_downloads'].reverse(),
                lambda c: c['app_downloads'][0].pop('note'),
                lambda c: c.update(primary_actions_note=''),
                lambda c: c.update(video_share_mode='legacy'),
                lambda c: c.update(video_primary=False),
                lambda c: [c.pop(k) for k in ('video_share_mode', 'video_share_copy')] and c.update(video_primary=False),
                lambda c: c.pop('video_share_copy'),
                lambda c: c.pop('video_share_mode'),
                lambda c: c['video_share_copy'].pop('share_note'),
                lambda c: c['video_share_copy'].update(extra='x'),
                lambda c: c['video_share_copy'].update(save_label='x' * 41)):
            with self.subTest(change=change):
                case = launch_case()
                change(case)
                with self.assertRaises(ValueError):
                    project_case(case)


class ConsumerTests(unittest.TestCase):
    def test_default_page_is_unchanged(self):
        case = project_case(base_case())
        for narrow in (False, True):
            with self.subTest(narrow=narrow):
                page = render(case, narrow)
                self.assertEqual(page['bars'], 1)
                self.assertEqual([(a['text'], a['cls'], a['href']) for a in page['actions']],
                                 [('デモを開く', 'btn btn-ink', case['demo']), ('依頼文を見る', 'btn btn-line', '#prompt')])
                self.assertEqual(page['headNotes'], [])
                self.assertEqual(page['downloads'][0]['href'], 'data/cases/ryoshu-local.json')
                share = page['share']
                key = 'video_download_portrait' if narrow else 'video_download_landscape'
                self.assertEqual(share['save'], {'href': case[key], 'text': '動画を保存（引用元入り）', 'download': True})
                self.assertIn('share/ryoshu-local-card.html', share['hrefs'])
                self.assertIn(case['video_download_landscape'], share['hrefs'])
                self.assertTrue(share['intro'].endswith(SITE + 'share/ryoshu-local-card.html'))

    def test_opt_in_installer_first_and_current_video(self):
        case = project_case(launch_case())
        default_tags = render(project_case(base_case()))['headTags']
        for narrow in (False, True):
            with self.subTest(narrow=narrow):
                page = render(case, narrow)
                self.assertEqual(page['bars'], 1)
                # Same header structure, plus only the note directly after the action bar.
                expected_tags = list(default_tags)
                expected_tags.insert(expected_tags.index('div.actions') + 1, 'p.d-note')
                self.assertEqual(page['headTags'], expected_tags)
                self.assertEqual([(a['text'], a['cls'], a['href']) for a in page['actions']], [
                    ('L-installer', 'btn btn-ink', EXE), ('L-github', 'btn btn-line', GITHUB),
                    ('L-evidence', 'btn btn-line', EVIDENCE), ('デモを開く', 'btn btn-line', case['demo']),
                    ('依頼文を見る', 'btn btn-line', '#prompt')])
                self.assertEqual(page['headNotes'], ['L-note'])
                self.assertEqual(page['downloads'][0], {'href': EXE, 'cls': '', 'text': 'D-installerN-installer', 'download': False})
                self.assertEqual(page['downloads'][1], {'href': GUIDE, 'cls': '', 'text': 'D-guideN-guide', 'download': False})
                self.assertEqual(page['downloads'][2]['href'], 'data/cases/ryoshu-local.json')
                share = page['share']
                self.assertEqual(share['save'], {'href': FILM, 'text': 'S-save', 'download': True})
                for href in share['hrefs']:
                    self.assertNotIn('32s', href or '')
                    self.assertNotIn('share/', href or '')
                self.assertIn('https://x.com/studio_yebisu', share['hrefs'])
                self.assertIn('media-rights.html', share['hrefs'])
                self.assertIn('@studio_yebisu', share['text'])
                self.assertIn('動画の利用にはクレジット表記が必須です。', share['text'])
                self.assertNotIn('透かし', share['text'])
                self.assertNotIn('引用元入り', share['text'])
                self.assertIn('S-note', share['text'])
                self.assertTrue(share['intro'].endswith(ARTICLE))
                self.assertEqual(parse_qs(urlsplit(share['x']).query)['url'], [ARTICLE])

    def test_malformed_opt_in_falls_back_in_browser(self):
        # The build rejects these; the browser still never renders an unsafe or partial launch block.
        for name, change in (('script-href', lambda c: c['primary_actions'][0].update(href='javascript:alert(1)')),
                             ('no-primary', lambda c: c['primary_actions'][0].update(kind='secondary')),
                             ('share-label', lambda c: c['video_share_copy'].pop('save_label'))):
            with self.subTest(name=name):
                case = project_case(base_case())
                case.update(copy.deepcopy({k: v for k, v in launch_case().items() if k not in case}))
                change(case)
                page = render(case)
                if name == 'share-label':
                    self.assertEqual(page['share']['save']['href'], case['video_download_landscape'])
                    self.assertEqual(page['actions'][0]['href'], EXE)
                else:
                    self.assertEqual([a['text'] for a in page['actions']], ['デモを開く', '依頼文を見る'])
                    self.assertEqual(page['headNotes'], [])
                    self.assertEqual(page['downloads'][0]['href'], 'data/cases/ryoshu-local.json')
                    self.assertTrue(all('javascript' not in (a['href'] or '') for a in page['actions']))


if __name__ == '__main__':
    unittest.main()
