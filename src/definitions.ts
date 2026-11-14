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
   * @since 1.0.0
   */
  forceClose(): Promise<void>;
}
