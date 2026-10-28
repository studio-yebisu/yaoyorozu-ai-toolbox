"""Regression checks for the staged, retention-preserving publication into dist/."""
import json
import os
import tempfile
import unittest
from pathlib import Path

import build

COUNTS = {'cases': 0, 'social_pages': 0, 'unified_pages': 0}


def stub_render(files):
    """Return a render callback that materializes exactly the given allowlist."""
    def render(staging):
        staging = Path(staging)
        for relative, content in files.items():
            path = staging / relative
            path.parent.mkdir(parents=True, exist_ok=True)
            if isinstance(content, bytes):
                path.write_bytes(content)
            else:
                path.write_text(content, 'utf-8')
        return dict(COUNTS)
    return render


class PublicationFixture(unittest.TestCase):
    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self._tmp.cleanup)
        self.root = Path(self._tmp.name)
        self.dist = self.root / 'dist'

    def archives(self):
        history = self.root / '.local' / 'build-history'
        return sorted(history.iterdir()) if history.is_dir() else []

    def stagings(self):
        folder = self.root / '.local' / 'build-staging'
        return sorted(folder.iterdir()) if folder.is_dir() else []


class ObsoleteOutputTests(PublicationFixture):
    def test_private_and_stale_files_stay_out_of_the_publication_but_are_preserved(self):
        (self.dist / 'reviews').mkdir(parents=True)
        (self.dist / 'reviews' / 'private-review.html').write_text('<private review>', 'utf-8')
        (self.dist / 'media').mkdir(parents=True)
        stale_movie = b'\x00' * 1024 + b'stale duplicate movie'
        (self.dist / 'media' / 'duplicate-movie.mp4').write_bytes(stale_movie)
        (self.dist / 'index.html').write_text('old home', 'utf-8')

        def render(staging):
            (Path(staging) / 'index.html').write_text('new home', 'utf-8')
            return dict(COUNTS)

        build.build(self.root, render=render)

        self.assertEqual((self.dist / 'index.html').read_text('utf-8'), 'new home')
        self.assertFalse((self.dist / 'reviews' / 'private-review.html').exists(),
                         'private review page leaked into the new publication')
        self.assertFalse((self.dist / 'media' / 'duplicate-movie.mp4').exists(),
                         'stale movie leaked into the new publication')
        archives = self.archives()
        self.assertEqual(len(archives), 1)
        archive = archives[0]
        self.assertEqual((archive / 'reviews' / 'private-review.html').read_text('utf-8'), '<private review>')
        self.assertEqual((archive / 'media' / 'duplicate-movie.mp4').read_bytes(), stale_movie)
        manifest = json.loads((archive / 'build-history.json').read_text('utf-8'))
        self.assertEqual(
            sorted(manifest['retained_files']),
            ['index.html', 'media/duplicate-movie.mp4', 'reviews/private-review.html'],
        )

    def test_changed_old_file_is_preserved_in_private_history(self):
        (self.dist / 'data').mkdir(parents=True)
        (self.dist / 'data' / 'catalog.json').write_text('{"catalog": "old"}', 'utf-8')

        build.build(self.root, render=stub_render({'data/catalog.json': '{"catalog": "new"}'}))

        self.assertEqual((self.dist / 'data' / 'catalog.json').read_text('utf-8'), '{"catalog": "new"}')
        archives = self.archives()
        self.assertEqual(len(archives), 1)
        self.assertEqual((archives[0] / 'data' / 'catalog.json').read_text('utf-8'), '{"catalog": "old"}')

    def test_byte_identical_files_are_deduplicated_across_rebuilds(self):
        files = {'index.html': 'same home', 'media/movie.mp4': b'\x01' * 300000}
        counts = build.build(self.root, render=stub_render(files))
        self.assertEqual(counts, COUNTS)
        self.assertEqual(self.archives(), [], 'first build has no previous publication to retain')
        self.assertEqual((self.dist / 'media' / 'movie.mp4').read_bytes(), b'\x01' * 300000)

        build.build(self.root, render=stub_render(files))
        build.build(self.root, render=stub_render(files))

        archives = self.archives()
        self.assertEqual(len(archives), 2)
        for archive in archives:
            self.assertEqual([p.name for p in archive.iterdir()], ['build-history.json'])
            self.assertLess((archive / 'build-history.json').stat().st_size, 4096)
            manifest = json.loads((archive / 'build-history.json').read_text('utf-8'))
            self.assertEqual(manifest['retained_files'], [])
        self.assertEqual((self.dist / 'media' / 'movie.mp4').read_bytes(), b'\x01' * 300000)

    def test_render_refuses_a_non_empty_target(self):
        occupied = self.root / 'occupied'
        occupied.mkdir()
        (occupied / 'stale.txt').write_text('stale', 'utf-8')
        with self.assertRaises(ValueError):
            build.render_publication(occupied, root=self.root)


