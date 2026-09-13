import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, resolve, sep } from 'node:path';
import test from 'node:test';
import { assembleSite, createCatalog, npmEnvironment, readGames, resolveGameOutput, validateGames } from '../scripts/build-games.mjs';

const registeredGame = JSON.parse(readFileSync(new URL('../games/Silent-Stairs/game.json', import.meta.url), 'utf8'));
const game = (id, extra = {}) => ({ ...structuredClone(registeredGame), id, featured: false, ...extra });

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'play-build-test-'));
  t.after(() => {
    const rel = relative(resolve(tmpdir()), resolve(root));
    assert.ok(rel.startsWith('play-build-test-') && !rel.includes(sep) && rel !== '..');
    rmSync(root, { recursive: true, force: true });
  });
  return root;
}

function put(root, file, contents) {
  const target = join(root, file);
  mkdirSync(join(target, '..'), { recursive: true });
  writeFileSync(target, contents);
}

test('current registration produces the existing public route', () => {
  validateGames([registeredGame]);
  const catalog = createCatalog([registeredGame]);
  assert.equal(catalog[0].url, '/Silent-Stairs/');
  assert.equal(catalog[0].repository, 'aravindmarri/Silent-Stairs');
  assert.equal(catalog[0].build, undefined);
});

test('npm uses a project-local cache even when the shell provides a different cache', t => {
  const root = fixture(t);
  const environment = npmEnvironment(root, { Path: 'keep-path', NPM_CONFIG_CACHE: 'outside', npm_config_cache: 'also-outside' });
  assert.equal(environment.npm_config_cache, resolve(root, '.cache', 'npm'));
  assert.equal(environment.NPM_CONFIG_CACHE, undefined);
  assert.equal(environment.Path, 'keep-path');
});

test('two independent static children assemble into distinct routes and catalog entries', t => {
  const root = fixture(t);
  put(root, 'site/index.html', '<h1>PLAY</h1>');
  put(root, 'site/assets/style.css', 'body{color:cyan}');
  put(root, 'CNAME', 'play.aravindmarri.com\n');
  const games = [game('Silent-Stairs', { build: { type: 'static', output: 'public' } }), game('Second-Game', { build: { type: 'static', output: '.' } })];
  const first = join(root, 'fixtures', 'first');
  const second = join(root, 'fixtures', 'second');
  put(first, 'public/index.html', '<script src="./assets/game.js"></script>');
  put(first, 'public/assets/game.js', 'window.firstGame=true');
  put(second, 'index.html', '<h1>Second game</h1>');
  put(second, '.git/config', 'private checkout metadata');
  const output = assembleSite({ root, games, sources: new Map([['Silent-Stairs', first], ['Second-Game', second]]) });
  assert.equal(readFileSync(join(output, 'index.html'), 'utf8'), '<h1>PLAY</h1>');
  assert.ok(existsSync(join(output, 'Silent-Stairs/assets/game.js')));
  assert.ok(existsSync(join(output, 'Second-Game/index.html')));
  assert.ok(!existsSync(join(output, 'Second-Game/.git')));
  assert.equal(readFileSync(join(output, 'CNAME'), 'utf8').trim(), 'play.aravindmarri.com');
  assert.ok(existsSync(join(output, '.nojekyll')));
  const catalog = JSON.parse(readFileSync(join(output, 'games.json'), 'utf8'));
  assert.equal(catalog.length, 2);
  assert.deepEqual(catalog.map(entry => entry.url), ['/Silent-Stairs/', '/Second-Game/']);
});

test('rejects duplicate, reserved, and parent-asset routes', () => {
  assert.throws(() => validateGames([game('Same'), game('same')]), /Duplicate or reserved/);
  assert.throws(() => validateGames([game('assets')]), /Duplicate or reserved/);
  assert.throws(() => validateGames([game('CNAME')]), /Duplicate or reserved/);
  assert.throws(() => validateGames([game('CON')]), /Invalid game id/);
  assert.throws(() => validateGames([game('Downloads')], ['downloads']), /Duplicate or reserved/);
  assert.throws(() => validateGames([game('../escape')]), /Invalid game id/);
});

test('rejects unsafe repository, ref, and output configuration', () => {
  for (const repository of ['https://github.com/a/b', 'owner/repo;command', 'owner/../repo']) {
    assert.throws(() => validateGames([game('One', { repository })]), /repository/);
  }
  for (const ref of ['--upload-pack=bad', 'main;bad', '../main', 'main//bad', 'main.lock']) {
    assert.throws(() => validateGames([game('One', { ref })]), /ref/);
  }
  for (const output of ['../escape', '/tmp', 'C:\\tmp', 'dist/../../outside']) {
    assert.throws(() => validateGames([game('One', { build: { type: 'static', output } })]), /build.output/);
  }
});

test('failed child output is rejected before replacing the previous assembled site', t => {
  const root = fixture(t);
  put(root, 'site/index.html', 'new gallery');
  put(root, '_site/index.html', 'previous valid gallery');
  mkdirSync(join(root, 'empty'), { recursive: true });
  const games = [game('Broken', { build: { type: 'static', output: '.' } })];
  assert.throws(() => assembleSite({ root, games, sources: new Map([['Broken', join(root, 'empty')]]) }), /index.html/);
  assert.equal(readFileSync(join(root, '_site/index.html'), 'utf8'), 'previous valid gallery');
});

test('each registration folder must match the public child id', t => {
  const root = fixture(t);
  put(root, 'games/Wrong/game.json', JSON.stringify(game('Actual')));
  assert.throws(() => readGames(root), /must match its game id/);
});

test('a linked output directory cannot publish files outside its game source', t => {
  const root = fixture(t);
  const source = join(root, 'source');
  const outside = join(root, 'outside');
  mkdirSync(source);
  put(outside, 'index.html', 'outside source');
  symlinkSync(outside, join(source, 'public'), process.platform === 'win32' ? 'junction' : 'dir');
  const registration = game('Linked', { build: { type: 'static', output: 'public' } });
  assert.throws(() => resolveGameOutput(source, registration), /Path must remain inside/);
});
