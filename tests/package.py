"""Create the source archive using only Python's standard library."""
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile

root = Path(__file__).resolve().parent.parent
files = [root / name for name in (
    'manifest.json', 'background.js', 'settings.js', 'main.js',
    'popup.html', 'popup.css', 'popup.js', 'i18n.js', 'README.md', 'package.json', '.gitignore'
)]
for folder in ('test-site', 'tests', 'verification'):
    files.extend(p for p in (root / folder).rglob('*') if p.is_file() and '__pycache__' not in p.parts)
archive = root / 'FakeTL.zip'
with ZipFile(archive, 'w', ZIP_DEFLATED) as z:
    for file in sorted(files):
        z.write(file, file.relative_to(root).as_posix())
with ZipFile(archive) as z:
    assert z.testzip() is None
    assert 'manifest.json' in z.namelist()
    assert all(not n.startswith(('.git/', '.test-profile/', 'node_modules/')) for n in z.namelist())
print(f'{archive}: {len(files)} files, {archive.stat().st_size} bytes')