class FailureHandlingTests(PublicationFixture):
    def test_failed_render_leaves_previous_dist_intact(self):
        self.dist.mkdir()
        (self.dist / 'keep.txt').write_text('previous', 'utf-8')

        def render(staging):
            (Path(staging) / 'partial.txt').write_text('partial', 'utf-8')
            raise RuntimeError('render exploded')

        with self.assertRaises(RuntimeError):
            build.build(self.root, render=render)

        self.assertEqual((self.dist / 'keep.txt').read_text('utf-8'), 'previous')
        self.assertFalse((self.dist / 'partial.txt').exists())
        self.assertEqual(self.archives(), [])
        stagings = self.stagings()
        self.assertEqual(len(stagings), 1)
        self.assertEqual((stagings[0] / 'partial.txt').read_text('utf-8'), 'partial')

    def test_failed_swap_restores_the_previous_dist(self):
        self.dist.mkdir()
        (self.dist / 'keep.txt').write_text('previous', 'utf-8')
        real_rename = build._rename
        failed = {'done': False}

        def flaky_rename(source, destination):
            if Path(destination).resolve() == self.dist.resolve() and not failed['done']:
                failed['done'] = True
                raise OSError('simulated staging swap failure')
            real_rename(source, destination)

        self.addCleanup(setattr, build, '_rename', real_rename)
        build._rename = flaky_rename
        with self.assertRaises(RuntimeError) as caught:
            build.build(self.root, render=stub_render({'index.html': 'new home'}))

        self.assertIn('restored', str(caught.exception))
        self.assertEqual((self.dist / 'keep.txt').read_text('utf-8'), 'previous')
        self.assertFalse((self.dist / 'index.html').exists())
        self.assertEqual(self.archives(), [], 'rollback moved the archive back to dist')
        stagings = self.stagings()
        self.assertEqual(len(stagings), 1)
        self.assertEqual((stagings[0] / 'index.html').read_text('utf-8'), 'new home')

    def test_swap_failure_without_rollback_keeps_previous_output_in_history(self):
        self.dist.mkdir()
        (self.dist / 'keep.txt').write_text('previous', 'utf-8')
        real_rename = build._rename

        def failing_rename(source, destination):
            if Path(destination).resolve() == self.dist.resolve():
                raise OSError('simulated swap failure')
            real_rename(source, destination)

        self.addCleanup(setattr, build, '_rename', real_rename)
        build._rename = failing_rename
        with self.assertRaises(RuntimeError) as caught:
            build.build(self.root, render=stub_render({'index.html': 'new home'}))

        self.assertIn('preserved at', str(caught.exception))
        archives = self.archives()
        self.assertEqual(len(archives), 1)
        self.assertEqual((archives[0] / 'keep.txt').read_text('utf-8'), 'previous')
        self.assertFalse((self.dist / 'index.html').exists())

    def test_symlink_in_existing_dist_aborts_the_publish(self):
        self.dist.mkdir(parents=True)
        (self.dist / 'index.html').write_text('previous', 'utf-8')
        try:
            os.symlink('index.html', self.dist / 'linked.html')
        except (OSError, NotImplementedError):
            self.skipTest('symlinks are unavailable on this platform')
        with self.assertRaises(ValueError):
            build.build(self.root, render=stub_render({'index.html': 'new home'}))
        self.assertEqual((self.dist / 'index.html').read_text('utf-8'), 'previous')
        self.assertEqual(self.archives(), [])
        self.assertEqual(len(self.stagings()), 1)


if __name__ == '__main__':
    unittest.main()
