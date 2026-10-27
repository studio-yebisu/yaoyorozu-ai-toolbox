"""Validate optional current-artifact companions without rewriting legacy proof."""
import copy
import hashlib
import json
import math
from pathlib import Path, PurePosixPath
import re
import subprocess
from urllib.parse import unquote, urlsplit


def require(condition, message):
    if not condition:
        raise ValueError(message)


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def relative_path(value):
    require(isinstance(value, str) and bool(value), 'Artifact path must be a nonempty string')
    url = urlsplit(value)
    require(not (url.scheme or url.netloc or url.query or url.fragment), 'Artifact path must be local and canonical')
    require(unquote(value) == value and '\\' not in value, 'Artifact path must not be encoded or use backslashes')
    path = PurePosixPath(value)
    require(not path.is_absolute() and '..' not in path.parts and path.as_posix() == value,
            'Artifact path escapes or is not canonical')
    return value


def bound_file(root, relative):
    relative_path(relative)
    target = (root / relative).resolve()
    require(target.is_relative_to(root.resolve()) and target.is_file(), 'Artifact is missing or escapes publication')
    return target


def sha_value(value):
    require(isinstance(value, str) and re.fullmatch(r'[0-9a-f]{64}', value), 'Expected a lowercase SHA256')
    return value


def hash_map(value):
    require(isinstance(value, dict) and bool(value), 'Artifact hashes must be a nonempty object')
    for relative, expected in value.items():
        relative_path(relative)
        sha_value(expected)
    return value


def load_json(path):
    def unique(pairs):
        result = {}
        for key, value in pairs:
            require(key not in result, 'Duplicate JSON key')
            result[key] = value
        return result
    return json.loads(path.read_text('utf-8-sig'), object_pairs_hook=unique)


def model_identifier(value):
    require(isinstance(value, str) and len(value) <= 80
            and re.fullmatch(r'[a-z0-9][a-z0-9._-]*(?:/[a-z0-9][a-z0-9._-]*)*', value),
            'Invalid production model identifier')
    return value


def check_provenance(root, case_id, records):
    for relative, expected in hash_map(records).items():
        require(relative.endswith('.json'), 'Current provenance must be factual JSON')
        path = bound_file(root, relative)
        require(path.stat().st_size <= 65536 and digest(path) == expected, 'Current provenance hash or size differs')
        proof = load_json(path)
        require(isinstance(proof, dict) and set(proof) == {'schema_version', 'case_id', 'records'},
                'Unexpected public provenance fields')
        require(type(proof['schema_version']) is int and proof['schema_version'] == 1 and proof['case_id'] == case_id,
                'Current provenance belongs to another schema or case')
        rows = proof['records']
        require(isinstance(rows, list) and 3 <= len(rows) <= 16, 'Current provenance records missing')
        roles = set()
        for row in rows:
            require(isinstance(row, dict), 'Provenance record must be an object')
            role = row.get('role')
            require(role in {'visual-execution', 'copy-execution', 'media-verification', 'runtime-evidence', 'source-evidence'}
                    and role not in roles, 'Unknown or duplicate provenance role')
            roles.add(role)
            author = role in {'visual-execution', 'copy-execution'}
            selection_fields = {'role', 'sha256', 'selected_alias', 'configured_api_model_id', 'identity_evidence'}
            selection_only = role == 'copy-execution'
            expected_fields = selection_fields if selection_only else ({'role', 'sha256', 'requested', 'reported'} if author else {'role', 'sha256'})
            require(set(row) == expected_fields,
                    'Public provenance cannot include raw logs or private fields')
            sha_value(row['sha256'])
            if selection_only:
                model_identifier(row['selected_alias'])
                model_identifier(row['configured_api_model_id'])
                require(row['identity_evidence'] == 'runtime-catalog-selection-and-provider-mapping',
                        'Unsupported selection-only identity evidence')
            elif author:
                model = model_identifier(row['requested'])
                require(row['reported'] == [model], 'Current production model lacks exact execution proof')
                if role == 'visual-execution':
                    require(model == 'claude-opus-5-5', 'Unexpected current visual production model')
        require({'visual-execution', 'copy-execution', 'media-verification'} <= roles,
                'Current authorship or media verification evidence missing')


MEDIA_FIELDS = ('video', 'poster', 'video_landscape', 'video_portrait', 'poster_landscape',
                'poster_portrait', 'video_source', 'video_download_landscape', 'video_download_portrait')


def owned_media_prefix(root, case):
    value = relative_path(case['video'])
    parent = PurePosixPath(value).parent.as_posix()
    if not parent.startswith('media/') or parent == 'media/downloads':
        return None
    prefix = parent + '/'
    # A directory referenced by another case is shared, not a new-case scope grant.
    for path in (root / 'data/cases').glob('*.json'):
        sibling = load_json(path)
        if sibling.get('id') == case['id']:
            continue
        for key in MEDIA_FIELDS:
            target = sibling.get(key)
            if isinstance(target, str) and target.startswith(prefix):
                return None
    return prefix


