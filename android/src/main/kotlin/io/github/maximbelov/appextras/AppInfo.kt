package io.github.maximbelov.appextras

import com.getcapacitor.JSObject

/**
 * What `getInfo()` answers. [freeDiskBytes] is null when the platform does not report the free space; [installationId] is never
 * empty, see [InstallationId].
 */
data class AppInfo(val isiOSAppOnMac: Boolean, val freeDiskBytes: Long?, val installationId: String) {
    /** The object the promise resolves with. `freeDiskBytes` is left out, not set to null, when it is unknown. */
    fun toJSObject(): JSObject {
        val result = JSObject()
        result.put("isiOSAppOnMac", isiOSAppOnMac)
        result.put("installationId", installationId)
        if (freeDiskBytes != null) {
            result.put("freeDiskBytes", freeDiskBytes)
        }
        return result
    }

    companion object {
        /**
         * Reads the free space with [readFreeDiskBytes] and the id with [readInstallationId]. A free-space read that throws, or
         * answers nothing or a negative number, gives a null [freeDiskBytes]; nothing here fails the call. An Android app is never
         * an iOS app on a Mac.
         */
        fun read(readFreeDiskBytes: () -> Long?, readInstallationId: () -> String): AppInfo {
            val bytes = try {
                readFreeDiskBytes()
            } catch (e: Exception) {
                null
            }
            return AppInfo(
                isiOSAppOnMac = false,
                freeDiskBytes = bytes?.takeIf { it >= 0 },
                installationId = readInstallationId(),
            )
        }

        /**
         * `availableBlocksLong * blockSizeLong`, as StatFs reports them. Null for a value that cannot be a size, or a product that
         * does not fit a Long.
         */
        fun freeBytes(availableBlocks: Long, blockSize: Long): Long? {
            if (availableBlocks < 0 || blockSize <= 0) {
                return null
            }
            return try {
                Math.multiplyExact(availableBlocks, blockSize)
            } catch (e: ArithmeticException) {
                null
            }
        }
    }
}
