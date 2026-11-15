package io.github.maximbelov.appextras

import java.util.UUID

/**
 * The id `getInfo()` answers as `installationId`: `Settings.Secure.ANDROID_ID`, which is what `cordova-plugin-device` reported as
 * `device.uuid`, so an app that moves from Cordova to Capacitor keeps the id it already had.
 *
 * `ANDROID_ID` is not supposed to be missing, but the call can answer null or throw. Then a random UUID is stored in the plugin's
 * own preferences and answered from then on, also when `ANDROID_ID` comes back later, so the id does not move once it has been
 * given out.
 *
 * The reads and the write are passed in so that the rules can be tested on the JVM; [AppExtrasPlugin] passes the real ones.
 */
class InstallationId(
    private val androidId: () -> String?,
    private val storedFallback: () -> String?,
    private val storeFallback: (String) -> Unit,
    private val newId: () -> String = { UUID.randomUUID().toString() },
) {
    /** The id. Never empty. */
    @Synchronized
    fun current(): String {
        attempt(storedFallback)?.let { return it }
        attempt(androidId)?.let { return it }
        val id = newId().ifBlank { UUID.randomUUID().toString() }
        try {
            storeFallback(id)
        } catch (e: Exception) {
            // Not stored: the next call makes another one. Still better than failing the call.
        }
        return id
    }

    private fun attempt(read: () -> String?): String? = try {
        read()?.takeIf { it.isNotBlank() }
    } catch (e: Exception) {
        null
    }

    companion object {
        /** The preferences file the fallback id is kept in, private to the app. */
        const val PREFERENCES = "CapacitorAppExtras"

        /** The key of the fallback id in [PREFERENCES]. */
        const val FALLBACK_KEY = "installationId"
    }
}
