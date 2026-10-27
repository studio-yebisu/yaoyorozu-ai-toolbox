"""Temporary-fixture tamper tests; no current production records are emitted."""
import copy
import json
from pathlib import Path
import tempfile
import unittest

from production_records import (check_download_provenance, check_production_artifacts, digest,
                                merge_download_records, relative_path, verified_download_records)


class CurrentProductionTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='production-record-test-')
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.case = {
            'id': 'sample-case', 'video': 'media/sample-refresh/wide.mp4',
            'video_landscape': 'media/sample-refresh/wide.mp4',
            'video_portrait': 'media/sample-refresh/portrait.mp4',
            'video_source': 'media/sample-refresh/source/render.py'}
        self.legacy_relative = 'data/production/sample-case.json'
        self.case_relative = 'data/cases/sample-case.json'
        self.current_relative = 'data/production/sample-case-current.json'
        self.old_index = 'examples/sample-case/index.html'
        self.old_media = 'media/sample-old.mp4'
        self.write(self.old_index, b'old index')
        self.write(self.old_media, b'old media')
        self.legacy = {'model': {'requested': 'claude-opus-5-5', 'reported': ['claude-opus-5-5']},
                       'upstream': {'commit': 'a' * 40},
                       'runtime': {'status': 'passed', 'sample_count': 100},
                       'artifacts_sha256': self.hashes([self.old_index, self.old_media])}
        self.json(self.legacy_relative, self.legacy)
        self.json(self.case_relative, self.case)

    def write(self, relative, content):
        path = self.root / relative
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(content)
        return path

    def json(self, relative, value):
        return self.write(relative, (json.dumps(value, sort_keys=True) + '\n').encode())

    def hashes(self, paths):
        return {p: digest(self.root / p) for p in paths}

    def fixture(self):
        self.write(self.old_index, b'current index')
        self.write(self.case['video'], b'current wide media')
        self.provenance_relative = 'media/sample-refresh/source/provenance.json'
        self.provenance = {'schema_version': 1, 'case_id': 'sample-case', 'records': [
            {'role': 'visual-execution', 'requested': 'claude-opus-5-5',
             'reported': ['claude-opus-5-5'], 'sha256': '1' * 64},
            {'role': 'copy-execution', 'selected_alias': 'kimi-code/k3.1-pro',
             'configured_api_model_id': 'k3.1-pro',
             'identity_evidence': 'runtime-catalog-selection-and-provider-mapping', 'sha256': '2' * 64},
            {'role': 'media-verification', 'sha256': '3' * 64}]}
        self.json(self.provenance_relative, self.provenance)
        artifacts = self.hashes([self.old_index, self.old_media, self.case['video'],
                                 self.case_relative, self.provenance_relative])
        self.current = {'schema_version': 1, 'case_id': 'sample-case',
                        'legacy_record': {'path': self.legacy_relative,
                                          'sha256': digest(self.root / self.legacy_relative)},
                        'case_record': {'path': self.case_relative,
                                        'sha256': digest(self.root / self.case_relative)},
                        'artifacts_sha256': artifacts,
                        'provenance_artifacts_sha256': self.hashes([self.provenance_relative])}
        self.save()

    def save(self):
        self.json(self.current_relative, self.current)

    def check(self):
        return check_production_artifacts(self.root, self.case,
                                          self.root / self.legacy_relative, self.legacy)

    def update_provenance(self):
        self.json(self.provenance_relative, self.provenance)
        value = digest(self.root / self.provenance_relative)
        self.current['artifacts_sha256'][self.provenance_relative] = value
        self.current['provenance_artifacts_sha256'][self.provenance_relative] = value
        self.save()

    def test_no_companion_preserves_legacy_verification(self):
        self.assertEqual(self.check(), self.legacy['artifacts_sha256'])

    def test_no_companion_still_rejects_changed_artifact(self):
        self.write(self.old_index, b'tampered')
        with self.assertRaises(ValueError):
            self.check()

    def test_current_artifacts_preserve_legacy_record(self):
        before = (self.root / self.legacy_relative).read_bytes()
        self.fixture()
        self.assertEqual(self.check(), self.current['artifacts_sha256'])
        self.assertEqual((self.root / self.legacy_relative).read_bytes(), before)

    def test_current_artifact_tamper(self):
        self.fixture()
        self.write(self.old_index, b'tampered current')
        with self.assertRaises(ValueError):
            self.check()

    def test_legacy_key_cannot_be_dropped(self):
        self.fixture()
        del self.current['artifacts_sha256'][self.old_media]
        self.save()
        with self.assertRaises(ValueError):
            self.check()

    def test_legacy_record_tamper(self):
        self.fixture()
        changed = copy.deepcopy(self.legacy)
        changed['runtime']['sample_count'] = 1
        self.json(self.legacy_relative, changed)
        with self.assertRaises(ValueError):
            self.check()

    def test_case_file_tamper(self):
        self.fixture()
        self.json(self.case_relative, {**self.case, 'video': 'media/other.mp4'})
        with self.assertRaises(ValueError):
            self.check()

    def test_case_aggregate_must_match_bound_source(self):
        self.fixture()
        self.case['video'] = 'media/other.mp4'
        with self.assertRaises(ValueError):
            self.check()

    def test_case_metadata_must_also_be_artifact_pinned(self):
        self.fixture()
        del self.current['artifacts_sha256'][self.case_relative]
        self.save()
        with self.assertRaises(ValueError):
            self.check()

    def test_another_case_companion_is_rejected(self):
        self.fixture()
        self.current['case_id'] = 'sibling-case'
        self.save()
        with self.assertRaises(ValueError):
            self.check()

    def test_another_legacy_path_is_rejected(self):
        self.fixture()
        self.current['legacy_record']['path'] = 'data/production/sibling-case.json'
        self.save()
        with self.assertRaises(ValueError):
            self.check()

    def test_sibling_artifact_is_rejected(self):
        self.fixture()
        path = 'examples/sibling-case/index.html'
        self.write(path, b'sibling')
        self.current['artifacts_sha256'].update(self.hashes([path]))
        self.save()
        with self.assertRaises(ValueError):
            self.check()

    def test_flat_media_directory_does_not_allow_sibling(self):
        self.fixture()
        self.case['video'] = self.old_media
        self.case['video_landscape'] = self.old_media
        self.case['video_portrait'] = self.old_media
        del self.case['video_source']
        self.json(self.case_relative, self.case)
        self.current['case_record']['sha256'] = digest(self.root / self.case_relative)
        self.current['artifacts_sha256'][self.case_relative] = digest(self.root / self.case_relative)
        path = 'media/sibling.mp4'
        self.write(path, b'sibling')
        self.current['artifacts_sha256'].update(self.hashes([path]))
        self.save()
        with self.assertRaises(ValueError):
            self.check()

    def test_shared_download_directory_does_not_allow_sibling(self):
        self.fixture()
        self.case['video_download_landscape'] = 'media/downloads/sample-credited.mp4'
        self.json(self.case_relative, self.case)
        self.current['case_record']['sha256'] = digest(self.root / self.case_relative)
        self.current['artifacts_sha256'][self.case_relative] = digest(self.root / self.case_relative)
        path = 'media/downloads/sibling-credited.mp4'
        self.write(path, b'sibling')
        self.current['artifacts_sha256'].update(self.hashes([path]))
        self.save()
        with self.assertRaises(ValueError):
            self.check()

    def test_shared_media_subtree_does_not_allow_sibling(self):
        self.fixture()
        self.json('data/cases/sibling-case.json', {'id': 'sibling-case',
                                                   'video': 'media/sample-refresh/sibling.mp4'})
        path = 'media/sample-refresh/sibling-extra.mp4'
        self.write(path, b'sibling')
        self.current['artifacts_sha256'].update(self.hashes([path]))
        self.save()
        with self.assertRaises(ValueError):
            self.check()

    def test_malformed_current_never_falls_back(self):
        self.write(self.current_relative, b'{invalid')
        with self.assertRaises(ValueError):
            self.check()

    def test_duplicate_current_json_key_is_rejected(self):
        self.write(self.current_relative, b'{"schema_version":1,"schema_version":1}')
        with self.assertRaises(ValueError):
            self.check()

    def test_unknown_current_field_is_rejected(self):
        self.fixture()
        self.current['runtime'] = {'status': 'passed'}
        self.save()
        with self.assertRaises(ValueError):
            self.check()

    def test_invalid_sha_or_empty_map_is_rejected(self):
        for value in ({}, {self.old_index: 'invalid'}):
            with self.subTest(value=value):
                self.fixture()
                self.current['artifacts_sha256'] = value
                self.save()
                with self.assertRaises(ValueError):
                    self.check()

    def test_provenance_must_be_in_current_artifacts(self):
        self.fixture()
        del self.current['artifacts_sha256'][self.provenance_relative]
        self.save()
        with self.assertRaises(ValueError):
            self.check()

    def test_provenance_hash_tamper(self):
        self.fixture()
        self.write(self.provenance_relative, b'{}')
        with self.assertRaises(ValueError):
            self.check()

    def test_provenance_for_another_case_is_rejected(self):
        self.fixture()
        self.provenance['case_id'] = 'sibling-case'
        self.update_provenance()
        with self.assertRaises(ValueError):
            self.check()

    def test_missing_authorship_or_media_record(self):
        self.fixture()
        self.provenance['records'].pop()
        self.update_provenance()
        with self.assertRaises(ValueError):
            self.check()

    def test_unexpected_visual_model_is_rejected(self):
        self.fixture()
        self.provenance['records'][0]['requested'] = 'other-model'
        self.provenance['records'][0]['reported'] = ['other-model']
        self.update_provenance()
        with self.assertRaises(ValueError):
            self.check()

    def test_reported_model_mismatch_is_rejected(self):
        self.fixture()
        self.provenance['records'][0]['reported'] = ['other-model']
        self.update_provenance()
        with self.assertRaises(ValueError):
            self.check()

    def test_private_fields_and_absolute_model_paths_are_rejected(self):
        for field, value in (('raw_log', 'private content'), ('path', 'C:/Users/private/input')):
            with self.subTest(field=field):
                self.fixture()
                self.provenance['records'][0][field] = value
                self.update_provenance()
                with self.assertRaises(ValueError):
                    self.check()
        self.fixture()
        self.provenance['records'][1]['selected_alias'] = '/Users/private/input'
        self.update_provenance()
        with self.assertRaises(ValueError):
            self.check()

    def test_copy_selection_evidence_cannot_claim_unobserved_response(self):
        self.fixture()
        self.provenance['records'][1]['reported'] = ['k3.1-pro']
        self.update_provenance()
        with self.assertRaises(ValueError):
            self.check()

    def test_copy_selection_evidence_mode_is_strict(self):
        self.fixture()
        self.provenance['records'][1]['identity_evidence'] = 'reported-response'
        self.update_provenance()
        with self.assertRaises(ValueError):
            self.check()

    def test_copy_reported_response_shape_is_not_selection_evidence(self):
        self.fixture()
        self.provenance['records'][1] = {'role': 'copy-execution', 'requested': 'example-model',
                                         'reported': ['example-model'], 'sha256': '2' * 64}
        self.update_provenance()
        with self.assertRaises(ValueError):
            self.check()

    def test_noncanonical_paths_are_rejected(self):
        for value in ('../escape', '/absolute', 'C:/Windows/file', 'media/../sibling',
                      'https://example.com/file', 'media/%2e%2e/file', 'media\\file'):
            with self.subTest(value=value), self.assertRaises(ValueError):
                relative_path(value)

    def download_fixture(self):
        self.fixture()
        self.case['video_download_landscape'] = 'media/sample-refresh/wide-credited.mp4'
        self.case['video_download_portrait'] = 'media/sample-refresh/portrait-credited.mp4'
        self.write(self.case['video_portrait'], b'portrait source fixture')
        for orientation in ('landscape', 'portrait'):
            self.write(self.case['video_download_' + orientation], (orientation + ' credited fixture').encode())
        old_pair = [{'case_id': self.case['id'], 'orientation': orientation,
                     'source': 'media/old-' + orientation + '.mp4',
                     'source_sha256': '4' * 64,
                     'path': 'media/downloads/old-' + orientation + '.mp4',
                     'sha256': '5' * 64, 'original_metadata': {'retained': True}}
                    for orientation in ('landscape', 'portrait')]
        sibling = {'case_id': 'sibling-case', 'orientation': 'landscape', 'retained': True}
        self.download_manifest = {'schema_version': 1, 'assets': [*old_pair, sibling], 'other_metadata': 'retained'}
        return old_pair

    def test_download_factory_collects_actual_hashes_only(self):
        self.download_fixture()
        rows = verified_download_records(self.root, self.case, self.provenance_relative)
        for row in rows:
            self.assertEqual(row['source_sha256'], digest(self.root / row['source']))
            self.assertEqual(row['sha256'], digest(self.root / row['path']))
            self.assertEqual(row['provenance_sha256'], digest(self.root / row['provenance_path']))
            self.assertNotIn('width', row)
            self.assertNotIn('model', row)

    def test_download_factory_requires_existing_actual_files(self):
        self.download_fixture()
        (self.root / self.case['video_download_portrait']).unlink()
        with self.assertRaises(ValueError):
            verified_download_records(self.root, self.case, self.provenance_relative)

    def test_download_merge_preserves_history_and_other_cases(self):
        old_pair = self.download_fixture()
        before = copy.deepcopy(self.download_manifest)
        rows = verified_download_records(self.root, self.case, self.provenance_relative)
        merged = merge_download_records(self.download_manifest, self.case, rows)
        self.assertEqual(self.download_manifest, before)
        self.assertEqual(merged['history_assets'], old_pair)
        self.assertEqual(merged['assets'][2], before['assets'][2])
        self.assertEqual(merged['other_metadata'], before['other_metadata'])
        self.assertEqual(merged['assets'][:2], rows)

    def test_download_merge_is_idempotent(self):
        self.download_fixture()
        rows = verified_download_records(self.root, self.case, self.provenance_relative)
        merged = merge_download_records(self.download_manifest, self.case, rows)
        self.assertEqual(merge_download_records(merged, self.case, rows), merged)

    def test_download_merge_requires_both_orientations(self):
        self.download_fixture()
        rows = verified_download_records(self.root, self.case, self.provenance_relative)
        with self.assertRaises(ValueError):
            merge_download_records(self.download_manifest, self.case, rows[:1])

    def test_download_merge_rejects_wrong_case_source_or_destination(self):
        self.download_fixture()
        rows = verified_download_records(self.root, self.case, self.provenance_relative)
        for field, value in (('case_id', 'sibling-case'), ('source', 'media/sibling.mp4'),
                             ('path', 'media/sibling-credited.mp4')):
            with self.subTest(field=field):
                bad = copy.deepcopy(rows)
                bad[0][field] = value
                with self.assertRaises(ValueError):
                    merge_download_records(self.download_manifest, self.case, bad)

    def test_download_provenance_partial_or_sibling_binding_rejected(self):
        self.download_fixture()
        with self.assertRaises(ValueError):
            check_download_provenance(self.root, self.case, {'provenance_path': self.provenance_relative})
        with self.assertRaises(ValueError):
            check_download_provenance(self.root, self.case, {'provenance_path': 'examples/sibling-case/proof.json',
                                                            'provenance_sha256': '1' * 64})

    def test_legacy_download_row_needs_no_new_provenance(self):
        self.assertIsNone(check_download_provenance(self.root, self.case, {'case_id': self.case['id']}))


if __name__ == '__main__':
    unittest.main()
