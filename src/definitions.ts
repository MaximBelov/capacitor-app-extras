export interface AppExtrasPlugin {
  /**
   * Terminates the app process, so that the next launch starts from scratch.
   *
   * Use it when the app is in a state it cannot recover from in place, for
   * example a local database that has to be rebuilt, and the user should simply
   * open the app again. It is a clean exit, not a crash: nothing is reported to
   * a crash reporter.
   *
   * The two platforms end the process differently, and the promise behaves
   * accordingly:
   *
   * - **iOS**: the promise resolves, and the process exits with `exit(0)` about
   *   0.3 seconds later, on the main thread.
   * - **Android**: the activity task is finished with `finishAffinity()` and the
   *   process is killed straight away. The promise is resolved first, but the
   *   process usually goes down before the result reaches JavaScript, so do not
   *   wait on it for anything.
   *
   * Calling it again while an exit is already on its way resolves without
   * scheduling a second one.
   *
   * On the web it rejects with the `UNIMPLEMENTED` code.
   *
   * @since 0.0.1
   */
  forceClose(): Promise<void>;

  /**
   * Reads a few facts about the device the app runs on.
   *
   * Nothing is cached: every call reads the values again. On iOS the disk read
   * runs on the plugin's own queue, not on the main thread. A value that cannot
   * be read never fails the call: `freeDiskBytes` is then left out, and
   * `installationId` falls back as described below.
   *
   * On iOS the free disk space and the stored installation id come from
   * required-reason APIs, so an app that calls this has to declare
   * `NSPrivacyAccessedAPICategoryDiskSpace` and
   * `NSPrivacyAccessedAPICategoryUserDefaults` in its `PrivacyInfo.xcprivacy`
   * (see "The iOS privacy manifest" in the README).
   *
   * On the web it rejects with the `UNIMPLEMENTED` code.
   *
   * @since 0.1.0
   */
  getInfo(): Promise<AppInfo>;
}

export interface AppInfo {
  /**
   * iOS: `true` when an iPhone or iPad app runs on a Mac with Apple silicon
   * (`ProcessInfo.processInfo.isiOSAppOnMac`).
   *
   * Android: always `false`.
   *
   * @since 0.1.0
   */
  isiOSAppOnMac: boolean;

  /**
   * Free bytes on the volume the app keeps its files on. On iOS this is
   * `volumeAvailableCapacityForImportantUsage` of the app's home directory,
   * which counts space the system can free on demand; on Android it is
   * `availableBlocksLong * blockSizeLong` from `StatFs` on
   * `Environment.getDataDirectory()`. Absent when the platform does not
   * report it.
   *
   * @since 0.1.0
   */
  freeDiskBytes?: number;

  /**
   * One id per install of the app: it stays the same across launches and
   * updates, and is gone when the app is deleted.
   *
   * It is the same id `cordova-plugin-device` reported as `device.uuid`,
   * kept across the move to Capacitor, so an app migrating from Cordova keeps
   * one id per install.
   *
   * - **iOS**: the value stored in `UserDefaults` under `CDVUUID`, the key
   *   `cordova-plugin-device` used. When there is none yet,
   *   `UIDevice.current.identifierForVendor` is stored there, or a new random
   *   UUID when the system has no vendor id, and it is never changed after
   *   that.
   * - **Android**: `Settings.Secure.ANDROID_ID`. Should the system not report
   *   one, a random UUID is stored in the plugin's own preferences and used
   *   from then on.
   *
   * Always present, never empty.
   *
   * @since 0.2.0
   */
  installationId: string;
}
