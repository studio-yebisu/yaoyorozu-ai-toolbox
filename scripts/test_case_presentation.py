"""Presentation opt-in cannot relax canonical media/proof/download contracts."""
import copy
import json
from pathlib import Path
import subprocess
import unittest

from case_presentation import ORIENTATION_FIELDS, project_case, project_cases, validate_presentation_aggregate


class PrimaryPresentationTests(unittest.TestCase):
    def setUp(self):
        self.case = {
            'id': 'sample', 'video': 'media/sample/main102.mp4', 'poster': 'media/sample/main102.png',
            'video_width': 1920, 'video_height': 1080,
            'video_landscape': 'media/sample/short32-wide.mp4',
            'video_portrait': 'media/sample/short32-portrait.mp4',
            'poster_landscape': 'media/sample/short32-wide.webp',
            'poster_portrait': 'media/sample/short32-portrait.webp',
            'video_download_landscape': 'media/sample/short32-wide-credited.mp4',
            'video_download_portrait': 'media/sample/short32-portrait-credited.mp4',
            'catalog_entry': {'id': 'app-sample', 'source_commit': 'a' * 40},
            'history': [{'duration': 32, 'verified': True}],
        }

    def test_default_and_false_keep_every_field(self):
        for flag in ('missing', False):
            with self.subTest(flag=flag):
                case = copy.deepcopy(self.case)
                if flag != 'missing':
                    case['video_primary'] = flag
                self.assertEqual(project_case(case), case)

    def test_true_removes_exactly_orientation_fields_without_mutation(self):
        self.case['video_primary'] = True
        before = copy.deepcopy(self.case)
        actual = project_case(self.case)
        expected = {k: v for k, v in self.case.items() if k not in ORIENTATION_FIELDS}
        self.assertEqual(actual, expected)
        self.assertEqual(self.case, before)
        actual['catalog_entry']['id'] = 'changed'
        actual['history'][0]['duration'] = 999
        self.assertEqual(self.case, before)

    def test_strict_flag_fails_closed(self):
        for flag in (None, 'true', 'false', 0, 1, [], {}):
            with self.subTest(flag=flag):
                self.case['video_primary'] = flag
                with self.assertRaises(ValueError):
                    project_case(self.case)

    def test_required_primary_metadata_fails_closed(self):
        self.case['video_primary'] = True
        for field in ('video', 'poster', 'video_width', 'video_height'):
            with self.subTest(field=field):
                case = copy.deepcopy(self.case)
                del case[field]
                with self.assertRaises(ValueError):
                    project_case(case)
        for field in ('video_width', 'video_height'):
            for value in (False, True, 0, -1, 1920.0, '1920', None):
                with self.subTest(field=field, value=value):
                    case = dict(self.case, **{field: value})
                    with self.assertRaises(ValueError):
                        project_case(case)

    def test_unsafe_primary_paths_fail_closed(self):
        self.case['video_primary'] = True
        for field, valid in (('video', 'main.mp4'), ('poster', 'main.png')):
            for value in ('https://example.test/' + valid, '//example.test/' + valid,
                          '../media/' + valid, '/media/' + valid, 'media/../' + valid,
                          'media/%2e%2e/' + valid, 'media\\' + valid, 'media/' + valid + '?v=1',
                          'media/' + valid + '#part', 'media/\n' + valid, 'media/\x00' + valid,
                          'media/' + valid + ' ', 'private/' + valid, 'media/script.html', None, ''):
                with self.subTest(field=field, value=value):
                    case = dict(self.case, **{field: value})
                    with self.assertRaises(ValueError):
                        project_case(case)

    def test_aggregate_exact_projection_and_unchanged_other_case(self):
        primary = dict(self.case, video_primary=True)
        other = dict(self.case, id='other')
        cases = [primary, other]
        before = copy.deepcopy(cases)
        aggregate = {'cases': project_cases(cases)}
        validate_presentation_aggregate(aggregate, cases)
        self.assertEqual(aggregate['cases'][1], other)
        self.assertEqual(cases, before)
        # Canonical fields needed by all existing variant/download checks remain.
        self.assertTrue(all(field in primary for field in ORIENTATION_FIELDS))
        self.assertEqual(primary['video_download_landscape'], self.case['video_download_landscape'])

    def test_aggregate_drift_is_rejected(self):
        cases = [dict(self.case, video_primary=True), dict(self.case, id='other')]
        correct = {'cases': project_cases(cases)}
        bad = []
        for field, value in (('video', 'media/sample/wrong.mp4'), ('video_width', 1280),
                             ('video_download_landscape', 'media/sample/wrong.mp4'), ('video_primary', 1)):
            item = copy.deepcopy(correct)
            item['cases'][0][field] = value
            bad.append(item)
        item = copy.deepcopy(correct)
        item['cases'][0]['video_landscape'] = self.case['video_landscape']
        bad.append(item)
        item = copy.deepcopy(correct)
        item['cases'][1]['history'][0]['duration'] = 33
        bad.append(item)
        bad.extend(({'cases': list(reversed(correct['cases']))}, {'cases': correct['cases'], 'extra': True}))
        for item in bad:
            with self.subTest(item=item):
                with self.assertRaises(ValueError):
                    validate_presentation_aggregate(item, cases)

    def test_existing_player_uses_primary_in_both_viewports(self):
        # Execute the unchanged real consumer, rather than copying its fallback logic.
        primary = project_case(dict(self.case, video_primary=True))
        inputs = [primary, project_case(self.case), project_case(dict(self.case, video_primary=False))]
        js = r'''
const fs = require('fs'), vm = require('vm');
let narrow = false;
const window = {SY: {h() {}, safeHref: x => typeof x === 'string' && x ? x : null}};
const context = {window, document: {addEventListener() {}},
  matchMedia: q => ({get matches() {return q.includes('699px') && narrow;}, addEventListener() {}})};
vm.runInNewContext(fs.readFileSync('src/media.js', 'utf8'), context);
const inputs = JSON.parse(fs.readFileSync(0, 'utf8'));
const result = [false, true].map(value => {narrow = value; return inputs.map(item => window.SY.media.variant(item));});
process.stdout.write(JSON.stringify(result));
'''
        result = subprocess.run(['node', '-e', js], input=json.dumps(inputs), capture_output=True,
                                text=True, cwd=Path(__file__).resolve().parents[1], check=True)
        wide, narrow = json.loads(result.stdout)
        for viewport in (wide, narrow):
            self.assertEqual(viewport[0]['src'], primary['video'])
            self.assertEqual(viewport[0]['poster'], primary['poster'])
            self.assertEqual((viewport[0]['width'], viewport[0]['height']), (1920, 1080))
        for i in (1, 2):
            self.assertEqual(wide[i]['src'], self.case['video_landscape'])
            self.assertEqual(narrow[i]['src'], self.case['video_portrait'])
            self.assertEqual(wide[i]['poster'], self.case['poster_landscape'])
            self.assertEqual(narrow[i]['poster'], self.case['poster_portrait'])


if __name__ == '__main__':
    unittest.main()
