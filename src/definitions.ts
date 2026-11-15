export interface AppLifecyclePlugin {
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
   * runs on the plugin's own queue, not on the main thread.
   *
   * On iOS the free disk space comes from a required-reason API, so an app that
   * calls this has to declare `NSPrivacyAccessedAPICategoryDiskSpace` in its
   * `PrivacyInfo.xcprivacy` (see "The iOS privacy manifest" in the README).
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
}
