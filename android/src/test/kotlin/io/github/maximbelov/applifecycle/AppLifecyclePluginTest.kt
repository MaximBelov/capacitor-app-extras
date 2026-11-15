package io.github.maximbelov.applifecycle

import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Test

// The JavaScript reaches the plugin by the name in @CapacitorPlugin and the method by its name; a rename on either side fails only
// at run time on a phone, so it is pinned here.
class AppLifecyclePluginTest {
    @Test
    fun isRegisteredUnderTheNameTheJavaScriptUses() {
        val annotation = AppLifecyclePlugin::class.java.getAnnotation(CapacitorPlugin::class.java)
        assertNotNull(annotation)
        assertEquals("AppLifecycle", annotation!!.name)
    }

    @Test
    fun exposesForceCloseAsAPluginMethod() {
        val method = AppLifecyclePlugin::class.java.getMethod("forceClose", PluginCall::class.java)
        assertNotNull(method.getAnnotation(PluginMethod::class.java))
    }

    @Test
    fun exposesGetInfoAsAPluginMethod() {
        val method = AppLifecyclePlugin::class.java.getMethod("getInfo", PluginCall::class.java)
        assertNotNull(method.getAnnotation(PluginMethod::class.java))
    }

    @Test
    fun exposesNothingElse() {
        val methods = AppLifecyclePlugin::class.java.declaredMethods
            .filter { it.isAnnotationPresent(PluginMethod::class.java) }
            .map { it.name }
            .sorted()
        assertEquals(listOf("forceClose", "getInfo"), methods)
    }
}
