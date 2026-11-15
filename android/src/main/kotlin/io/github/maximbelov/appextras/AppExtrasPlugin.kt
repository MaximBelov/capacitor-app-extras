package io.github.maximbelov.appextras

import android.content.Context
import android.os.Environment
import android.os.Process
import android.os.StatFs
import android.provider.Settings
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

@CapacitorPlugin(name = "AppExtras")
class AppExtrasPlugin : Plugin() {

    private val implementation by lazy {
        ForceClose(
            runOnMainThread = { task ->
                val activity = getActivity()
                if (activity != null) activity.runOnUiThread(task) else task.run()
            },
            finishTask = { getActivity()?.finishAffinity() },
            killProcess = { Process.killProcess(Process.myPid()) },
        )
    }

    private val installationId by lazy {
        val preferences = context.getSharedPreferences(InstallationId.PREFERENCES, Context.MODE_PRIVATE)
        InstallationId(
            androidId = { Settings.Secure.getString(context.contentResolver, Settings.Secure.ANDROID_ID) },
            storedFallback = { preferences.getString(InstallationId.FALLBACK_KEY, null) },
            storeFallback = { preferences.edit().putString(InstallationId.FALLBACK_KEY, it).commit() },
        )
    }

    @PluginMethod
    fun forceClose(call: PluginCall) {
        // Resolved before the exit is scheduled, as the Cordova plugin did. The process usually dies before the result reaches
        // JavaScript, so callers must not depend on it.
        call.resolve()
        implementation.forceClose()
    }

    @PluginMethod
    fun getInfo(call: PluginCall) {
        // Capacitor runs plugin methods on its own background thread, so StatFs does not block the UI.
        val info = AppInfo.read(
            readFreeDiskBytes = {
                val stat = StatFs(Environment.getDataDirectory().path)
                AppInfo.freeBytes(stat.availableBlocksLong, stat.blockSizeLong)
            },
            readInstallationId = installationId::current,
        )
        call.resolve(info.toJSObject())
    }
}
