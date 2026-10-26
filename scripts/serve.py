"""Loopback preview with byte ranges so MP4 playback and seeking work locally."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import argparse
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1] / 'dist'


class Handler(SimpleHTTPRequestHandler):
    def send_head(self):
        path = Path(self.translate_path(self.path)).resolve()
        if not path.is_relative_to(ROOT.resolve()):
            self.send_error(403)
            return None
        if path.is_dir():
            path /= 'index.html'
        if not path.is_file():
            self.send_error(404)
            return None
        size = path.stat().st_size
        start, end = 0, size - 1
        value = self.headers.get('Range')
        if value:
            match = re.fullmatch(r'bytes=(\d*)-(\d*)', value)
            if not match or not any(match.groups()):
                self.send_error(416)
                return None
            first, last = match.groups()
            if first:
                start = int(first)
                end = min(int(last), size - 1) if last else size - 1
            else:
                start = max(0, size - int(last))
            if start > end or start >= size:
                self.send_response(416)
                self.send_header('Content-Range', f'bytes */{size}')
                self.end_headers()
                return None
        source = path.open('rb')
        source.seek(start)
        self.remaining = end - start + 1
        self.send_response(206 if value else 200)
        self.send_header('Content-Type', self.guess_type(str(path)))
        self.send_header('Content-Length', str(self.remaining))
        self.send_header('Accept-Ranges', 'bytes')
        self.send_header('Cache-Control', 'no-store')
        if value:
            self.send_header('Content-Range', f'bytes {start}-{end}/{size}')
        self.end_headers()
        return source

    def copyfile(self, source, outputfile):
        remaining = self.remaining
        try:
            while remaining:
                block = source.read(min(remaining, 1024 * 1024))
                if not block:
                    break
                outputfile.write(block)
                remaining -= len(block)
        except (BrokenPipeError, ConnectionResetError):
            pass


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--port', type=int, default=8856)
    args = parser.parse_args()
    if not (ROOT / 'index.html').is_file():
        raise SystemExit('Run python scripts/build.py first.')
    server = ThreadingHTTPServer(('127.0.0.1', args.port), partial(Handler, directory=str(ROOT)))
    print(f'Yaoyorozu AI ToolBox preview: http://127.0.0.1:{args.port}/', flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == '__main__':
    main()
