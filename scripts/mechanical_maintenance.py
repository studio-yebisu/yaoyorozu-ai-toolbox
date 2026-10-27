"""Strict, separately attributed maintenance of already verified public artifacts."""
import copy
import io
import json
from pathlib import Path, PurePosixPath
import re
import subprocess
import zipfile

from production_records import bound_file, digest, hash_map, load_json, require, sha_value

REGISTRY_PATH = 'data/production/mechanical-maintenance.json'
BASELINE_PREFIX = 'data/production/mechanical-baselines/'
SHARED_UI = {'case.js', 'media.js', 'media.css'}
KINDS = {'presentation-branding', 'case-publication-metadata',
         'shared-site-ui', 'license-only-package'}
# Existing committed name/credit migrations, not generated product wording.
BRANDING = (
    ('八百万図AIツールボックス', 'Yaoyorozu AI ToolBox'),
    ('やおよろずAIツールボックス', 'Yaoyorozu AI ToolBox'),
    ('八百万図', 'Yaoyorozu'),
    ('引用元:Yaoyorozu AI ToolBox made by studio_yebisu', 'Yaoyorozu AI ToolBox · @studio_yebisu'),
    ('Yaoyorozu AI ToolBox（Yaoyorozu AI ToolBox）', 'Yaoyorozu AI ToolBox'),
    ('-credited-ja-v3.mp4', '-credited-v4.mp4'),
)
PROTECTED_PARTS = {'tdd', 'baseline', 'before', 'fixtures', 'fixture', 'inputs',
                   'outputs', 'observed', 'observations', 'results', 'samples', 'testing', 'film'}
IMMUTABLE_ARTIFACTS = {
    'examples/3d-asset-server-example/app.js',
    'examples/3d-asset-server-example/model-view.js',
    'examples/3d-asset-server-example/run.mjs',
    'examples/motion-video-kit-example/components.mjs',
}
PROTECTED_CASE_KEYS = {'id', 'metrics', 'results', 'runtime', 'model', 'upstream',
                       'source_commit', 'sample_format', 'samples', 'input', 'output',
                       'inputs', 'outputs', 'observed', 'verified_at', 'verified_on',
                       'created_on', 'updated_on', 'effective_on', 'verification_stage'}
CASE_REFERENCES = {('video_license', 'credit'), ('video_download_landscape',),
                   ('video_download_portrait',)}


def brand_bytes(value):
    for before, after in BRANDING:
        value = value.replace(before.encode(), after.encode())
    return value


def protected_path(relative):
    path = PurePosixPath(relative)
    return (relative.startswith(('skills/', 'data/production/'))
            or relative in IMMUTABLE_ARTIFACTS
            or bool(set(path.parts) & PROTECTED_PARTS)
            or path.name in {'fixture.html', 'SKILL.md'}
            or path.suffix.lower() in {'.mp4', '.webm', '.mov', '.wav', '.mp3', '.flac',
                                       '.png', '.jpg', '.jpeg', '.webp', '.pdf', '.csv',
                                       '.jsonl', '.ndjson', '.py'})


def check_case_change(before, after, allow_openvoice_portrait=False):
    """Keep IDs, runtime facts, numerical values, schema and historical inputs intact."""
    def walk(old, new, parts=()):
        require(type(old) is type(new), 'Mechanical case maintenance changed a value type')
        if isinstance(old, dict):
            require(old.keys() == new.keys(), 'Mechanical case maintenance changed case schema')
            for key in old:
                walk(old[key], new[key], parts + (key,))
        elif isinstance(old, list):
            require(len(old) == len(new), 'Mechanical case maintenance changed list members')
            for i, (a, b) in enumerate(zip(old, new)):
                walk(a, b, parts + (i,))
        elif old != new:
            require(not any(key in PROTECTED_CASE_KEYS for key in parts if isinstance(key, str)),
                    'Mechanical case maintenance changed protected facts')
            require(isinstance(old, str), 'Mechanical case maintenance changed non-text facts')
            require(parts in CASE_REFERENCES
                    or (parts == ('poster_portrait',) and allow_openvoice_portrait)
                    or brand_bytes(old.encode()) == new.encode(),
                    'Mechanical case maintenance changed undeclared case content')
    walk(before, after)


