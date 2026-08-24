import { readdir, readFile } from 'node:fs/promises';
const allowed = {
  core: [],
  assets: ['@forge/core', 'zod'],
  renderer: ['@forge/core', '@forge/assets', 'zod', 'pixi.js'],
  serialization: ['@forge/core', '@forge/assets', 'zod'],
  runtime: ['@forge/core'],
  editor: [
    '@forge/core',
    '@forge/serialization',
    '@forge/runtime',
    '@forge/assets',
    '@forge/renderer',
  ],
};
let errors = 0;
for (const [name, dependencies] of Object.entries(allowed)) {
  for (const file of await readdir(`packages/${name}/src`)) {
    if (!file.endsWith('.ts')) continue;
    const text = await readFile(`packages/${name}/src/${file}`, 'utf8');
    for (const match of text.matchAll(
      /(?:from\s*|import\s*\()['"]([^'"]+)['"]/g,
    )) {
      const specifier = match[1];
      if (specifier.startsWith('./') && !specifier.includes('/../')) continue;
      if (
        !dependencies.includes(specifier) &&
        !dependencies.includes(specifier.split('/').slice(0, 2).join('/'))
      ) {
        console.error(`${name}/${file}: forbidden dependency ${specifier}`);
        errors++;
      }
    }
  }
}
if (errors) process.exit(1);
console.log('Package boundaries verified.');
