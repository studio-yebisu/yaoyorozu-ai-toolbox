"""Validate the physical specialist repositories inside this local workspace."""
import json
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[1]


def repository_path(project):
    folder = Path(project['folder'])
    if folder.is_absolute() or '..' in folder.parts:
        raise ValueError(f'Repository folder must be relative to Yaoyorozu AI ToolBox: {folder}')
    target = ROOT / folder
    if not target.is_dir():
        raise FileNotFoundError(f'Place the {project["repository"]} repository at {target}')
    resolved = target.resolve(strict=True)
    if target.is_symlink() or resolved != target:
        raise RuntimeError(f'The specialist repository must be a physical directory: {target}')
    if not resolved.is_relative_to(ROOT / 'workspace') or not (resolved / '.git').exists():
        raise RuntimeError(f'Expected an independent Git repository inside workspace: {target}')
    top = Path(subprocess.check_output(
        ['git', '-C', str(resolved), 'rev-parse', '--show-toplevel'], encoding='utf-8').strip()).resolve()
    if top != resolved:
        raise RuntimeError(f'The specialist directory is not its own Git root: {target}')
    return resolved


def main():
    projects = json.loads((ROOT / 'data/projects.json').read_text('utf-8'))['projects']
    result = {project['id']: str(repository_path(project))
              for project in projects if project['id'] != 'agents'}
    (ROOT / '.local').mkdir(exist_ok=True)
    (ROOT / '.local/workspaces.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', 'utf-8')
    print(json.dumps(result, ensure_ascii=False))


if __name__ == '__main__':
    main()