def probe_dimensions(path):
    value = json.loads(subprocess.check_output([
        'ffprobe', '-v', 'error', '-select_streams', 'v:0',
        '-show_entries', 'stream=width,height', '-of', 'json', str(path)], encoding='utf-8'))
    require(len(value.get('streams', [])) == 1, 'Expected one poster image stream')
    stream = value['streams'][0]
    return stream['width'], stream['height']


def check_license_package(before, after):
    """Only license/notice payloads may differ; original member data remains exact."""
    def members(payload):
        with zipfile.ZipFile(io.BytesIO(payload)) as archive:
            names = archive.namelist()
            require(len(names) == len(set(names)), 'Duplicate package member')
            for name in names:
                path = PurePosixPath(name)
                require(not path.is_absolute() and '..' not in path.parts and '\\' not in name,
                        'Unsafe package member')
            return {name: archive.read(name) for name in names}
    old, new = members(before), members(after)
    require(old.keys() <= new.keys(), 'Mechanical package maintenance removed members')
    changed = [name for name in new if name not in old or old[name] != new[name]]
    require(bool(changed), 'Mechanical package maintenance has no payload change')
    for name in changed:
        base = PurePosixPath(name).name.upper()
        require(base in {'LICENSE', 'LICENSE.TXT', 'LICENSE.MD', 'NOTICE', 'NOTICE.TXT',
                         'THIRD_PARTY_NOTICES.TXT', 'MEDIA-LICENSE.MD'},
                'Mechanical package maintenance changed a non-license member')


def check_change(root, case_id, row, artifacts):
    require(isinstance(row, dict) and set(row) == {
        'path', 'before_sha256', 'after_sha256', 'kind', 'before_artifact'},
        'Unexpected mechanical change fields')
    relative = row['path']
    require(relative in artifacts, 'Mechanical maintenance added an unknown artifact')
    require(row['kind'] in KINDS and not protected_path(relative),
            'Mechanical maintenance targets a protected artifact')
    before_sha, after_sha = sha_value(row['before_sha256']), sha_value(row['after_sha256'])
    require(before_sha == artifacts[relative] and before_sha != after_sha,
            'Mechanical maintenance baseline hash differs or is unchanged')
    baseline = row['before_artifact']
    require(baseline == BASELINE_PREFIX + before_sha + '.bin',
            'Mechanical maintenance baseline artifact is not content addressed')
    before_path = bound_file(root, baseline)
    require(digest(before_path) == before_sha, 'Mechanical maintenance baseline artifact changed')
    after_path = bound_file(root, relative)
    require(digest(after_path) == after_sha, 'Mechanical maintenance final artifact changed')
    before, after = before_path.read_bytes(), after_path.read_bytes()
    kind = row['kind']
    if kind == 'shared-site-ui':
        require(relative in SHARED_UI, 'Mechanical shared UI is not an approved shared path')
    elif kind == 'case-publication-metadata':
        require(relative == f'data/cases/{case_id}.json', 'Mechanical maintenance targets a foreign case')
        old_case, new_case = load_json(before_path), load_json(after_path)
        poster_changed = old_case.get('poster_portrait') != new_case.get('poster_portrait')
        if poster_changed:
            poster = new_case.get('poster_portrait')
            require(case_id == 'openvoice-example'
                    and old_case.get('poster_portrait') == 'media/openvoice-example.webp'
                    and poster == 'examples/openvoice-example/video/review/portrait/poster.png'
                    and poster in artifacts,
                    'Mechanical poster correction is not the approved case-owned reference')
            poster_path = bound_file(root, poster)
            require(digest(poster_path) == artifacts[poster]
                    and probe_dimensions(poster_path) == (720, 1280),
                    'Mechanical poster correction changed the original portrait asset')
        check_case_change(old_case, new_case, allow_openvoice_portrait=poster_changed)
    else:
        require(relative.startswith(f'examples/{case_id}/'),
                'Mechanical maintenance targets a foreign presentation')
        if kind == 'presentation-branding':
            require(PurePosixPath(relative).suffix.lower() in {'.html', '.css', '.js', '.mjs', '.md'},
                    'Mechanical branding targets non-presentation data')
            require(brand_bytes(before) == after, 'Mechanical branding changed more than fixed name migration')
        else:
            require(PurePosixPath(relative).suffix.lower() == '.zip', 'Mechanical package is not a ZIP')
            check_license_package(before, after)


