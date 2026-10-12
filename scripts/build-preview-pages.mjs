import fs from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const output = path.join(root, '.pages-preview-dist');
const basePath = '/wasou-lp-b-preview';
const ignoredNames = new Set(['.git', '.github', 'node_modules', '.pages-preview-dist']);

const shouldCopy = source => {
  const relative = path.relative(root, source);
  if (!relative) return true;
  return !relative.split(path.sep).some(part => ignoredNames.has(part));
};

const copyDirectory = async (source, destination) => {
  await fs.mkdir(destination, { recursive: true });
  for (const entry of await fs.readdir(source, { withFileTypes: true })) {
    const sourcePath = path.join(source, entry.name);
    const destinationPath = path.join(destination, entry.name);
    if (!shouldCopy(sourcePath)) continue;
    if (entry.isDirectory()) await copyDirectory(sourcePath, destinationPath);
    else if (entry.isSymbolicLink()) await fs.symlink(await fs.readlink(sourcePath), destinationPath);
    else await fs.copyFile(sourcePath, destinationPath);
  }
};

const walk = async directory => {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(target));
    else files.push(target);
  }
  return files;
};

const prefixRootPaths = source => source
  .replace(/((?:href|src|action|poster)=["'])\/(?!\/|wasou-lp-b-preview\/)/g, `$1${basePath}/`)
  .replace(/(url\(\s*["']?)\/(?!\/|wasou-lp-b-preview\/)/g, `$1${basePath}/`);

await fs.rm(output, { recursive: true, force: true });
await copyDirectory(root, output);

let transformed = 0;
for (const file of await walk(output)) {
  if (!/\.(?:html|css)$/i.test(file)) continue;
  const source = await fs.readFile(file, 'utf8');
  const updated = prefixRootPaths(source);
  if (updated === source) continue;
  await fs.writeFile(file, updated, 'utf8');
  transformed += 1;
}

console.log(`Prepared fixed GitHub Pages preview at ${output} (${transformed} HTML/CSS file(s) rewritten).`);
