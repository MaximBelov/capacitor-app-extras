# capacitor-app-extras

A small set of native calls that the official [`@capacitor/app`](https://capacitorjs.com/docs/apis/app) and
[`@capacitor/device`](https://capacitorjs.com/docs/apis/device) plugins do not offer, for iOS and Android. It is meant to sit
next to them, not to replace them. `getInfo()` also works on the web, so an app can call it the same way everywhere.

| Call           | What it does                                                                          |
| -------------- | ------------------------------------------------------------------------------------- |
| `forceClose()` | Ends the app process cleanly, so the next launch starts from scratch.                 |
| `getInfo()`    | Reads the free disk space, a stable install id, and whether an iOS app runs on a Mac. |

## Install

```bash
npm install capacitor-app-extras
npx cap sync
```

Requires Capacitor 8. Android 8.0 (API 26) or newer, iOS 15 or newer. On iOS the plugin is a Swift package; CocoaPods works too.

## Closing the app

Sometimes an app gets into a state it cannot fix while it is running: a local database that has to be rebuilt, a native SDK that
has to start again, a migration that needs a clean start. The usual way out is to ask the user to close the app and open it again.
`forceClose()` does the closing part. The process ends, and the next time the user taps the icon the app starts from scratch.

It is a clean exit, not a crash. Crashing on purpose is a common workaround, and it fills your crash reporter with noise you then
have to filter out. This plugin does not do that.

```typescript
import { AppExtras } from 'capacitor-app-extras';

async function restartFromScratch() {
  // Tell the user first: the app disappears as soon as this runs.
  await AppExtras.forceClose();
}
```

Do anything that has to happen first (saving, flushing logs, telling the user) **before** the call. Nothing after it is
guaranteed to run.

### How it closes the app

The two platforms do it differently, and that shows up in the promise.

**iOS.** The promise resolves, then about 0.3 seconds later the process calls `exit(0)` on the main thread. The short wait lets the
result reach JavaScript and lets any running animation finish, so code right after the `await` starts to run, but there is no
promise it finishes.

**Android.** The activity task is finished with `finishAffinity()`, which takes the app off the recents screen, and then the process
is killed. The promise is resolved before that, but the process usually goes down before the answer reaches JavaScript, so on
Android the `await` normally never returns. Do not wait on it for anything.

Calling `forceClose()` again while an exit is already on its way does not schedule a second one.

On the web the call rejects with the `UNIMPLEMENTED` error code. A page cannot reliably close its own browser tab or window, so
decide what your app should do there instead, for example reload:

```typescript
import { Capacitor } from '@capacitor/core';

if (Capacitor.isNativePlatform()) {
  await AppExtras.forceClose();
} else {
  window.location.href = '/';
}
```

#### A note on App Store review

Apple's guidelines discourage apps that quit on their own. Use this for recovery, after telling the user what is about to happen,
not as a normal way to leave the app.

## Reading the free space, the install id and the platform

```typescript
const { isiOSAppOnMac, freeDiskBytes, installationId } = await AppExtras.getInfo();

if (freeDiskBytes !== undefined && freeDiskBytes < 200 * 1024 * 1024) {
  // less than 200 MB left: warn before a large download or a database rebuild
}
```

| Field            | iOS                                                                           | Android                                                                             | Web                                                                      |
| ---------------- | ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `isiOSAppOnMac`  | `ProcessInfo.processInfo.isiOSAppOnMac`                                       | always `false`                                                                      | always `false`                                                           |
| `freeDiskBytes`  | `volumeAvailableCapacityForImportantUsage` of the app's home directory        | `StatFs` on `Environment.getDataDirectory()`: `availableBlocksLong * blockSizeLong` | `quota - usage` from `navigator.storage.estimate()`: the origin's budget |
| `installationId` | `UserDefaults` value under `CDVUUID`, written once from `identifierForVendor` | `Settings.Secure.ANDROID_ID`                                                        | random UUID in `localStorage` under `CapacitorAppExtras.installationId`  |

`freeDiskBytes` is left out of the result when the platform does not report it. On iOS the number includes space the system
can free on demand (purgeable caches), which is what Apple recommends for deciding whether something the user asked for fits.
Every call reads the values again, off the main thread on both platforms. A value that cannot be read never makes the call fail.
On the web the call resolves with the same fields; see "On the web" below.

### The installation id

`installationId` is the same id `cordova-plugin-device` reported as `device.uuid`, kept across the move to Capacitor, so an app
migrating from Cordova keeps one id per install. It is always present and never empty.

**iOS.** `cordova-plugin-device` kept its id in `UserDefaults` under the key `CDVUUID`, and the plugin reads that key. When it is
empty (a fresh install, or an app that never had the Cordova plugin), the plugin stores `UIDevice.current.identifierForVendor`
there, or a new random UUID when the system has no vendor id yet, which can happen right after a restart before the device is
unlocked. Once written the value is never changed, so a later change of the vendor id (all apps of that vendor deleted and one
installed again) does not move it. Deleting the app deletes its `UserDefaults`, and with them the id. An app that used to write
`CDVUUID` itself, for example from its `AppDelegate`, can drop that code: the plugin does the same thing.

**Android.** `Settings.Secure.ANDROID_ID`, read through the app's context, which is what `cordova-plugin-device` answered. Since
Android 8 it is scoped to the app's signing key and the user, and it survives reinstalls of the same signed app. Should the system
answer nothing, the plugin stores a random UUID in its own `SharedPreferences` file (`CapacitorAppExtras`) and answers that from
then on, even when `ANDROID_ID` comes back later.

Neither is an advertising id, and neither needs a permission.

### On the web

Since 0.3.0 `getInfo()` resolves on the web as well, with the same fields as on iOS and Android, so an app does not need a
separate code path for the browser. The required fields are always there; `freeDiskBytes` may be left out.

- **`isiOSAppOnMac`** is always `false`.
- **`installationId`** is a random UUID (`crypto.randomUUID()`, or one built from `crypto.getRandomValues()` on a page that is
  not a secure context) stored in `localStorage` under the key `CapacitorAppExtras.installationId`. It stays the same across
  reloads and visits, until the user clears the site's data. It is per origin and per browser profile, so it identifies a browser
  storage, not a device or a user. When `localStorage` cannot be used (storage blocked by the browser, a sandboxed frame, a full
  quota), the call does not fail: it answers a new random UUID for that page load instead, the same for every call until the page
  is reloaded, and a different one after.
- **`freeDiskBytes`** is `quota - usage` from `navigator.storage.estimate()`. **This is not the free disk space.** It is the
  storage budget the browser grants this origin, minus what the origin already uses. Browsers set the quota by their own rules,
  often as a share of the disk and sometimes rounded or padded on purpose, so treat it as "how much more this site may store",
  for example before filling IndexedDB. It is left out when the browser has no `navigator.storage.estimate()`, the estimate fails,
  or it does not report both numbers.

### The iOS privacy manifest

Two reads on iOS are Apple's
[required-reason APIs](https://developer.apple.com/documentation/bundleresources/privacy_manifest_files/describing_use_of_required_reason_api):
the free space (`NSPrivacyAccessedAPICategoryDiskSpace`) and the installation id kept in `UserDefaults`
(`NSPrivacyAccessedAPICategoryUserDefaults`). The plugin ships its own `PrivacyInfo.xcprivacy` declaring reasons `E174.1` and
`CA92.1`, as a resource of the Swift package and as a resource bundle of the CocoaPods pod, so Xcode includes it in the app's
privacy report.

The plugin's code is compiled into your app, though, so declare the same categories in your **app's** `PrivacyInfo.xcprivacy` as
well, with the reasons that match how you use the values. `E174.1` covers checking whether there is enough space to write files,
and `CA92.1` reading and writing values only the app itself can access; see Apple's list for the others. For example:

```xml
<key>NSPrivacyAccessedAPITypes</key>
<array>
  <dict>
    <key>NSPrivacyAccessedAPIType</key>
    <string>NSPrivacyAccessedAPICategoryDiskSpace</string>
    <key>NSPrivacyAccessedAPITypeReasons</key>
    <array>
      <string>E174.1</string>
    </array>
  </dict>
  <dict>
    <key>NSPrivacyAccessedAPIType</key>
    <string>NSPrivacyAccessedAPICategoryUserDefaults</string>
    <key>NSPrivacyAccessedAPITypeReasons</key>
    <array>
      <string>CA92.1</string>
    </array>
  </dict>
</array>
```

If your app collects the installation id (sends it off the device), say so under "Device ID" in the collected data types of your
app's privacy manifest and in its App Store privacy details. The plugin itself sends nothing anywhere.

An app that never calls `getInfo()` still links the code, so the declaration is the safe default for any app that installs the
plugin.

## Coming from the Cordova plugin

If you used a Cordova plugin that exposed `cordova.plugins.appLifecycle.forceClose()`, or the `uuid` of `cordova-plugin-device`,
the calls map one to one:

| Cordova                                                   | Capacitor                                    |
| --------------------------------------------------------- | -------------------------------------------- |
| `cordova.plugins.appLifecycle.forceClose(success, error)` | `await AppExtras.forceClose()`               |
| `device.uuid` (`cordova-plugin-device`)                   | `(await AppExtras.getInfo()).installationId` |

The native behaviour is the same: `exit(0)` after 0.3 seconds on iOS, `finishAffinity()` and a process kill on Android, and the
same id on both (see "The installation id" above). `@capacitor/device`'s `getId()` reads `identifierForVendor` afresh on iOS,
which is not always the value stored under `CDVUUID`, so an app that switches to it can see a new id for some existing installs.

## API

<docgen-index>

* [`forceClose()`](#forceclose)
* [`getInfo()`](#getinfo)
* [Interfaces](#interfaces)

</docgen-index>

<docgen-api>
<!--Update the source file JSDoc comments and rerun docgen to update the docs below-->

### forceClose()

```typescript
forceClose() => Promise<void>
```

Terminates the app process, so that the next launch starts from scratch.

Use it when the app is in a state it cannot recover from in place, for
example a local database that has to be rebuilt, and the user should simply
open the app again. It is a clean exit, not a crash: nothing is reported to
a crash reporter.

The two platforms end the process differently, and the promise behaves
accordingly:

- **iOS**: the promise resolves, and the process exits with `exit(0)` about
  0.3 seconds later, on the main thread.
- **Android**: the activity task is finished with `finishAffinity()` and the
  process is killed straight away. The promise is resolved first, but the
  process usually goes down before the result reaches JavaScript, so do not
  wait on it for anything.

Calling it again while an exit is already on its way resolves without
scheduling a second one.

On the web it rejects with the `UNIMPLEMENTED` code: a page cannot
reliably close its own tab or window. Reload or navigate instead.

**Since:** 0.0.1

--------------------


### getInfo()

```typescript
getInfo() => Promise<AppInfo>
```

Reads a few facts about the device the app runs on.

Nothing is cached: every call reads the values again. On iOS the disk read
runs on the plugin's own queue, not on the main thread. A value that cannot
be read never fails the call: `freeDiskBytes` is then left out, and
`installationId` falls back as described below.

On iOS the free disk space and the stored installation id come from
required-reason APIs, so an app that calls this has to declare
`NSPrivacyAccessedAPICategoryDiskSpace` and
`NSPrivacyAccessedAPICategoryUserDefaults` in its `PrivacyInfo.xcprivacy`
(see "The iOS privacy manifest" in the README).

On the web (since 0.3.0) it resolves too, with the same fields:
`isiOSAppOnMac` is `false`, `installationId` is a random UUID kept in
`localStorage`, and `freeDiskBytes` is the origin's remaining storage
budget from `navigator.storage.estimate()`, not the free disk space.
Before 0.3.0 it rejected with the `UNIMPLEMENTED` code on the web.

**Returns:** <code>Promise&lt;<a href="#appinfo">AppInfo</a>&gt;</code>

**Since:** 0.1.0

--------------------


### Interfaces


#### AppInfo

| Prop                 | Type                 | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | Since |
| -------------------- | -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| **`isiOSAppOnMac`**  | <code>boolean</code> | iOS: `true` when an iPhone or iPad app runs on a Mac with Apple silicon (`ProcessInfo.processInfo.isiOSAppOnMac`). Android: always `false`. Web: always `false`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | 0.1.0 |
| **`freeDiskBytes`**  | <code>number</code>  | Free bytes on the volume the app keeps its files on. On iOS this is `volumeAvailableCapacityForImportantUsage` of the app's home directory, which counts space the system can free on demand; on Android it is `availableBlocksLong * blockSizeLong` from `StatFs` on `Environment.getDataDirectory()`. On the web it is `quota - usage` from `navigator.storage.estimate()`: how much more this origin may store, a budget the browser sets, which is not the free space of the disk. Absent when the platform does not report it.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | 0.1.0 |
| **`installationId`** | <code>string</code>  | One id per install of the app: it stays the same across launches and updates, and is gone when the app is deleted. It is the same id `cordova-plugin-device` reported as `device.uuid`, kept across the move to Capacitor, so an app migrating from Cordova keeps one id per install. - **iOS**: the value stored in `UserDefaults` under `CDVUUID`, the key `cordova-plugin-device` used. When there is none yet, `UIDevice.current.identifierForVendor` is stored there, or a new random UUID when the system has no vendor id, and it is never changed after that. - **Android**: `Settings.Secure.ANDROID_ID`. Should the system not report one, a random UUID is stored in the plugin's own preferences and used from then on. - **Web**: a random UUID stored in `localStorage` under `CapacitorAppExtras.installationId`, so it is the same across reloads until the site's data is cleared. It is per origin and per browser profile. When `localStorage` cannot be used (blocked by the browser, a sandboxed frame, a full quota), a new random UUID is answered for each page load instead: the same for every call of that page, a different one after a reload. Always present, never empty. | 0.2.0 |

</docgen-api>

## Testing

Everything that can be tested without ending the test process is tested on every change:

```bash
npm run test:unit      # TypeScript: the web getInfo and forceClose, native calls reach the right plugin and method
npm run test:parity    # the API, the Swift, the Kotlin and this README name the same methods and the same getInfo fields
npm run test:android   # JUnit on the JVM: the order of the steps, the double-call guard, the getInfo mapping, the id fallback
npm run test:ios       # XCTest on a simulator: the delay, the guard, the main thread, the getInfo mapping, the stored id, the privacy manifest
```

The native code takes the scheduler, the exit, the disk read and the id sources as arguments, so the tests hand it fakes and check
what it would have done. On iOS the real disk read and the real vendor id also run once, on the simulator, with the id stored in a
throwaway `UserDefaults` suite.

What the tests cannot show is the process actually ending, because that would end the test too. That part needs a real app on a
phone or a simulator: call `forceClose()`, check that the process is gone (`adb shell pidof <package>` prints nothing on Android;
on iOS the app is no longer running), and check that no crash was reported. The example app in `example-app/` has a button for it.

## License

MIT
