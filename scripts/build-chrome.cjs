const fs = require('node:fs/promises');
const path = require('node:path');
const { default: zip } = require('bestzip');
const AdmZip = require('adm-zip');

async function build() {
  const destination = path.resolve('dist/chrome/extension.zip');
  await fs.mkdir(path.dirname(destination), { recursive: true });
  await fs.rm(destination, { force: true });
  await zip({ cwd: path.resolve('extension'), source: '*', destination, followSymLinks: false });
  const archive = new AdmZip(destination);
  const manifest = archive.getEntry('manifest.json');
  if (!manifest || !JSON.parse(manifest.getData().toString()).manifest_version) {
    throw new Error('Chrome archive must contain manifest.json at its root');
  }
  if (archive.getEntries().some(({ entryName }) => entryName.startsWith('extension/'))) {
    throw new Error('Chrome archive contains an unexpected extension/ prefix');
  }
}

build().catch((error) => { console.error(error.message); process.exitCode = 1; });
