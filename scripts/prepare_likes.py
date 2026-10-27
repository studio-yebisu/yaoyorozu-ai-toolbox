"""Generate the server-side allowlist from canonical catalog and case IDs."""
import json
from pathlib import Path
from catalog import build_catalog

ROOT = Path(__file__).resolve().parents[1]


def main():
    cases = [json.loads(p.read_text('utf-8')) for p in sorted((ROOT / 'data/cases').glob('*.json'))]
    ids = {entry['id'] for entry in build_catalog(cases)['entries']}
    ids.update(case.get('catalog_entry', {}).get('id') or 'case-' + case['id'] for case in cases)
    destination = ROOT / 'services/likes/items.json'
    destination.write_text(json.dumps(sorted(ids), ensure_ascii=False, indent=2) + '\n', 'utf-8')
    print(f'Prepared {len(ids)} likeable item IDs')


if __name__ == '__main__':
    main()
