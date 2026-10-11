#!/usr/bin/env sh
set -eu
printf '%s\n' 'Checking PHP syntax...'
php -l api/index.php
printf '%s\n' 'Checking JavaScript syntax...'
if command -v node >/dev/null 2>&1; then
  find js -type f -name '*.js' -print | while IFS= read -r file; do node --check "$file"; done
else
  echo 'Node.js not found; skipped JavaScript syntax checks.'
fi
printf '%s\n' 'Checking local script/style references...'
python3 - <<'PY'
from pathlib import Path
import re, sys
root=Path('.')
missing=[]
for html in root.glob('*.html'):
    text=html.read_text(errors='ignore')
    for path in re.findall(r'(?:src|href)=["\']([^"\']+)["\']', text):
        if path.startswith(('http://','https://','#','data:','javascript:','${')): continue
        path=path.split('?',1)[0]
        if not path or path.startswith('mailto:'): continue
        if not (root/path).exists() and not path.startswith('/'): missing.append(f'{html}: {path}')
if missing:
    print('\n'.join(missing)); sys.exit(1)
print('Local HTML src/href references found on disk.')
PY
printf '%s\n' 'Basic checks completed. Runtime/database/workflow tests still required.'