class MechanicalMaintenance:
    def __init__(self, root, cases):
        self.root = Path(root)
        self.entries = {}
        self.effective = {}
        path = self.root / REGISTRY_PATH
        if not path.exists() and not path.is_symlink():
            return
        registry = load_json(bound_file(self.root, REGISTRY_PATH))
        require(isinstance(registry, dict) and set(registry) == {
            'schema_version', 'purpose', 'model_execution', 'cases'}, 'Unexpected mechanical registry fields')
        require(type(registry['schema_version']) is int and registry['schema_version'] == 1
                and registry['purpose'] == 'mechanical-maintenance' and registry['model_execution'] is False,
                'Mechanical registry cannot claim model execution')
        require(isinstance(registry['cases'], list) and bool(registry['cases']),
                'Mechanical registry has no case entries')
        known = {case['id']: case for case in cases}
        require(len(known) == len(cases), 'Duplicate canonical cases')
        for entry in registry['cases']:
            require(isinstance(entry, dict) and set(entry) == {
                'case_id', 'legacy_record', 'baseline_record', 'case_record', 'changes'},
                'Unexpected mechanical case fields')
            case_id = entry['case_id']
            require(isinstance(case_id, str) and re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*', case_id)
                    and case_id in known and case_id not in self.entries,
                    'Unknown or duplicate mechanical case')
            legacy_path = f'data/production/{case_id}.json'
            current_path = f'data/production/{case_id}-current.json'
            baseline_path = current_path if (self.root / current_path).exists() else legacy_path
            for key, expected_path in (('legacy_record', legacy_path),
                                       ('baseline_record', baseline_path),
                                       ('case_record', f'data/cases/{case_id}.json')):
                binding = entry[key]
                require(isinstance(binding, dict) and set(binding) == {'path', 'sha256'}
                        and binding['path'] == expected_path, 'Mechanical record binding points elsewhere')
                require(digest(bound_file(self.root, expected_path)) == sha_value(binding['sha256']),
                        'Mechanical record binding changed')
            require(load_json(self.root / entry['case_record']['path']) == known[case_id],
                    'Mechanical case aggregate differs from canonical source')
            baseline = load_json(self.root / baseline_path)
            artifacts = hash_map(baseline['artifacts_sha256'])
            require(isinstance(entry['changes'], list) and bool(entry['changes']),
                    'Mechanical case has no changes')
            seen = set()
            effective = copy.deepcopy(artifacts)
            for row in entry['changes']:
                require(isinstance(row, dict) and row.get('path') not in seen,
                        'Duplicate mechanical artifact')
                check_change(self.root, case_id, row, artifacts)
                seen.add(row['path'])
                effective[row['path']] = row['after_sha256']
            self.entries[case_id] = entry
            self.effective[case_id] = effective

    def apply(self, case, legacy_path, legacy, artifacts, baseline_path):
        entry = self.entries.get(case['id'])
        if entry is None:
            return artifacts
        for key in ('legacy_record', 'baseline_record', 'case_record'):
            binding = entry[key]
            require(digest(bound_file(self.root, binding['path'])) == binding['sha256'],
                    'Mechanical record binding changed after validation')
        require(Path(legacy_path).resolve() == (self.root / entry['legacy_record']['path']).resolve()
                and legacy == load_json(self.root / entry['legacy_record']['path']),
                'Mechanical maintenance received another legacy record')
        require(Path(baseline_path).resolve() == (self.root / entry['baseline_record']['path']).resolve(),
                'Mechanical maintenance received another baseline record')
        expected = hash_map(load_json(baseline_path)['artifacts_sha256'])
        require(artifacts == expected and case == load_json(self.root / entry['case_record']['path']),
                'Mechanical maintenance received altered artifacts or case data')
        return copy.deepcopy(self.effective[case['id']])
