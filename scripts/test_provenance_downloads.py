"""Custom-rendered downloads require real byte bindings and all public proof roles."""
import copy
import json
from pathlib import Path
import tempfile
import unittest

from production_records import check_download_asset, digest


class ProvenanceDownloadTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='provenance-download-test-')
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.case = {'id': 'sample-case', 'video': 'media/sample-refresh/wide.mp4',
                     'video_landscape': 'media/sample-refresh/wide.mp4',
                     'video_download_landscape': 'media/sample-refresh/wide-credited.mp4'}
        for key in ('video', 'video_download_landscape'):
            self.write(self.case[key], key.encode())
        self.proof_path = 'media/sample-refresh/source/provenance.json'
        self.proof = {'schema_version': 1, 'case_id': 'sample-case', 'records': [
            {'role': 'visual-execution', 'requested': 'claude-opus-5-5',
             'reported': ['claude-opus-5-5'], 'sha256': '1' * 64},
            {'role': 'copy-execution', 'selected_alias': 'kimi-code/k3.1-pro',
             'configured_api_model_id': 'k3.1-pro',
             'identity_evidence': 'runtime-catalog-selection-and-provider-mapping', 'sha256': '2' * 64},
            {'role': 'media-verification', 'sha256': '3' * 64},
            {'role': 'runtime-evidence', 'sha256': '4' * 64},
            {'role': 'source-evidence', 'sha256': '5' * 64}]}
        self.write_proof()
        self.asset = {'case_id': 'sample-case', 'orientation': 'landscape',
                      'source': self.case['video'], 'source_sha256': digest(self.root / self.case['video']),
                      'path': self.case['video_download_landscape'],
                      'sha256': digest(self.root / self.case['video_download_landscape']),
                      'provenance_path': self.proof_path,
                      'provenance_sha256': digest(self.root / self.proof_path),
                      'width': 1920, 'height': 1080, 'duration': 32.0}
        self.probes = []

    def write(self, relative, data):
        path = self.root / relative
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)

    def write_proof(self):
        self.write(self.proof_path, (json.dumps(self.proof) + '\n').encode())
        if hasattr(self, 'asset'):
            self.asset['provenance_sha256'] = digest(self.root / self.proof_path)

    def probe(self, path):
        self.probes.append(path.relative_to(self.root).as_posix())
        return 1920, 1080, 32.0

    def check(self, probe=None):
        return check_download_asset(self.root, self.case, self.asset, probe or self.probe)

    def test_custom_source_and_result_are_both_probed(self):
        self.assertEqual(self.check(), 'provenance-rendered')
        self.assertEqual(self.probes, [self.asset['source'], self.asset['path']])

    def test_unprovenanced_rows_require_exact_v4_spec(self):
        del self.asset['provenance_path']
        del self.asset['provenance_sha256']
        with self.assertRaises(ValueError):
            self.check()
        self.asset['spec'] = 'credit-footer-english-v3'
        with self.assertRaises(ValueError):
            self.check()
        self.asset['spec'] = 'credit-footer-english-v4'
        self.assertEqual(self.check(), 'credit-footer-english-v4')

    def test_custom_requires_all_five_roles(self):
        for role in ('runtime-evidence', 'source-evidence'):
            original = copy.deepcopy(self.proof)
            self.proof['records'] = [r for r in self.proof['records'] if r['role'] != role]
            self.write_proof()
            with self.assertRaises(ValueError):
                self.check()
            self.proof = original

    def test_wrong_case_or_unknown_spec_cannot_use_custom_mode(self):
        self.asset['case_id'] = 'foreign-case'
        with self.assertRaises(ValueError):
            self.check()
        self.asset['case_id'] = 'sample-case'
        self.asset['spec'] = 'invented-spec'
        with self.assertRaises(ValueError):
            self.check()

    def test_missing_proof_hash_or_unknown_fields_are_rejected(self):
        for key in ('provenance_path', 'provenance_sha256'):
            value = self.asset.pop(key)
            with self.subTest(key=key), self.assertRaises(ValueError):
                self.check()
            self.asset[key] = value
        self.asset['unverified_note'] = 'extra'
        with self.assertRaises(ValueError):
            self.check()

    def test_wrong_source_and_result_hashes_are_rejected(self):
        for key in ('source_sha256', 'sha256'):
            value = self.asset[key]
            self.asset[key] = '0' * 64
            with self.subTest(key=key), self.assertRaises(ValueError):
                self.check()
            self.asset[key] = value

    def test_wrong_dimensions_orientation_resolution_and_duration_are_rejected(self):
        for result in ((1280, 720, 32), (1080, 1920, 32), (500, 300, 32),
                       (1920, 1080, 33), (1920, 1080, 1), (1920, 1080, float('nan'))):
            def probe(path):
                return (1920, 1080, 32) if path.name == 'wide.mp4' else result
            with self.subTest(result=result), self.assertRaises(ValueError):
                self.check(probe)

    def test_metadata_cannot_disagree_with_actual_video(self):
        for key, value in (('width', 1280), ('height', 720), ('duration', 33), ('duration', True)):
            original = self.asset[key]
            self.asset[key] = value
            with self.subTest(key=key, value=value), self.assertRaises(ValueError):
                self.check()
            self.asset[key] = original

    def test_foreign_case_provenance_is_rejected(self):
        self.proof['case_id'] = 'foreign-case'
        self.write_proof()
        with self.assertRaises(ValueError):
            self.check()

    def test_shared_media_directory_cannot_claim_custom_scope(self):
        path = self.root / 'data/cases/foreign-case.json'
        path.parent.mkdir(parents=True)
        path.write_text(json.dumps({'id': 'foreign-case', 'video': 'media/sample-refresh/foreign.mp4'}))
        with self.assertRaises(ValueError):
            self.check()

    def test_canonical_download_reference_must_match(self):
        self.case['video_download_landscape'] = 'media/sample-refresh/other.mp4'
        with self.assertRaises(ValueError):
            self.check()


if __name__ == '__main__':
    unittest.main()
