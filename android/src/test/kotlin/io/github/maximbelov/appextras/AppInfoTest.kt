package io.github.maximbelov.appextras

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Test

class AppInfoTest {
    @Test
    fun anAndroidAppIsNeverAniOSAppOnAMac() {
        assertFalse(AppInfo.read { 1L }.isiOSAppOnMac)
    }

    @Test
    fun passesTheFreeSpaceThrough() {
        assertEquals(AppInfo(false, 123_456_789_012L), AppInfo.read { 123_456_789_012L })
    }

    @Test
    fun aThrowingReadLeavesTheFreeSpaceOut() {
        assertNull(AppInfo.read { throw IllegalArgumentException("no such path") }.freeDiskBytes)
    }

    @Test
    fun aMissingOrNegativeValueLeavesTheFreeSpaceOut() {
        assertNull(AppInfo.read { null }.freeDiskBytes)
        assertNull(AppInfo.read { -1L }.freeDiskBytes)
    }

    @Test
    fun zeroFreeBytesIsAValueNotAnAbsence() {
        assertEquals(0L, AppInfo.read { 0L }.freeDiskBytes)
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
        val json = AppInfo(false, 42L).toJSObject()
        assertEquals(setOf("isiOSAppOnMac", "freeDiskBytes"), json.keys().asSequence().toSet())
        assertEquals(false, json.getBoolean("isiOSAppOnMac"))
        assertEquals(42L, json.getLong("freeDiskBytes"))
    }

    @Test
    fun theResolvedObjectLeavesOutAnUnknownFreeSpace() {
        assertEquals(setOf("isiOSAppOnMac"), AppInfo(false, null).toJSObject().keys().asSequence().toSet())
    }
}
