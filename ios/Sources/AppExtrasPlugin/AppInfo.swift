import Foundation

/// What `getInfo()` answers, and how it is read.
///
/// The two reads are passed in so that the mapping can be tested without depending on the machine the tests run on;
/// `AppExtrasPlugin` uses the real ones.
public struct AppInfo: Equatable {
    public let isiOSAppOnMac: Bool
    /// Nil when the system does not report the free space.
    public let freeDiskBytes: Int64?

    public init(isiOSAppOnMac: Bool, freeDiskBytes: Int64?) {
        self.isiOSAppOnMac = isiOSAppOnMac
        self.freeDiskBytes = freeDiskBytes
    }

    /// The object the promise resolves with. `freeDiskBytes` is left out, not set to null, when it is unknown.
    public var dictionary: [String: Any] {
        var result: [String: Any] = ["isiOSAppOnMac": isiOSAppOnMac]
        if let freeDiskBytes = freeDiskBytes {
            result["freeDiskBytes"] = freeDiskBytes
        }
        return result
    }

    /// Reads both values. A disk read that throws, or reports nothing or a negative number, gives a nil `freeDiskBytes`.
    public static func read(
        isiOSAppOnMac: () -> Bool = AppInfo.processIsiOSAppOnMac,
        freeDiskBytes: () throws -> Int64? = AppInfo.homeVolumeAvailableCapacity
    ) -> AppInfo {
        var bytes: Int64?
        if let value = try? freeDiskBytes(), value >= 0 {
            bytes = value
        }
        return AppInfo(isiOSAppOnMac: isiOSAppOnMac(), freeDiskBytes: bytes)
    }

    public static func processIsiOSAppOnMac() -> Bool {
        ProcessInfo.processInfo.isiOSAppOnMac
    }

    /// Free space for "important" use on the volume of the app's home directory: what the system would make available for a
    /// download the user asked for, including purgeable space it can reclaim. This is a required-reason API
    /// (NSPrivacyAccessedAPICategoryDiskSpace).
    public static func homeVolumeAvailableCapacity() throws -> Int64? {
        let values = try URL(fileURLWithPath: NSHomeDirectory())
            .resourceValues(forKeys: [.volumeAvailableCapacityForImportantUsageKey])
        return values.volumeAvailableCapacityForImportantUsage
    }
}
