package io.github.maximbelov.appextras

import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Test

// The JavaScript reaches the plugin by the name in @CapacitorPlugin and the method by its name; a rename on either side fails only
// at run time on a phone, so it is pinned here.
class AppExtrasPluginTest {
    @Test
    fun isRegisteredUnderTheNameTheJavaScriptUses() {
        val annotation = AppExtrasPlugin::class.java.getAnnotation(CapacitorPlugin::class.java)
        assertNotNull(annotation)
        assertEquals("AppExtras", annotation!!.name)
    }

    @Test
    fun exposesForceCloseAsAPluginMethod() {
        val method = AppExtrasPlugin::class.java.getMethod("forceClose", PluginCall::class.java)
        assertNotNull(method.getAnnotation(PluginMethod::class.java))
    }

    @Test
    fun exposesGetInfoAsAPluginMethod() {
        val method = AppExtrasPlugin::class.java.getMethod("getInfo", PluginCall::class.java)
        assertNotNull(method.getAnnotation(PluginMethod::class.java))
    }

    @Test
    fun exposesNothingElse() {
        val methods = AppExtrasPlugin::class.java.declaredMethods
            .filter { it.isAnnotationPresent(PluginMethod::class.java) }
            .map { it.name }
            .sorted()
        assertEquals(listOf("forceClose", "getInfo"), methods)
    }
}
