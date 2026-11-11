"""Read-only HTTP byte verification of an already built, isolated pilot."""
import argparse
import concurrent.futures
import hashlib
import json
from pathlib import Path
from urllib.parse import quote
from urllib.request import urlopen, Request

parser = argparse.ArgumentParser()
parser.add_argument('--directory', required=True)
parser.add_argument('--url', required=True)
parser.add_argument('--report', required=True)
args = parser.parse_args()
root = Path(args.directory).resolve()
manifest = json.loads((root / 'pilot-manifest.json').read_text())
paths = sorted(p.relative_to(root).as_posix() for p in root.rglob('*') if p.is_file())

def check(relative):
    url = args.url.rstrip('/') + '/' + quote(relative, safe='/')
    expected = (root / relative).read_bytes()
    with urlopen(Request(url, headers={'Cache-Control': 'no-cache'}), timeout=45) as response:
        actual = response.read()
        result = {'path': relative, 'status': response.status,
                  'sha256': hashlib.sha256(actual).hexdigest(),
                  'expectedSha256': hashlib.sha256(expected).hexdigest(),
                  'contentType': response.headers.get('Content-Type')}
        if response.status != 200 or expected != actual:
            raise AssertionError(json.dumps(result))
        return result

with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
    results = list(pool.map(check, paths))
report = {'url': args.url, 'sourceSha': manifest['sourceSha'],
          'sourceDirty': manifest['sourceDirty'], 'filesVerified': len(results),
          'httpBytesMatch': True, 'supabaseContacted': False, 'results': results}
Path(args.report).parent.mkdir(parents=True, exist_ok=True)
Path(args.report).write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps({key: value for key, value in report.items() if key != 'results'}))
