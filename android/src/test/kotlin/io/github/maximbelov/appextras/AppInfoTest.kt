package io.github.maximbelov.appextras

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Test

class AppInfoTest {
    private val id = "a1b2c3d4e5f60718"

    private fun read(readFreeDiskBytes: () -> Long?) = AppInfo.read(readFreeDiskBytes) { id }

    @Test
    fun anAndroidAppIsNeverAniOSAppOnAMac() {
        assertFalse(read { 1L }.isiOSAppOnMac)
    }

    @Test
    fun passesTheFreeSpaceThrough() {
        assertEquals(AppInfo(false, 123_456_789_012L, id), read { 123_456_789_012L })
    }

    @Test
    fun aThrowingReadLeavesTheFreeSpaceOut() {
        assertNull(read { throw IllegalArgumentException("no such path") }.freeDiskBytes)
    }

    @Test
    fun aMissingOrNegativeValueLeavesTheFreeSpaceOut() {
        assertNull(read { null }.freeDiskBytes)
        assertNull(read { -1L }.freeDiskBytes)
    }

    @Test
    fun zeroFreeBytesIsAValueNotAnAbsence() {
        assertEquals(0L, read { 0L }.freeDiskBytes)
    }

    @Test
    fun passesTheInstallationIdThrough() {
        assertEquals(id, read { 1L }.installationId)
    }

    @Test
    fun aFailingFreeSpaceReadStillAnswersTheInstallationId() {
        assertEquals(AppInfo(false, null, id), read { throw IllegalStateException("no disk") })
    }

    @Test
    fun freeBytesIsAvailableBlocksTimesBlockSize() {
        assertEquals(4096L * 1_000_000L, AppInfo.freeBytes(1_000_000L, 4096L))
        assertEquals(0L, AppInfo.freeBytes(0L, 4096L))
    }

    @Test
    fun freeBytesRefusesValuesThatCannotBeASize() {
        assertNull(AppInfo.freeBytes(-1L, 4096L))
        assertNull(AppInfo.freeBytes(10L, 0L))
        assertNull(AppInfo.freeBytes(Long.MAX_VALUE, 4096L))
    }

    @Test
    fun theResolvedObjectUsesTheNamesOfTheTypeScriptAPI() {
        val json = AppInfo(false, 42L, id).toJSObject()
        assertEquals(setOf("isiOSAppOnMac", "freeDiskBytes", "installationId"), json.keys().asSequence().toSet())
        assertEquals(false, json.getBoolean("isiOSAppOnMac"))
        assertEquals(42L, json.getLong("freeDiskBytes"))
        assertEquals(id, json.getString("installationId"))
    }

    @Test
    fun theResolvedObjectLeavesOutAnUnknownFreeSpace() {
        assertEquals(setOf("isiOSAppOnMac", "installationId"), AppInfo(false, null, id).toJSObject().keys().asSequence().toSet())
    }
}
