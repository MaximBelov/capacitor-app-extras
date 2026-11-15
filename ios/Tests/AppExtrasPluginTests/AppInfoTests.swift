import XCTest
import Capacitor
@testable import AppExtrasPlugin

private struct DiskReadFailed: Error {}

final class AppInfoTests: XCTestCase {
    private let id = "6F1C2A2E-0D0B-4E8A-9C1B-0E8D9A7B6C5D"

    func testPassesEveryValueThrough() {
        let info = AppInfo.read(isiOSAppOnMac: { true }, freeDiskBytes: { 123_456_789_012 }, installationId: { self.id })
        XCTAssertEqual(info, AppInfo(isiOSAppOnMac: true, freeDiskBytes: 123_456_789_012, installationId: id))
    }

    func testAThrowingDiskReadLeavesTheFreeSpaceOut() {
        let info = AppInfo.read(isiOSAppOnMac: { false }, freeDiskBytes: { throw DiskReadFailed() }, installationId: { self.id })
        XCTAssertEqual(info, AppInfo(isiOSAppOnMac: false, freeDiskBytes: nil, installationId: id))
    }

    func testAMissingOrNegativeValueLeavesTheFreeSpaceOut() {
        XCTAssertNil(AppInfo.read(isiOSAppOnMac: { false }, freeDiskBytes: { nil }, installationId: { self.id }).freeDiskBytes)
        XCTAssertNil(AppInfo.read(isiOSAppOnMac: { false }, freeDiskBytes: { -1 }, installationId: { self.id }).freeDiskBytes)
    }

    func testZeroFreeBytesIsAValueNotAnAbsence() {
        XCTAssertEqual(AppInfo.read(isiOSAppOnMac: { false }, freeDiskBytes: { 0 }, installationId: { self.id }).freeDiskBytes, 0)
    }

    func testTheResolvedObjectUsesTheNamesOfTheTypeScriptAPI() {
        let dictionary = AppInfo(isiOSAppOnMac: true, freeDiskBytes: 42, installationId: id).dictionary
        XCTAssertEqual(Set(dictionary.keys), ["isiOSAppOnMac", "freeDiskBytes", "installationId"])
        XCTAssertEqual(dictionary["isiOSAppOnMac"] as? Bool, true)
        XCTAssertEqual(dictionary["freeDiskBytes"] as? Int64, 42)
        XCTAssertEqual(dictionary["installationId"] as? String, id)
    }

    func testTheResolvedObjectLeavesOutAnUnknownFreeSpace() {
        let dictionary = AppInfo(isiOSAppOnMac: false, freeDiskBytes: nil, installationId: id).dictionary
        XCTAssertEqual(Set(dictionary.keys), ["isiOSAppOnMac", "installationId"])
    }

    func testCapacitorCarriesEveryValueToJavaScript() {
        // call.resolve() coerces the dictionary to a JSObject; an Int64 it could not bridge would silently vanish there.
        let info = AppInfo(isiOSAppOnMac: true, freeDiskBytes: 9_007_199_254_740_991, installationId: id)
        let object = JSTypes.coerceDictionaryToJSObject(info.dictionary)
        XCTAssertEqual(object?["isiOSAppOnMac"] as? Bool, true)
        XCTAssertEqual((object?["freeDiskBytes"] as? NSNumber)?.int64Value, 9_007_199_254_740_991)
        XCTAssertEqual(object?["installationId"] as? String, id)
    }

    func testThePluginShipsItsPrivacyManifest() throws {
        // The disk read is a required-reason API; the manifest that declares it is a resource of the Swift package.
        let url = try XCTUnwrap(Bundle.module.url(forResource: "PrivacyInfo", withExtension: "xcprivacy"))
        let plist = try XCTUnwrap(NSDictionary(contentsOf: url) as? [String: Any])
        let types = try XCTUnwrap(plist["NSPrivacyAccessedAPITypes"] as? [[String: Any]])
        let disk = try XCTUnwrap(types.first { $0["NSPrivacyAccessedAPIType"] as? String == "NSPrivacyAccessedAPICategoryDiskSpace" })
        XCTAssertEqual(disk["NSPrivacyAccessedAPITypeReasons"] as? [String], ["E174.1"])
        // The installation id is kept in UserDefaults, which is a required-reason API as well.
        let defaults = try XCTUnwrap(types.first { $0["NSPrivacyAccessedAPIType"] as? String == "NSPrivacyAccessedAPICategoryUserDefaults" })
        XCTAssertEqual(defaults["NSPrivacyAccessedAPITypeReasons"] as? [String], ["CA92.1"])
    }

    func testTheRealReadsAnswerOnThisMachine() throws {
        // A simulator runs the iOS build, not an iOS app on a Mac, and its home directory sits on a volume that has free space.
        // The id is read through a throwaway suite, so the test leaves nothing in the test host's standard defaults.
        let suite = "AppInfoTests.\(UUID().uuidString)"
        let defaults = try XCTUnwrap(UserDefaults(suiteName: suite))
        defer { defaults.removePersistentDomain(forName: suite) }
        let info = AppInfo.read(installationId: { InstallationId(defaults: defaults).current() })
        XCTAssertFalse(info.isiOSAppOnMac)
        XCTAssertGreaterThan(info.freeDiskBytes ?? 0, 0)
        XCTAssertNotNil(UUID(uuidString: info.installationId))
    }
}
