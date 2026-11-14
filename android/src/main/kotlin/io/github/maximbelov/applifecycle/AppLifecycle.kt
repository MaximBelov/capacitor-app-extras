package io.github.maximbelov.applifecycle

/**
 * Ends the app process: finishes the activity task, then kills the process.
 *
 * The three steps are passed in so that the order and the guard can be tested on the JVM without ending the test process.
 * [AppLifecyclePlugin] passes the real ones.
 */
class AppLifecycle(
    private val runOnMainThread: (Runnable) -> Unit,
    private val finishTask: () -> Unit,
    private val killProcess: () -> Unit,
) {
    private var closing = false

    /**
     * Schedules the exit on the main thread. Returns false, and schedules nothing, when an exit is already scheduled.
     */
    @Synchronized
    fun forceClose(): Boolean {
        if (closing) {
            return false
        }
        closing = true
        runOnMainThread(
            Runnable {
                // Finishing the task first removes it from the recents screen; killing the process is what actually ends it,
                // because finishAffinity() on its own leaves the process (and the web view) alive.
                try {
                    finishTask()
                } finally {
                    killProcess()
                }
            },
        )
        return true
    }
}
