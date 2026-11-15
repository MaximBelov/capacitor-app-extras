package io.github.maximbelov.appextras

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertThrows
import org.junit.Assert.assertTrue
import org.junit.Test

class ForceCloseTest {
    private val steps = mutableListOf<String>()
    private val queued = mutableListOf<Runnable>()

    private fun closer(finishTask: () -> Unit = { steps += "finish" }) = ForceClose(
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
        closer().forceClose()
        assertEquals(listOf("post"), steps)
    }

    @Test
    fun finishesTheTaskThenKillsTheProcess() {
        val closer = closer()
        assertTrue(closer.forceClose())
        drainMainThread()
        assertEquals(listOf("post", "finish", "kill"), steps)
    }

    @Test
    fun aSecondCallSchedulesNothing() {
        val closer = closer()
        assertTrue(closer.forceClose())
        assertFalse(closer.forceClose())
        drainMainThread()
        assertEquals(listOf("post", "finish", "kill"), steps)
    }

    @Test
    fun theProcessIsKilledEvenWhenFinishingTheTaskThrows() {
        val closer = closer(finishTask = { throw IllegalStateException("no activity") })
        closer.forceClose()
        assertThrows(IllegalStateException::class.java) { drainMainThread() }
        assertEquals(listOf("post", "kill"), steps)
    }
}
