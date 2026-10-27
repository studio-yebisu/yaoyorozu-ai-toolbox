"""Pure, explicit primary-video presentation; canonical variants remain evidence."""
import copy
import json
from pathlib import PurePosixPath

from production_records import relative_path


ORIENTATION_FIELDS = ('video_landscape', 'video_portrait', 'poster_landscape', 'poster_portrait')


def _primary_path(value, field, suffixes):
    relative_path(value)
    if any(ord(ch) < 32 or ord(ch) == 127 for ch in value) or value != value.strip():
        raise ValueError(f'Invalid primary {field} path')
    path = PurePosixPath(value)
    if not value.startswith('media/') or path.suffix.lower() not in suffixes:
        raise ValueError(f'Invalid primary {field} media reference')


def project_case(case):
    """Use the generic video fallback only for an explicitly opted-in case."""
    if not isinstance(case, dict):
        raise ValueError('Case must be an object')
    if 'video_primary' in case and type(case['video_primary']) is not bool:
        raise ValueError('video_primary must be a boolean')
    result = copy.deepcopy(case)
    if not case.get('video_primary', False):
        return result
    _primary_path(case.get('video'), 'video', {'.mp4'})
    _primary_path(case.get('poster'), 'poster', {'.png', '.jpg', '.jpeg', '.webp', '.avif'})
    for field in ('video_width', 'video_height'):
        if type(case.get(field)) is not int or case[field] <= 0:
            raise ValueError(f'Primary {field} must be a positive integer')
    for field in ORIENTATION_FIELDS:
        result.pop(field, None)
    return result


def project_cases(cases):
    if not isinstance(cases, list):
        raise ValueError('Canonical cases must be a list')
    return [project_case(case) for case in cases]


def validate_presentation_aggregate(published, canonical):
    """Bind client data to the exact projection; never replace canonical checks."""
    expected = {'cases': project_cases(canonical)}
    # JSON comparison retains scalar types (True must not equal the number 1).
    def encoded(value):
        return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(',', ':'), allow_nan=False)
    if encoded(published) != encoded(expected):
        raise ValueError('Published cases differ from the exact canonical presentation projection')
