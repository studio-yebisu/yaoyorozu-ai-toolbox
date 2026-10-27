"""Combine specialist snapshots, curated resources, models, and finished cases."""
import json
from pathlib import Path
import re
from site_structure import unified_url

ROOT = Path(__file__).resolve().parents[1]


def load_categories():
    categories = json.loads((ROOT / 'data/categories.json').read_text('utf-8'))['categories']
    ids = [item['id'] for item in categories]
    if len(ids) != len(set(ids)) or not all(re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*', value) for value in ids):
        raise ValueError('Category ids must be unique lowercase slugs')
    if not all(item.get('label') and item.get('description') for item in categories):
        raise ValueError('Every category needs a label and description')
    return categories


def build_catalog(cases):
    catalog = json.loads((ROOT / 'data/catalog.json').read_text('utf-8'))
    curated = json.loads((ROOT / 'data/curated-resources.json').read_text('utf-8'))
    models = json.loads((ROOT / 'data/open-models.json').read_text('utf-8'))
    catalog['categories'] = load_categories()
    category_ids = {item['id'] for item in catalog['categories']}
    by_id = {}
    for entry in catalog['entries'] + curated['entries'] + model_entries(models):
        if entry['id'] in by_id:
            raise ValueError(f'Duplicate catalog id: {entry["id"]}')
        by_id[entry['id']] = entry
    # Finished cases can replace their earlier catalog record with the complete article.
    for case in cases:
        if case.get('catalog_entry'):
            by_id[case['catalog_entry']['id']] = case['catalog_entry']
    for entry in by_id.values():
        if entry.get('guide_url'):
            entry['guide_url'] = unified_url(entry['guide_url'])
        if entry.get('category') not in category_ids:
            raise ValueError(f'Unknown catalog category: {entry.get("category")}')
        for key in ('id', 'name', 'summary', 'kind', 'source_url', 'license'):
            if not entry.get(key):
                raise ValueError(f'Missing catalog field {key}: {entry.get("id")}')
    catalog['entries'] = list(by_id.values())
    catalog['updated_on'] = max([catalog.get('updated_on', ''), curated.get('updated_on', ''), models.get('updated_on', '')]
                                + [case.get('updated_on', '') for case in cases])
    return catalog


def model_entries(collection):
    """Register tool-focused OpenWeight models; never reintroduce general LLMs."""
    if 'llm_models' in collection or 'llm_guide' in collection:
        raise ValueError('OpenLLM introductions and comparison links are outside the OpenWeight scope')
    entries = []
    for model in collection['models']:
        if model.get('model_axis') != 'task-specialist' or model.get('category') != 'owm-tools':
            raise ValueError(f'Only tool-focused OpenWeight models may enter the catalog: {model.get("id")}')
        entries.append({
            'id': 'owm-' + model['id'],
            'name': model['name'],
            'summary': model['summary'],
            'category': model['category'],
            'kind': 'モデル',
            'resource_type': 'open-weight-model',
            'source_project': 'open-models',
            'source_url': model['sources'][0]['url'],
            'source_commit': model['weights']['revision'],
            'guide_url': 'open-models.html#' + model['id'],
            'license': model['license']['name'],
            'license_url': model['license']['url'],
            'license_note': model['license']['note'],
            'use_case': model['task'] + '。' + model['headline'],
            'tags': ['OpenWeight', model['task'], model['provider']],
            'image': model['concept'],
            'verification_stage': 'model-source-reviewed',
            'verification': 'モデルカード・重みの公開・利用条件を確認。推論は未実行。図は説明用です。',
            'source_note': collection['evidence_note'],
            'requirements': model['requirements'],
        })
    return entries
