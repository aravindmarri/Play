import {
  cpSync, existsSync, lstatSync, mkdirSync, readFileSync, readdirSync,
  realpathSync, rmSync, writeFileSync,
} from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const reservedIds = new Set(['assets', 'games', 'site', 'scripts', 'tests', 'docs', 'cname']);
const ignoredNames = new Set(['.git', '.github', 'node_modules']);
const publicFields = [
  'id', 'title', 'subtitle', 'description', 'genre', 'engine', 'playMode',
  'repository', 'ref', 'featured',
];

function requireText(value, name) {
  if (typeof value !== 'string' || !value.trim() || value !== value.trim()) {
    throw new Error(`${name} must be a nonempty string without surrounding spaces.`);
  }
}

export function validateGames(games, siteNames = []) {
  if (!Array.isArray(games) || games.length === 0) throw new Error('Register at least one game.');
  const occupied = new Set([...reservedIds, ...siteNames.map(name => name.toLowerCase())]);
  for (const game of games) {
    if (!game || typeof game !== 'object' || Array.isArray(game)) throw new Error('Invalid game registration.');
    for (const field of publicFields.filter(field => field !== 'featured')) requireText(game[field], field);
    if (!/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(game.id) || /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i.test(game.id)) {
      throw new Error(`Invalid game id: ${game.id}`);
    }
    const id = game.id.toLowerCase();
    if (occupied.has(id)) throw new Error(`Duplicate or reserved game route: ${game.id}`);
    occupied.add(id);
    if (!/^[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?\/[A-Za-z0-9][A-Za-z0-9._-]*$/.test(game.repository)
        || game.repository.endsWith('.git')) {
      throw new Error(`${game.id}: repository must be GitHub owner/repository, without a URL or .git suffix.`);
    }
    if (!/^[A-Za-z0-9][A-Za-z0-9._/-]*$/.test(game.ref)
        || game.ref.includes('..') || game.ref.includes('//')
        || game.ref.split('/').some(part => !part || part.startsWith('.') || part.endsWith('.') || part.endsWith('.lock'))) {
      throw new Error(`${game.id}: invalid branch or tag ref.`);
    }
    if (typeof game.featured !== 'boolean') throw new Error(`${game.id}: featured must be true or false.`);
    if (!game.build || !['vite', 'static'].includes(game.build.type)) {
      throw new Error(`${game.id}: build.type must be vite or static.`);
    }
    const output = game.build.output;
    if (typeof output !== 'string' || (output !== '.' && !/^[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_.-]+)*$/.test(output))
        || output.split('/').some(part => part === '..')) {
      throw new Error(`${game.id}: build.output must be a relative folder such as dist, public, or .`);
    }
  }
  if (games.filter(game => game.featured).length > 1) throw new Error('Choose at most one featured game.');
  return games;
}

export function readGames(root = projectRoot) {
  const folder = join(root, 'games');
  const games = readdirSync(folder, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(entry => {
      const file = join(folder, entry.name, 'game.json');
      if (!existsSync(file)) throw new Error(`Missing registration: games/${entry.name}/game.json`);
      const game = JSON.parse(readFileSync(file, 'utf8'));
      if (game.id !== entry.name) throw new Error(`Folder ${entry.name} must match its game id exactly.`);
      return game;
    });
  const siteNames = existsSync(join(root, 'site')) ? readdirSync(join(root, 'site')) : [];
  return validateGames(games, siteNames);
}

export function createCatalog(games) {
  return games.map(game => ({
    ...Object.fromEntries(publicFields.map(field => [field, game[field]])),
    url: `/${game.id}/`,
  }));
}

function requireInside(parent, candidate, allowEqual = false) {
  const rel = relative(resolve(parent), resolve(candidate));
  if ((!allowEqual && rel === '') || rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel)) {
    throw new Error(`Path must remain inside ${parent}: ${candidate}`);
  }
}

function removeGenerated(root, folder) {
  // Verify the absolute destination before any recursive removal, on every platform.
  requireInside(root, folder);
  if (existsSync(folder) && lstatSync(folder).isSymbolicLink()) throw new Error(`Generated folder is a symlink: ${folder}`);
  rmSync(folder, { recursive: true, force: true });
}

function inspectTree(folder) {
  if (lstatSync(folder).isSymbolicLink()) throw new Error(`Publishable files cannot be symlinks: ${folder}`);
  for (const entry of readdirSync(folder, { withFileTypes: true })) {
    if (ignoredNames.has(entry.name)) continue;
    const file = join(folder, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`Publishable files cannot be symlinks: ${file}`);
    if (entry.isDirectory()) inspectTree(file);
  }
}

