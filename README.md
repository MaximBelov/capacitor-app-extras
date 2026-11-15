# capacitor-app-lifecycle

Close a Capacitor app for good, from JavaScript, on iOS and Android. And read the two facts about the device you usually want
before you do something drastic: how much disk space is free, and whether the iPhone app is running on a Mac.

Sometimes an app gets into a state it cannot fix while it is running: a local database that has to be rebuilt, a native SDK that
has to start again, a migration that needs a clean start. The usual way out is to ask the user to close the app and open it again.
This plugin does the closing part. The process ends, and the next time the user taps the icon the app starts from scratch.

It is a clean exit, not a crash. Crashing on purpose is a common workaround, and it fills your crash reporter with noise you then
have to filter out. This plugin does not do that.

## Install

```bash
npm install capacitor-app-lifecycle
npx cap sync
```

Requires Capacitor 8. Android 8.0 (API 26) or newer, iOS 15 or newer. On iOS the plugin is a Swift package; CocoaPods works too.

## Use

```typescript
import { AppLifecycle } from 'capacitor-app-lifecycle';

async function restartFromScratch() {
  // Tell the user first: the app disappears as soon as this runs.
  await AppLifecycle.forceClose();
}
```

Do anything that has to happen first (saving, flushing logs, telling the user) **before** the call. Nothing after it is
guaranteed to run.

## How it closes the app

The two platforms do it differently, and that shows up in the promise.

**iOS.** The promise resolves, then about 0.3 seconds later the process calls `exit(0)` on the main thread. The short wait lets the
result reach JavaScript and lets any running animation finish, so code right after the `await` starts to run, but there is no
promise it finishes.

**Android.** The activity task is finished with `finishAffinity()`, which takes the app off the recents screen, and then the process
is killed. The promise is resolved before that, but the process usually goes down before the answer reaches JavaScript, so on
Android the `await` normally never returns. Do not wait on it for anything.

Calling `forceClose()` again while an exit is already on its way does not schedule a second one.

On the web the call rejects with the `UNIMPLEMENTED` error code. A page cannot close its own browser tab, so decide what your app
should do there instead, for example reload:

```typescript
import { Capacitor } from '@capacitor/core';

if (Capacitor.isNativePlatform()) {
  await AppLifecycle.forceClose();
} else {
  window.location.href = '/';
}
```

## Reading the free space and the platform

```typescript
const { isiOSAppOnMac, freeDiskBytes } = await AppLifecycle.getInfo();

if (freeDiskBytes !== undefined && freeDiskBytes < 200 * 1024 * 1024) {
  // less than 200 MB left: warn before a large download or a database rebuild
}
```

| Field           | iOS                                                                    | Android                                                                             | Web     |
| --------------- | ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ------- |
| `isiOSAppOnMac` | `ProcessInfo.processInfo.isiOSAppOnMac`                                | always `false`                                                                      | rejects |
| `freeDiskBytes` | `volumeAvailableCapacityForImportantUsage` of the app's home directory | `StatFs` on `Environment.getDataDirectory()`: `availableBlocksLong * blockSizeLong` | rejects |

`freeDiskBytes` is left out of the result when the platform does not report it. On iOS the number includes space the system
can free on demand (purgeable caches), which is what Apple recommends for deciding whether something the user asked for fits.
Every call reads the values again, off the main thread on both platforms. On the web the call rejects with `UNIMPLEMENTED`, as
`forceClose()` does.

### The iOS privacy manifest

The free-space read on iOS is one of Apple's
[required-reason APIs](https://developer.apple.com/documentation/bundleresources/privacy_manifest_files/describing_use_of_required_reason_api)
(`NSPrivacyAccessedAPICategoryDiskSpace`). The plugin ships its own `PrivacyInfo.xcprivacy` declaring reason `E174.1`, as a
resource of the Swift package and as a resource bundle of the CocoaPods pod, so Xcode includes it in the app's privacy report.

The plugin's code is compiled into your app, though, so declare the same category in your **app's** `PrivacyInfo.xcprivacy` as
well, with the reason that matches how you use the number. `E174.1` covers checking whether there is enough space to write files;
see Apple's list for the others. For example:

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
</array>
```

An app that never calls `getInfo()` still links the code, so the declaration is the safe default for any app that installs the
plugin.

### A note on App Store review

Apple's guidelines discourage apps that quit on their own. Use this for recovery, after telling the user what is about to happen,
not as a normal way to leave the app.

## Coming from the Cordova plugin

If you used a Cordova plugin that exposed `cordova.plugins.appLifecycle.forceClose()`, the call maps one to one:

| Cordova                                                   | Capacitor                         |
| --------------------------------------------------------- | --------------------------------- |
| `cordova.plugins.appLifecycle.forceClose(success, error)` | `await AppLifecycle.forceClose()` |

The native behaviour is the same: `exit(0)` after 0.3 seconds on iOS, `finishAffinity()` and a process kill on Android.

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

On the web it rejects with the `UNIMPLEMENTED` code.

**Since:** 0.0.1

--------------------


### getInfo()

```typescript
getInfo() => Promise<AppInfo>
```

Reads a few facts about the device the app runs on.

Nothing is cached: every call reads the values again. On iOS the disk read
runs on the plugin's own queue, not on the main thread.

On iOS the free disk space comes from a required-reason API, so an app that
calls this has to declare `NSPrivacyAccessedAPICategoryDiskSpace` in its
`PrivacyInfo.xcprivacy` (see "The iOS privacy manifest" in the README).

On the web it rejects with the `UNIMPLEMENTED` code.

**Returns:** <code>Promise&lt;<a href="#appinfo">AppInfo</a>&gt;</code>

**Since:** 0.1.0

--------------------


### Interfaces


#### AppInfo

| Prop                | Type                 | Description                                                                                                                                                                                                                                                                                                                                          | Since |
| ------------------- | -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| **`isiOSAppOnMac`** | <code>boolean</code> | iOS: `true` when an iPhone or iPad app runs on a Mac with Apple silicon (`ProcessInfo.processInfo.isiOSAppOnMac`). Android: always `false`.                                                                                                                                                                                                          | 0.1.0 |
| **`freeDiskBytes`** | <code>number</code>  | Free bytes on the volume the app keeps its files on. On iOS this is `volumeAvailableCapacityForImportantUsage` of the app's home directory, which counts space the system can free on demand; on Android it is `availableBlocksLong * blockSizeLong` from `StatFs` on `Environment.getDataDirectory()`. Absent when the platform does not report it. | 0.1.0 |

</docgen-api>

## Testing

Everything that can be tested without ending the test process is tested on every change:

```bash
npm run test:unit      # TypeScript: the web rejects, native calls reach the right plugin and method
npm run test:parity    # the API, the Swift, the Kotlin and this README name the same methods and the same getInfo fields
npm run test:android   # JUnit on the JVM: the order of the steps, the double-call guard, the getInfo mapping
npm run test:ios       # XCTest on a simulator: the delay, the guard, the main thread, the getInfo mapping, the privacy manifest
```

The native code takes the scheduler, the exit and the disk read as arguments, so the tests hand it fakes and check what it would
have done. On iOS the real disk read also runs once, on the simulator.

What the tests cannot show is the process actually ending, because that would end the test too. That part needs a real app on a
phone or a simulator: call `forceClose()`, check that the process is gone (`adb shell pidof <package>` prints nothing on Android;
on iOS the app is no longer running), and check that no crash was reported. The example app in `example-app/` has a button for it.

## License

MIT
