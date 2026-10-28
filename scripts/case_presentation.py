"""Pure, explicit primary-video presentation; canonical variants remain evidence."""
import copy
import json
from pathlib import PurePosixPath
from urllib.parse import urlsplit

from production_records import relative_path


ORIENTATION_FIELDS = ('video_landscape', 'video_portrait', 'poster_landscape', 'poster_portrait')
# Opt-in launch presentation. Absent fields leave a case exactly as before.
LAUNCH_HOSTS = {'github.com': '/studio-yebisu/', 'studio-yebisu.github.io': '/'}
SHARE_MODES = {'primary-current'}
SHARE_COPY_FIELDS = {'save_label', 'intro_copy_label', 'intro_summary_label', 'share_note'}


def _primary_path(value, field, suffixes):
    relative_path(value)
    if any(ord(ch) < 32 or ord(ch) == 127 for ch in value) or value != value.strip():
        raise ValueError(f'Invalid primary {field} path')
    path = PurePosixPath(value)
    if not value.startswith('media/') or path.suffix.lower() not in suffixes:
        raise ValueError(f'Invalid primary {field} media reference')


def _text(value, field, limit):
    if (not isinstance(value, str) or not value.strip() or value != value.strip() or len(value) > limit
            or any(ord(ch) < 32 or ord(ch) == 127 for ch in value)):
        raise ValueError(f'Invalid launch text: {field}')


def _launch_href(value, field):
    if not isinstance(value, str) or any(ord(ch) < 33 or ord(ch) == 127 for ch in value) or '\\' in value:
        raise ValueError(f'Invalid launch link: {field}')
    url = urlsplit(value)
    if url.scheme or url.netloc:
        prefix = LAUNCH_HOSTS.get(url.hostname or '')
        if (url.scheme != 'https' or prefix is None or url.netloc != url.hostname
                or not url.path.startswith(prefix) or url.query or url.fragment):
            raise ValueError(f'Launch link must be an approved https URL: {field}')
    else:
        relative_path(value)


def _rows(case, field, keys, limit):
    rows = case[field]
    if not isinstance(rows, list) or not 1 <= len(rows) <= limit:
        raise ValueError(f'{field} must be a short nonempty list')
    for index, row in enumerate(rows):
        if not isinstance(row, dict) or set(row) != keys:
            raise ValueError(f'Unexpected {field} fields')
        _text(row['label'], f'{field}[{index}].label', 40)
        _launch_href(row['href'], f'{field}[{index}].href')
        if 'note' in row:
            _text(row['note'], f'{field}[{index}].note', 120)
    return rows


def validate_launch(case):
    """Fail closed on any present launch field; never relax media/proof/download checks."""
    actions = None
    if 'primary_actions' in case:
        # src/case-launch.js attaches through the primary video's share widget.
        if case.get('video_primary') is not True:
            raise ValueError('primary_actions requires video_primary')
        actions = _rows(case, 'primary_actions', {'kind', 'label', 'href'}, 4)
        kinds = [row['kind'] for row in actions]
        if kinds[0] != 'primary' or kinds.count('primary') != 1 or not set(kinds) <= {'primary', 'secondary'}:
            raise ValueError('primary_actions needs exactly one leading primary action')
    if 'primary_actions_note' in case:
        if actions is None:
            raise ValueError('primary_actions_note requires primary_actions')
        _text(case['primary_actions_note'], 'primary_actions_note', 200)
    if 'app_downloads' in case:
        downloads = _rows(case, 'app_downloads', {'label', 'note', 'href'}, 4)
        if actions is None or downloads[0]['href'] != actions[0]['href']:
            raise ValueError('First app download must be the primary action')
    share = 'video_share_mode' in case or 'video_share_copy' in case
    if share:
        if case.get('video_share_mode') not in SHARE_MODES or case.get('video_primary') is not True:
            raise ValueError('video_share_mode requires a known mode and video_primary')
        labels = case.get('video_share_copy')
        if not isinstance(labels, dict) or set(labels) != SHARE_COPY_FIELDS:
            raise ValueError('Unexpected video_share_copy fields')
        for key in sorted(SHARE_COPY_FIELDS):
            _text(labels[key], 'video_share_copy.' + key, 200 if key == 'share_note' else 40)


def project_case(case):
    """Use the generic video fallback only for an explicitly opted-in case."""
    if not isinstance(case, dict):
        raise ValueError('Case must be an object')
    if 'video_primary' in case and type(case['video_primary']) is not bool:
        raise ValueError('video_primary must be a boolean')
    validate_launch(case)
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
