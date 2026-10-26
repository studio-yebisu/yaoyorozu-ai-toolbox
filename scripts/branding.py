"""Current display name; original copyright notices stay intact."""
import json
from pathlib import Path
import re

SITE_NAME = json.loads((Path(__file__).resolve().parents[1] / 'data/projects.json').read_text('utf-8'))['title']
SITE_READING = 'Yaoyorozu AI ToolBox'

_OLD_NAME = re.compile(r'Yaoyorozu[ -]AI[ \t]+Toolbox|Studio[ \t]*Yebisu|スタジオ[・ ]?エビス', re.IGNORECASE)
_ATTRIBUTION = re.compile(
    r'(?:(?:Copyright\s*(?:\(c\)|©)?|©)\s*2026\s*Studio[ \t]*Yebisu'
    r'|Motion Reel（Studio Yebisu、MIT）)',
    re.IGNORECASE,
)


def rebrand_site_text(text):
    """Adapt the site's labels without rewriting author credits in imported guides."""
    parts, start = [], 0
    for match in _ATTRIBUTION.finditer(text):
        parts.extend((_OLD_NAME.sub(SITE_NAME, text[start:match.start()]), match.group()))
        start = match.end()
    parts.append(_OLD_NAME.sub(SITE_NAME, text[start:]))
    return ''.join(parts)
