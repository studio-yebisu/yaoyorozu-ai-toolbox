"""Temporary tamper fixtures for a non-inference mechanical maintenance overlay."""
import copy
import hashlib
import io
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import zipfile

from mechanical_maintenance import (BASELINE_PREFIX, REGISTRY_PATH, MechanicalMaintenance,
                                    check_case_change, check_change, check_license_package, protected_path)
from production_records import check_production_artifacts, digest


class MechanicalTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='mechanical-maintenance-test-')
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.case = {'id': 'sample-case', 'video': 'media/sample.mp4', 'metrics': {'exact': 100},
                     'video_license': {'credit': 'original credit', 'effective_on': '2026-10-21'}}
        self.case_path = 'data/cases/sample-case.json'
        self.legacy_path = 'data/production/sample-case.json'
        self.index = 'examples/sample-case/index.html'
        self.old = '<p>八百万図AIツールボックス</p>\n'.encode()
        self.new = b'<p>Yaoyorozu AI ToolBox</p>\n'
        self.write(self.index, self.old)
        self.write(self.case['video'], b'original observed video')
        self.json(self.case_path, self.case)
        self.legacy = {'model': {'requested': 'claude-opus-5-5'},
                       'runtime': {'sample_count': 100},
                       'artifacts_sha256': {path: digest(self.root / path) for path in
                                           (self.index, self.case_path, self.case['video'])}}
        self.json(self.legacy_path, self.legacy)
        self.legacy_bytes = (self.root / self.legacy_path).read_bytes()
        self.write(self.index, self.new)
        self.row = self.change(self.index, self.old, self.new, 'presentation-branding')
        self.entry = {'case_id': self.case['id'],
                      'legacy_record': self.binding(self.legacy_path),
                      'baseline_record': self.binding(self.legacy_path),
                      'case_record': self.binding(self.case_path), 'changes': [self.row]}
        self.registry = {'schema_version': 1, 'purpose': 'mechanical-maintenance',
                         'model_execution': False, 'cases': [self.entry]}
        self.save()

    def write(self, relative, content):
        path = self.root / relative
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(content)
        return path

    def json(self, relative, value):
        return self.write(relative, (json.dumps(value, ensure_ascii=False) + '\n').encode())

    def binding(self, relative):
        return {'path': relative, 'sha256': digest(self.root / relative)}

    def change(self, relative, before, after, kind):
        old = hashlib.sha256(before).hexdigest()
        baseline = BASELINE_PREFIX + old + '.bin'
        self.write(baseline, before)
        return {'path': relative, 'before_sha256': old,
                'after_sha256': hashlib.sha256(after).hexdigest(),
                'kind': kind, 'before_artifact': baseline}

    def save(self):
        self.json(REGISTRY_PATH, self.registry)

    def check(self):
        return check_production_artifacts(self.root, self.case, self.root / self.legacy_path, self.legacy)

    def add_artifact(self, relative, before, after, kind='presentation-branding'):
        self.write(relative, after)
        self.legacy['artifacts_sha256'][relative] = hashlib.sha256(before).hexdigest()
        self.json(self.legacy_path, self.legacy)
        self.entry['legacy_record'] = self.binding(self.legacy_path)
        self.entry['baseline_record'] = self.binding(self.legacy_path)
        row = self.change(relative, before, after, kind)
        self.entry['changes'].append(row)
        self.save()
        return row

    def test_exact_reviewed_tuple_passes_without_changing_legacy(self):
        actual = self.check()
        self.assertEqual(actual[self.index], self.row['after_sha256'])
        self.assertEqual((self.root / self.legacy_path).read_bytes(), self.legacy_bytes)
        self.assertEqual(self.legacy['artifacts_sha256'][self.index], self.row['before_sha256'])

    def test_no_registry_still_rejects_changed_artifact(self):
        (self.root / REGISTRY_PATH).unlink()
        with self.assertRaises(ValueError):
            self.check()

    def test_missing_baseline_or_final_is_rejected(self):
        for key in ('path', 'before_artifact'):
            with self.subTest(key=key):
                path = self.root / self.row[key]
                before = path.read_bytes()
                path.unlink()
                with self.assertRaises(ValueError):
                    self.check()
                path.write_bytes(before)

    def test_wrong_old_or_new_hash_is_rejected(self):
        for key in ('before_sha256', 'after_sha256'):
            with self.subTest(key=key):
                old = self.row[key]
                self.row[key] = '0' * 64
                self.save()
                with self.assertRaises(ValueError):
                    self.check()
                self.row[key] = old

    def test_baseline_and_final_tamper_are_rejected(self):
        for key in ('path', 'before_artifact'):
            with self.subTest(key=key):
                path = self.root / self.row[key]
                old = path.read_bytes()
                path.write_bytes(b'tamper')
                with self.assertRaises(ValueError):
                    self.check()
                path.write_bytes(old)

    def test_unknown_path_is_rejected(self):
        self.row['path'] = 'examples/sample-case/unknown.html'
        self.save()
        with self.assertRaises(ValueError):
            self.check()

    def test_foreign_presentation_is_rejected_even_if_legacy_lists_it(self):
        self.add_artifact('examples/foreign-case/index.html', self.old, self.new)
        with self.assertRaises(ValueError):
            self.check()

    def test_wrong_case_and_duplicate_case_are_rejected(self):
        self.entry['case_id'] = 'foreign-case'
        self.save()
        with self.assertRaises(ValueError):
            self.check()
        self.entry['case_id'] = 'sample-case'
        self.registry['cases'].append(copy.deepcopy(self.entry))
        self.save()
        with self.assertRaises(ValueError):
            self.check()

    def test_dropped_change_does_not_waive_artifact(self):
        self.add_artifact('examples/sample-case/desk.html', self.old, self.new)
        self.entry['changes'].pop(0)
        self.save()
        with self.assertRaises(ValueError):
            self.check()

    def test_extra_unchanged_or_duplicate_change_is_rejected(self):
        self.row['after_sha256'] = self.row['before_sha256']
        self.save()
        with self.assertRaises(ValueError):
            self.check()
        self.row['after_sha256'] = hashlib.sha256(self.new).hexdigest()
        self.entry['changes'].append(copy.deepcopy(self.row))
        self.save()
        with self.assertRaises(ValueError):
            self.check()

    def test_legacy_case_and_baseline_bindings_are_not_optional(self):
        for field in ('legacy_record', 'case_record', 'baseline_record'):
            with self.subTest(field=field):
                old = self.entry[field]['sha256']
                self.entry[field]['sha256'] = '0' * 64
                self.save()
                with self.assertRaises(ValueError):
                    self.check()
                self.entry[field]['sha256'] = old

    def test_unknown_fields_and_model_execution_claim_are_rejected(self):
        for key, value in (('model_execution', True), ('reported', ['claude-opus-5-5'])):
            original = copy.deepcopy(self.registry)
            self.registry[key] = value
            self.save()
            with self.assertRaises(ValueError):
                self.check()
            self.registry = original

    def test_changed_input_and_raw_observation_cannot_be_overlaid(self):
        for path in ('examples/sample-case/fixtures/input.json',
                     'examples/sample-case/tdd/green1/tasks.mjs',
                     'examples/sample-case/before/index.html',
                     'examples/sample-case/fixture.html', 'skills/sample-case/SKILL.md',
                     'examples/sample-case/output.csv', 'examples/sample-case/scan.pdf',
                     'examples/sample-case/observed.png', 'media/sample.mp4',
                     'examples/sample-case/film/index.html',
                     'examples/sample-case/compose-responsive.py'):
            with self.subTest(path=path):
                self.assertTrue(protected_path(path))

    def test_fully_pinned_branding_rows_cannot_waive_inputs_or_observations(self):
        for path in ('examples/sample-case/fixtures/input.json',
                     'examples/sample-case/tdd/green1/tasks.mjs',
                     'skills/sample-case/SKILL.md', 'media/sample.mp4',
                     'examples/3d-asset-server-example/run.mjs',
                     'examples/sample-case/film/index.html'):
            with self.subTest(path=path):
                self.write(path, self.new)
                row = self.change(path, self.old, self.new, 'presentation-branding')
                artifacts = {path: row['before_sha256']}
                with self.assertRaisesRegex(ValueError, 'protected artifact'):
                    check_change(self.root, 'sample-case', row, artifacts)

    def test_branding_does_not_allow_functional_code_change(self):
        changed = self.new + b'runInference("different prompt");\n'
        self.write(self.index, changed)
        self.row['after_sha256'] = hashlib.sha256(changed).hexdigest()
        self.save()
        with self.assertRaises(ValueError):
            self.check()

    def test_shared_ui_is_exactly_scoped(self):
        row = self.add_artifact('media.js', b'old site UI', b'new approved site UI', 'shared-site-ui')
        self.assertEqual(self.check()['media.js'], row['after_sha256'])
        self.add_artifact('unrecognized.js', b'old', b'new', 'shared-site-ui')
        with self.assertRaises(ValueError):
            self.check()

    def test_case_credit_change_preserves_metrics_and_schema(self):
        old = (self.root / self.case_path).read_bytes()
        self.case['video_license']['credit'] = 'existing approved legal credit'
        self.json(self.case_path, self.case)
        new = (self.root / self.case_path).read_bytes()
        self.entry['changes'].append(self.change(self.case_path, old, new, 'case-publication-metadata'))
        self.entry['case_record'] = self.binding(self.case_path)
        self.save()
        self.assertEqual(self.check()[self.case_path], hashlib.sha256(new).hexdigest())
        altered = copy.deepcopy(self.case)
        altered['metrics']['exact'] = 99
        with self.assertRaises(ValueError):
            check_case_change(self.case, altered)
        altered = copy.deepcopy(self.case)
        altered['metrics']['label'] = 'new column'
        with self.assertRaises(ValueError):
            check_case_change(self.case, altered)

    def test_case_historical_string_and_other_content_are_protected(self):
        for old, new in (({'runtime': {'note': '八百万図'}}, {'runtime': {'note': 'Yaoyorozu'}}),
                         ({'summary': 'old fact'}, {'summary': 'new unsupported fact'})):
            with self.subTest(old=old), self.assertRaises(ValueError):
                check_case_change(old, new)

    def test_context_tamper_after_registry_load_is_rejected(self):
        maintenance = MechanicalMaintenance(self.root, [self.case])
        modified = copy.deepcopy(self.legacy)
        modified['runtime']['sample_count'] = 99
        self.json(self.legacy_path, modified)
        with self.assertRaises(ValueError):
            maintenance.apply(self.case, self.root / self.legacy_path, modified,
                              self.legacy['artifacts_sha256'], self.root / self.legacy_path)

    def test_current_v1_companion_is_bound_without_reassigning_its_authorship(self):
        proof_path = 'examples/sample-case/provenance.json'
        proof = {'schema_version': 1, 'case_id': 'sample-case', 'records': [
            {'role': 'visual-execution', 'requested': 'claude-opus-5-5',
             'reported': ['claude-opus-5-5'], 'sha256': '1' * 64},
            {'role': 'copy-execution', 'selected_alias': 'kimi-code/k3.1-pro',
             'configured_api_model_id': 'k3.1-pro',
             'identity_evidence': 'runtime-catalog-selection-and-provider-mapping', 'sha256': '2' * 64},
            {'role': 'media-verification', 'sha256': '3' * 64}]}
        self.json(proof_path, proof)
        artifacts = copy.deepcopy(self.legacy['artifacts_sha256'])
        artifacts[proof_path] = digest(self.root / proof_path)
        current = {'schema_version': 1, 'case_id': 'sample-case',
                   'legacy_record': self.binding(self.legacy_path),
                   'case_record': self.binding(self.case_path),
                   'artifacts_sha256': artifacts,
                   'provenance_artifacts_sha256': {proof_path: digest(self.root / proof_path)}}
        current_path = 'data/production/sample-case-current.json'
        self.json(current_path, current)
        before = (self.root / current_path).read_bytes()
        self.entry['baseline_record'] = self.binding(current_path)
        self.save()
        self.assertEqual(self.check()[self.index], self.row['after_sha256'])
        self.assertEqual((self.root / current_path).read_bytes(), before)
        self.assertEqual((self.root / self.legacy_path).read_bytes(), self.legacy_bytes)