function copyPublicTree(source, destination) {
  inspectTree(source);
  cpSync(source, destination, {
    recursive: true,
    filter: file => !relative(source, file).split(sep).some(part => ignoredNames.has(part)),
  });
}

export function resolveGameOutput(source, game) {
  const output = resolve(source, game.build.output);
  requireInside(source, output, true);
  if (!existsSync(output)) throw new Error(`${game.id}: missing build output ${game.build.output}.`);
  requireInside(realpathSync(source), realpathSync(output), true);
  if (!existsSync(join(output, 'index.html')) || !lstatSync(join(output, 'index.html')).isFile()) {
    throw new Error(`${game.id}: build output must contain index.html.`);
  }
  return output;
}

// Accepting already built sources also makes assembly testable entirely offline.
export function assembleSite({ root = projectRoot, games, sources }) {
  const site = join(root, 'site');
  if (!existsSync(join(site, 'index.html'))) throw new Error('The parent gallery needs site/index.html.');
  validateGames(games, readdirSync(site));
  const outputs = games.map(game => {
    const source = sources.get(game.id);
    if (!source) throw new Error(`Missing source for ${game.id}.`);
    const output = resolveGameOutput(source, game);
    inspectTree(output);
    return { game, output };
  });
  inspectTree(site);
  const destination = join(root, '_site');
  removeGenerated(root, destination);
  copyPublicTree(site, destination);
  for (const { game, output } of outputs) copyPublicTree(output, join(destination, game.id));
  if (existsSync(join(root, 'CNAME'))) cpSync(join(root, 'CNAME'), join(destination, 'CNAME'));
  writeFileSync(join(destination, '.nojekyll'), '');
  writeFileSync(join(destination, 'games.json'), `${JSON.stringify(createCatalog(games), null, 2)}\n`);
  return destination;
}

function run(command, args, cwd, environment = process.env) {
  const result = spawnSync(command, args, {
    cwd, stdio: 'inherit', shell: false, windowsHide: true,
    env: { ...environment, GIT_TERMINAL_PROMPT: '0' },
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} failed with exit code ${result.status}.`);
}

export function npmEnvironment(root, environment = process.env) {
  const env = Object.fromEntries(Object.entries(environment).filter(([key]) => key.toLowerCase() !== 'npm_config_cache'));
  return { ...env, npm_config_cache: resolve(root, '.cache', 'npm') };
}

function runNpm(args, cwd, root) {
  const environment = npmEnvironment(root);
  mkdirSync(environment.npm_config_cache, { recursive: true });
  requireInside(realpathSync(root), realpathSync(environment.npm_config_cache));
  // Run npm's JS entry point directly on Windows; never put metadata into cmd.exe.
  const candidates = [process.env.npm_execpath, join(dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js')];
  const npmCli = candidates.find(file => file && file.endsWith('.js') && existsSync(file));
  if (npmCli) return run(process.execPath, [npmCli, ...args], cwd, environment);
  if (process.platform !== 'win32') return run('npm', args, cwd, environment);
  throw new Error('Run this command with npm run build so npm can locate its CLI on Windows.');
}

export function buildGames(root = projectRoot) {
  const games = readGames(root);
  const cache = join(root, '.cache', 'games');
  requireInside(root, cache);
  mkdirSync(cache, { recursive: true });
  requireInside(realpathSync(root), realpathSync(cache));
  const sources = new Map();
  for (const game of games) {
    const source = join(cache, game.id);
    removeGenerated(cache, source);
    console.log(`Building ${game.title} from ${game.repository}@${game.ref}`);
    run('git', ['clone', '--depth', '1', '--single-branch', '--branch', game.ref, '--', `https://github.com/${game.repository}.git`, source], root);
    if (game.build.type === 'vite') {
      if (!existsSync(join(source, 'package-lock.json'))) throw new Error(`${game.id}: Vite games need a committed package-lock.json.`);
      runNpm(['ci'], source, root);
      runNpm(['run', 'build', '--', `--base=/${game.id}/`], source, root);
    }
    sources.set(game.id, source);
  }
  const output = assembleSite({ root, games, sources });
  console.log(`Published folder ready: ${output} (${games.length} game${games.length === 1 ? '' : 's'})`);
  return output;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    if (process.argv.includes('--validate')) {
      const games = readGames();
      console.log(`Valid registrations: ${games.map(game => game.id).join(', ')}`);
    } else {
      buildGames();
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
