// Every method of the TypeScript API has its native method on both platforms and its section in the README, and neither platform
// has a method the API does not declare. A miss on either side compiles fine and fails only on a phone. Plain Node, no install.
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

const api = [...read('src/definitions.ts').matchAll(/^\s+(\w+)\([^)]*\):\s*Promise</gm)].map((m) => m[1]).sort();
const ios = [...read('ios/Sources/AppExtrasPlugin/AppExtrasPlugin.swift').matchAll(/CAPPluginMethod\(name:\s*"(\w+)"/g)]
  .map((m) => m[1])
  .sort();
const iosFunctions = [
  ...read('ios/Sources/AppExtrasPlugin/AppExtrasPlugin.swift').matchAll(/@objc func (\w+)\(_ call: CAPPluginCall\)/g),
]
  .map((m) => m[1])
  .sort();
const android = [
  ...read('android/src/main/kotlin/io/github/maximbelov/appextras/AppExtrasPlugin.kt').matchAll(
    /@PluginMethod\s+fun (\w+)\(/g,
  ),
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
  assert.match(read('src/index.ts'), /registerPlugin<AppExtrasPlugin>\('AppExtras'/);
  assert.match(read('ios/Sources/AppExtrasPlugin/AppExtrasPlugin.swift'), /jsName = "AppExtras"/);
  assert.match(
    read('android/src/main/kotlin/io/github/maximbelov/appextras/AppExtrasPlugin.kt'),
    /@CapacitorPlugin\(name = "AppExtras"\)/,
  );
});

test('the README documents every method', () => {
  const readme = read('README.md');
  for (const method of api) {
    assert.match(readme, new RegExp(`### ${method}\\(\\)`), `README.md has no section for ${method}()`);
  }
});

// The object getInfo() resolves with is built by hand on both platforms, so a misspelt key there reaches JavaScript as undefined.
test('both platforms resolve getInfo() with exactly the fields of AppInfo', () => {
  const body = read('src/definitions.ts').match(/export interface AppInfo \{([\s\S]*?)\n\}/)[1];
  const fields = [...body.matchAll(/^\s+(\w+)\??:/gm)].map((m) => m[1]).sort();
  assert.ok(fields.length > 0, 'no field found in AppInfo');
  const swift = [...read('ios/Sources/AppExtrasPlugin/AppInfo.swift').matchAll(/\["(\w+)"/g)].map((m) => m[1]);
  const kotlin = [
    ...read('android/src/main/kotlin/io/github/maximbelov/appextras/AppInfo.kt').matchAll(/put\("(\w+)"/g),
  ].map((m) => m[1]);
  assert.deepEqual([...new Set(swift)].sort(), fields);
  assert.deepEqual([...new Set(kotlin)].sort(), fields);
});

// A field AppInfo declares without `?` is one JavaScript may read without a check, so both platforms must set it on every call,
// not inside the `if` that leaves out an unknown value. The part of the builder before its first `if` is what always runs.
test('both platforms always set the fields AppInfo declares as required', () => {
  const body = read('src/definitions.ts').match(/export interface AppInfo \{([\s\S]*?)\n\}/)[1];
  const required = [...body.matchAll(/^\s+(\w+):/gm)].map((m) => m[1]).sort();
  assert.deepEqual(required, ['installationId', 'isiOSAppOnMac']);
  const swiftBuilder = read('ios/Sources/AppExtrasPlugin/AppInfo.swift').match(
    /public var dictionary[\s\S]*?\n {4}\}/,
  )[0];
  const kotlinBuilder = read('android/src/main/kotlin/io/github/maximbelov/appextras/AppInfo.kt').match(
    /fun toJSObject\(\)[\s\S]*?\n {4}\}/,
  )[0];
  const swiftAlways = swiftBuilder.split(/\bif\b/)[0];
  const kotlinAlways = kotlinBuilder.split(/\bif\b/)[0];
  for (const field of required) {
    assert.match(swiftAlways, new RegExp(`"${field}"`), `Swift sets ${field} only conditionally`);
    assert.match(kotlinAlways, new RegExp(`put\\("${field}"`), `Kotlin sets ${field} only conditionally`);
  }
});
