package io.github.maximbelov.appextras

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.util.UUID

class InstallationIdTest {
    private var stored: String? = null
    private var stores = 0

    private fun installationId(androidId: () -> String?, newId: () -> String = { "NEW-1" }) = InstallationId(
        androidId = androidId,
        storedFallback = { stored },
        storeFallback = { stored = it; stores++ },
        newId = newId,
    )

    @Test
    fun answersAndroidIdAsItIs() {
        assertEquals("a1b2c3d4e5f60718", installationId({ "a1b2c3d4e5f60718" }).current())
    }

    @Test
    fun storesNothingWhenAndroidIdIsThere() {
        installationId({ "a1b2c3d4e5f60718" }).current()
        assertNull(stored)
        assertEquals(0, stores)
    }

    @Test
    fun aMissingAndroidIdGivesANewIdThatIsStored() {
        assertEquals("NEW-1", installationId({ null }).current())
        assertEquals("NEW-1", stored)
    }

    @Test
    fun aBlankOrThrowingAndroidIdCountsAsMissing() {
        assertEquals("NEW-1", installationId({ "" }).current())
        stored = null
        assertEquals("NEW-1", installationId({ throw SecurityException("denied") }).current())
    }

    @Test
    fun aStoredFallbackIsKeptWhenAndroidIdComesBack() {
        val id = installationId({ null }, newId = { "NEW-1" })
        assertEquals("NEW-1", id.current())
        assertEquals("NEW-1", installationId({ "a1b2c3d4e5f60718" }, newId = { "NEW-2" }).current())
        assertEquals(1, stores)
    }

    @Test
    fun isNeverEmpty() {
        val id = installationId({ null }, newId = { "" }).current()
        assertNotEquals("", id)
        assertEquals(id, UUID.fromString(id).toString())
    }

    @Test
    fun aFailingStoreStillAnswersAnId() {
        val id = InstallationId(
            androidId = { null },
            storedFallback = { throw IllegalStateException("no preferences") },
            storeFallback = { throw IllegalStateException("no preferences") },
            newId = { "NEW-1" },
        )
        assertEquals("NEW-1", id.current())
    }

    @Test
    fun theDefaultNewIdIsARandomUuid() {
        val id = InstallationId(androidId = { null }, storedFallback = { null }, storeFallback = {}).current()
        assertTrue(id.isNotBlank())
        assertEquals(id, UUID.fromString(id).toString())
    }
}
