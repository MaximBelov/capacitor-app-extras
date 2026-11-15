package io.github.maximbelov.appextras

import android.os.Environment
import android.os.Process
import android.os.StatFs
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
        val info = AppInfo.read {
            val stat = StatFs(Environment.getDataDirectory().path)
            AppInfo.freeBytes(stat.availableBlocksLong, stat.blockSizeLong)
        }
        call.resolve(info.toJSObject())
    }
}