def allowed_addition(relative, case, media_prefix):
    case_id = case['id']
    if relative == f'data/cases/{case_id}.json' or relative.startswith(f'examples/{case_id}/'):
        return True
    # Exact references are case-bound. Shared media directories confer no scope.
    for key in MEDIA_FIELDS:
        value = case.get(key)
        if not isinstance(value, str):
            continue
        url = urlsplit(value)
        if url.scheme or url.netloc:
            continue
        relative_path(value)
        if relative == value:
            return True
    return bool(media_prefix and relative.startswith(media_prefix))


def check_production_artifacts(root, case, legacy_path, legacy, maintenance=None):
    """Legacy model/upstream/runtime checks remain in check.py, for both modes."""
    root = Path(root)
    case_id = case['id']
    require(isinstance(case_id, str) and re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*', case_id), 'Invalid case id')
    artifacts = hash_map(legacy['artifacts_sha256'])
    baseline_path = Path(legacy_path)
    current_path = root / 'data/production' / (case_id + '-current.json')
    if current_path.exists() or current_path.is_symlink():
        current = load_json(bound_file(root, f'data/production/{case_id}-current.json'))
        require(isinstance(current, dict) and set(current) == {
            'schema_version', 'case_id', 'legacy_record', 'case_record',
            'artifacts_sha256', 'provenance_artifacts_sha256'}, 'Unexpected current production fields')
        require(type(current['schema_version']) is int and current['schema_version'] == 1
                and current['case_id'] == case_id, 'Current production belongs to another schema or case')
        for key, relative in (('legacy_record', f'data/production/{case_id}.json'),
                              ('case_record', f'data/cases/{case_id}.json')):
            binding = current[key]
            require(isinstance(binding, dict) and set(binding) == {'path', 'sha256'}
                    and binding['path'] == relative, 'Current record binding points to another case or source')
            path = bound_file(root, relative)
            require(digest(path) == sha_value(binding['sha256']), 'Current record source binding changed')
            if key == 'legacy_record':
                require(path == Path(legacy_path).resolve() and load_json(path) == legacy,
                        'Legacy production input differs from its bound record')
            else:
                require(load_json(path) == case, 'Published aggregate case differs from bound case record')
        current_artifacts = hash_map(current['artifacts_sha256'])
        require(set(artifacts) <= set(current_artifacts), 'Current proof dropped legacy artifact keys')
        media_prefix = owned_media_prefix(root, case)
        for relative in current_artifacts.keys() - artifacts.keys():
            require(allowed_addition(relative, case, media_prefix), 'Current proof includes an unrelated case artifact')
        case_relative = current['case_record']['path']
        require(current_artifacts.get(case_relative) == current['case_record']['sha256'],
                'Current case metadata is not pinned as an artifact')
        provenance = hash_map(current['provenance_artifacts_sha256'])
        require(all(current_artifacts.get(p) == h for p, h in provenance.items()),
                'Current provenance is outside the pinned artifact set')
        check_provenance(root, case_id, provenance)
        artifacts = current_artifacts
        baseline_path = current_path
    if maintenance is None:
        from mechanical_maintenance import MechanicalMaintenance
        cases = [load_json(p) for p in sorted((root / 'data/cases').glob('*.json'))]
        maintenance = MechanicalMaintenance(root, cases)
    artifacts = maintenance.apply(case, legacy_path, legacy, artifacts, baseline_path)
    for relative, expected in artifacts.items():
        require(digest(bound_file(root, relative)) == expected, f'Artifact changed since verification: {relative}')
    return artifacts


def check_download_provenance(root, case, asset):
    """Old rows remain valid; new provenance metadata is strict when present."""
    if 'provenance_path' in asset or 'provenance_sha256' in asset:
        relative = relative_path(asset.get('provenance_path'))
        require(allowed_addition(relative, case, owned_media_prefix(Path(root), case)),
                'Download provenance belongs to another case')
        check_provenance(Path(root), case['id'], {relative: asset.get('provenance_sha256')})


def probe_video(path):
    value = json.loads(subprocess.check_output([
        'ffprobe', '-v', 'error', '-select_streams', 'v:0',
        '-show_entries', 'stream=width,height:format=duration', '-of', 'json', str(path)],
        encoding='utf-8'))
    require(len(value.get('streams', [])) == 1, 'Expected one download video stream')
    stream = value['streams'][0]
    return stream['width'], stream['height'], float(value['format']['duration'])


def check_download_asset(root, case, asset, probe=probe_video):
    """Retain v4 downloads, or verify a separately authored, five-role media bundle."""
    root = Path(root)
    orientation = asset.get('orientation')
    require(asset.get('case_id') == case['id'] and orientation in {'landscape', 'portrait'},
            'Download identity belongs to another case or orientation')
    require(asset.get('source') == case.get('video_' + orientation)
            and asset.get('path') == case.get('video_download_' + orientation),
            'Download does not bind the canonical source and destination')
    for key, hash_key in (('source', 'source_sha256'), ('path', 'sha256')):
        require(digest(bound_file(root, asset[key])) == sha_value(asset.get(hash_key)),
                'Download source or result changed after verification')
    check_download_provenance(root, case, asset)
    if asset.get('spec') == 'credit-footer-english-v4':
        return 'credit-footer-english-v4'
    require(set(asset) == {'case_id', 'orientation', 'source', 'source_sha256', 'path',
                           'sha256', 'provenance_path', 'provenance_sha256',
                           'width', 'height', 'duration'},
            'Unprovenanced download requires the v4 credit specification')
    prefix = owned_media_prefix(root, case)
    require(prefix and asset['source'].startswith(prefix) and asset['path'].startswith(prefix),
            'Custom rendered download is outside its exclusive case media scope')
    provenance = load_json(bound_file(root, asset['provenance_path']))
    require({row['role'] for row in provenance['records']} == {
        'visual-execution', 'copy-execution', 'media-verification', 'runtime-evidence', 'source-evidence'},
        'Custom rendered download requires all five public provenance roles')
    source = probe(bound_file(root, asset['source']))
    result = probe(bound_file(root, asset['path']))
    require(type(asset['width']) is int and type(asset['height']) is int
            and (asset['width'], asset['height']) == result[:2]
            and type(asset['duration']) in (int, float) and math.isfinite(asset['duration'])
            and abs(asset['duration'] - result[2]) <= 0.1,
            'Custom rendered download metadata differs from the actual file')
    require(source[:2] == result[:2] and all(type(v) is int and v >= 540 for v in result[:2]),
            'Custom rendered download dimensions differ or are too small')
    require((result[1] > result[0]) == (orientation == 'portrait'),
            'Custom rendered download orientation differs')
    require(source[2] >= 20 and result[2] >= 20 and abs(source[2] - result[2]) <= 0.1,
            'Custom rendered download duration differs or is too short')
    return 'provenance-rendered'


def verified_download_records(root, case, provenance_path):
    """Collect existing-file metadata only; do not render, infer or write a manifest."""
    root = Path(root)
    provenance_path = relative_path(provenance_path)
    provenance_sha256 = digest(bound_file(root, provenance_path))
    provenance_fields = {'provenance_path': provenance_path, 'provenance_sha256': provenance_sha256}
    check_download_provenance(root, case, provenance_fields)
    result = []
    for orientation in ('landscape', 'portrait'):
        source = relative_path(case['video_' + orientation])
        destination = relative_path(case['video_download_' + orientation])
        require(source != destination, 'Credited source and download must remain separate files')
        result.append({'case_id': case['id'], 'orientation': orientation,
                       'source': source, 'source_sha256': digest(bound_file(root, source)),
                       'path': destination, 'sha256': digest(bound_file(root, destination)),
                       **provenance_fields})
    return result


def merge_download_records(manifest, case, replacements):
    """Return a new manifest; keep replaced rows verbatim in history_assets."""
    require(isinstance(manifest, dict) and type(manifest.get('schema_version')) is int and manifest['schema_version'] == 1
            and isinstance(manifest.get('assets'), list), 'Invalid download manifest')
    rows = manifest['assets']
    require(all(isinstance(row, dict) for row in rows), 'Invalid download asset record')
    keys = [(row.get('case_id'), row.get('orientation')) for row in rows]
    require(len(keys) == len(set(keys)), 'Duplicate download asset identity')
    require(isinstance(replacements, list) and len(replacements) == 2, 'Both credited variants are required')
    require(all(isinstance(row, dict) for row in replacements), 'Invalid replacement download record')
    by_orientation = {row.get('orientation'): row for row in replacements}
    require(set(by_orientation) == {'landscape', 'portrait'}, 'Duplicate or missing credited orientation')
    require({row.get('orientation') for row in rows if row.get('case_id') == case['id']}
            == {'landscape', 'portrait'}, 'Legacy credited pair is missing')
    for orientation, row in by_orientation.items():
        require(row.get('case_id') == case['id'] and row.get('source') == case['video_' + orientation]
                and row.get('path') == case['video_download_' + orientation],
                'Replacement download does not bind the current case source and destination')
        for field in ('source_sha256', 'sha256', 'provenance_sha256'):
            sha_value(row.get(field))
        relative_path(row.get('provenance_path'))
    result = copy.deepcopy(manifest)
    history = result.setdefault('history_assets', [])
    require(isinstance(history, list), 'Invalid download history')
    for index, row in enumerate(rows):
        if row.get('case_id') != case['id']:
            continue
        replacement = by_orientation[row['orientation']]
        if row != replacement:
            history.append(copy.deepcopy(row))
            result['assets'][index] = copy.deepcopy(replacement)
    return result