class LicensePackageTests(unittest.TestCase):
    def zip_bytes(self, rows):
        result = io.BytesIO()
        with zipfile.ZipFile(result, 'w') as archive:
            for name, value in rows:
                archive.writestr(name, value)
        return result.getvalue()

    def test_license_only_addition_preserves_original_code(self):
        before = self.zip_bytes([('app.js', 'original code')])
        after = self.zip_bytes([('app.js', 'original code'), ('LICENSE.txt', 'existing legal notice')])
        check_license_package(before, after)

    def test_changed_code_removed_or_added_nonlicense_member_are_rejected(self):
        before = self.zip_bytes([('app.js', 'original code'), ('README.md', 'original docs')])
        for rows in ([('app.js', 'changed code'), ('README.md', 'original docs')],
                     [('app.js', 'original code')],
                     [('app.js', 'original code'), ('README.md', 'original docs'), ('extra.js', 'new code')]):
            with self.subTest(rows=rows), self.assertRaises(ValueError):
                check_license_package(before, self.zip_bytes(rows))

    def test_duplicate_or_escaping_members_are_rejected(self):
        before = self.zip_bytes([('app.js', 'original code')])
        for rows in ([('app.js', 'original code'), ('app.js', 'duplicate')],
                     [('app.js', 'original code'), ('../LICENSE', 'notice')]):
            with self.subTest(rows=rows), self.assertRaises(ValueError):
                check_license_package(before, self.zip_bytes(rows))


class PosterReferenceTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='mechanical-poster-test-')
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.relative = 'data/cases/openvoice-example.json'
        self.poster = 'examples/openvoice-example/video/review/portrait/poster.png'
        before = {'id': 'openvoice-example', 'poster': 'media/openvoice-example.webp',
                  'poster_portrait': 'media/openvoice-example.webp'}
        after = {**before, 'poster_portrait': self.poster}
        self.old = json.dumps(before).encode()
        self.new = json.dumps(after).encode()
        old_sha = hashlib.sha256(self.old).hexdigest()
        baseline = BASELINE_PREFIX + old_sha + '.bin'
        for relative, content in ((self.relative, self.new), (baseline, self.old),
                                  (self.poster, b'existing portrait asset')):
            path = self.root / relative
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(content)
        self.row = {'path': self.relative, 'before_sha256': old_sha,
                    'after_sha256': hashlib.sha256(self.new).hexdigest(),
                    'kind': 'case-publication-metadata', 'before_artifact': baseline}
        self.artifacts = {self.relative: old_sha, self.poster: digest(self.root / self.poster)}

    def check(self):
        check_change(self.root, 'openvoice-example', self.row, self.artifacts)

    def test_only_existing_unchanged_720x1280_case_poster_is_accepted(self):
        with patch('mechanical_maintenance.probe_dimensions', return_value=(720, 1280)):
            self.check()
        with patch('mechanical_maintenance.probe_dimensions', return_value=(1280, 720)):
            with self.assertRaises(ValueError):
                self.check()

    def test_new_asset_bytes_cannot_use_reference_only_correction(self):
        (self.root / self.poster).write_bytes(b'new generated media')
        with self.assertRaises(ValueError):
            self.check()

    def test_unpinned_or_foreign_poster_is_rejected(self):
        del self.artifacts[self.poster]
        with self.assertRaises(ValueError):
            self.check()
        with self.assertRaises(ValueError):
            check_case_change({'id': 'foreign-case', 'poster': 'old.webp'},
                              {'id': 'foreign-case', 'poster': 'new.webp'})

if __name__ == '__main__':
    unittest.main()
