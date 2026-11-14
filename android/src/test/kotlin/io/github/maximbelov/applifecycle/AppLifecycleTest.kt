package io.github.maximbelov.applifecycle

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertThrows
import org.junit.Assert.assertTrue
import org.junit.Test

class AppLifecycleTest {
    private val steps = mutableListOf<String>()
    private val queued = mutableListOf<Runnable>()

    private fun lifecycle(finishTask: () -> Unit = { steps += "finish" }) = AppLifecycle(
        runOnMainThread = { steps += "post"; queued += it },
        finishTask = finishTask,
        killProcess = { steps += "kill" },
    )

    private fun drainMainThread() {
        val tasks = queued.toList()
        queued.clear()
        tasks.forEach { it.run() }
    }

    @Test
    fun nothingEndsBeforeTheMainThreadRunsTheTask() {
        lifecycle().forceClose()
        assertEquals(listOf("post"), steps)
    }

    @Test
    fun finishesTheTaskThenKillsTheProcess() {
        val lifecycle = lifecycle()
        assertTrue(lifecycle.forceClose())
        drainMainThread()
        assertEquals(listOf("post", "finish", "kill"), steps)
    }

    @Test
    fun aSecondCallSchedulesNothing() {
        val lifecycle = lifecycle()
        assertTrue(lifecycle.forceClose())
        assertFalse(lifecycle.forceClose())
        drainMainThread()
        assertEquals(listOf("post", "finish", "kill"), steps)
    }

    @Test
    fun theProcessIsKilledEvenWhenFinishingTheTaskThrows() {
        val lifecycle = lifecycle(finishTask = { throw IllegalStateException("no activity") })
        lifecycle.forceClose()
        assertThrows(IllegalStateException::class.java) { drainMainThread() }
        assertEquals(listOf("post", "kill"), steps)
    }
}
