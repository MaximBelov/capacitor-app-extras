# capacitor-plugin-app-lifecycle

Close a Capacitor app for good, from JavaScript, on iOS and Android.

Sometimes an app gets into a state it cannot fix while it is running: a local database that has to be rebuilt, a native SDK that
has to start again, a migration that needs a clean start. The usual way out is to ask the user to close the app and open it again.
This plugin does the closing part. The process ends, and the next time the user taps the icon the app starts from scratch.

It is a clean exit, not a crash. Crashing on purpose is a common workaround, and it fills your crash reporter with noise you then
have to filter out. This plugin does not do that.

## Install

```bash
npm install capacitor-plugin-app-lifecycle
npx cap sync
```

Requires Capacitor 8. Android 8.0 (API 26) or newer, iOS 15 or newer. On iOS the plugin is a Swift package; CocoaPods works too.

## Use

```typescript
import { AppLifecycle } from 'capacitor-plugin-app-lifecycle';

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

**Since:** 1.0.0

--------------------

</docgen-api>

## Testing

Everything that can be tested without ending the test process is tested on every change:

```bash
npm run test:unit      # TypeScript: the web rejects, native calls reach the right plugin and method
npm run test:parity    # the API, the Swift, the Kotlin and this README name the same methods
npm run test:android   # JUnit on the JVM: the order of the steps, the double-call guard
npm run test:ios       # XCTest on a simulator: the delay, the double-call guard, the main thread
```

The native code takes the scheduler and the exit as arguments, so the tests hand it fakes and check what it would have done.

What the tests cannot show is the process actually ending, because that would end the test too. That part needs a real app on a
phone or a simulator: call `forceClose()`, check that the process is gone (`adb shell pidof <package>` prints nothing on Android;
on iOS the app is no longer running), and check that no crash was reported. The example app in `example-app/` has a button for it.

## License

MIT
