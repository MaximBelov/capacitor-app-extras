// Every method of the TypeScript API has its native method on both platforms and its section in the README, and neither platform
// has a method the API does not declare. A miss on either side compiles fine and fails only on a phone. Plain Node, no install.
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

const api = [...read('src/definitions.ts').matchAll(/^\s+(\w+)\([^)]*\):\s*Promise</gm)].map((m) => m[1]).sort();
const ios = [...read('ios/Sources/AppLifecyclePlugin/AppLifecyclePlugin.swift').matchAll(/CAPPluginMethod\(name:\s*"(\w+)"/g)]
  .map((m) => m[1])
  .sort();
const iosFunctions = [...read('ios/Sources/AppLifecyclePlugin/AppLifecyclePlugin.swift').matchAll(/@objc func (\w+)\(_ call: CAPPluginCall\)/g)]
  .map((m) => m[1])
  .sort();
const android = [
  ...read('android/src/main/kotlin/io/github/maximbelov/applifecycle/AppLifecyclePlugin.kt').matchAll(/@PluginMethod\s+fun (\w+)\(/g),
]
  .map((m) => m[1])
  .sort();

test('the API declares at least one method', () => {
  assert.ok(api.length > 0, 'no method found in src/definitions.ts');
});

test('iOS registers exactly the methods of the API', () => {
  assert.deepEqual(ios, api);
});

test('iOS has an @objc function for every registered method', () => {
  assert.deepEqual(iosFunctions, api);
});

test('Android annotates exactly the methods of the API', () => {
  assert.deepEqual(android, api);
});

test('the plugin has the same name in JavaScript, Swift and Kotlin', () => {
  assert.match(read('src/index.ts'), /registerPlugin<AppLifecyclePlugin>\('AppLifecycle'/);
  assert.match(read('ios/Sources/AppLifecyclePlugin/AppLifecyclePlugin.swift'), /jsName = "AppLifecycle"/);
  assert.match(read('android/src/main/kotlin/io/github/maximbelov/applifecycle/AppLifecyclePlugin.kt'), /@CapacitorPlugin\(name = "AppLifecycle"\)/);
});

test('the README documents every method', () => {
  const readme = read('README.md');
  for (const method of api) {
    assert.match(readme, new RegExp(`### ${method}\\(\\)`), `README.md has no section for ${method}()`);
  }
});
