"""Create the source archive using only Python's standard library."""
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile
from hashlib import sha256
from shutil import copyfile
import json

root = Path(__file__).resolve().parent.parent
files = [root / name for name in (
    'manifest.json', 'background.js', 'settings.js', 'main.js',
    'popup.html', 'popup.css', 'popup.js', 'i18n.js', 'README.md', 'CHANGELOG.md', 'package.json', '.gitignore'
)]
for folder in ('icons', 'tools', 'test-site', 'tests', 'verification'):
    files.extend(p for p in (root / folder).rglob('*') if p.is_file() and '__pycache__' not in p.parts)
archive = root / 'FakeTL.zip'
with ZipFile(archive, 'w', ZIP_DEFLATED) as z:
    for file in sorted(files):
        z.write(file, file.relative_to(root).as_posix())
with ZipFile(archive) as z:
    assert z.testzip() is None
    assert 'manifest.json' in z.namelist()
    assert all(not n.startswith(('.git/', '.test-profile/', 'node_modules/')) for n in z.namelist())
    manifest = json.loads(z.read('manifest.json'))
    for size, name in manifest['icons'].items():
        assert name in z.namelist()
        assert z.read(name).startswith(b'\x89PNG\r\n\x1a\n')
    assert manifest['version'] == json.loads(z.read('package.json'))['version']
print(f'{archive}: {len(files)} files, {archive.stat().st_size} bytes')
release_dir = root / 'releases'
release_dir.mkdir(exist_ok=True)
release_zip = release_dir / f"FakeTL-{manifest['version']}.zip"
copyfile(archive, release_zip)
checksum = sha256(release_zip.read_bytes()).hexdigest()
release_zip.with_suffix('.zip.sha256').write_text(f'{checksum}  {release_zip.name}\n', encoding='ascii')
print(f'{release_zip.name}: SHA-256 {checksum}')
