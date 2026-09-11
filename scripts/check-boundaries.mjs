import { readdir, readFile } from 'node:fs/promises';
const allowed = {
  core: [],
  prefabs: ['@forge/core', 'zod'],
  animation: [
    '@forge/core',
    '@forge/assets',
    '@forge/runtime',
    '@forge/renderer',
    'zod',
  ],
  audio: ['@forge/core', '@forge/assets', '@forge/runtime', 'zod'],
  scripting: [
    '@forge/core',
    '@forge/runtime',
    '@forge/assets',
    '@forge/input',
    '@forge/physics2d',
    '@forge/renderer',
    'typescript',
    'zod',
  ],
  input: ['zod'],
  physics2d: [
    '@forge/core',
    '@forge/runtime',
    'zod',
    '@dimforge/rapier2d-compat',
  ],
  assets: ['@forge/core', 'zod'],
  renderer: ['@forge/core', '@forge/assets', 'zod', 'pixi.js'],
  serialization: [
    '@forge/prefabs',
    '@forge/animation',
    '@forge/audio',
    '@forge/core',
    '@forge/assets',
    '@forge/physics2d',
    '@forge/input',
    'zod',
  ],
  runtime: ['@forge/core'],
  player: [
    '@forge/core',
    '@forge/serialization',
    '@forge/runtime',
    '@forge/renderer',
    '@forge/physics2d',
    '@forge/input',
    '@forge/scripting',
    '@forge/prefabs',
    '@forge/animation',
    '@forge/audio',
    '@forge/assets',
  ],
  editor: [
    '@forge/player',
    '@forge/prefabs',
    '@forge/animation',
    '@forge/audio',
    '@forge/core',
    '@forge/serialization',
    '@forge/runtime',
    '@forge/assets',
    '@forge/renderer',
    '@forge/scripting',
    '@forge/physics2d',
    '@forge/input',
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
