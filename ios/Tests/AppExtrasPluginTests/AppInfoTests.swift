import XCTest
import Capacitor
@testable import AppExtrasPlugin

private struct DiskReadFailed: Error {}

final class AppInfoTests: XCTestCase {
    func testPassesBothValuesThrough() {
        let info = AppInfo.read(isiOSAppOnMac: { true }, freeDiskBytes: { 123_456_789_012 })
        XCTAssertEqual(info, AppInfo(isiOSAppOnMac: true, freeDiskBytes: 123_456_789_012))
    }

    func testAThrowingDiskReadLeavesTheFreeSpaceOut() {
        let info = AppInfo.read(isiOSAppOnMac: { false }, freeDiskBytes: { throw DiskReadFailed() })
        XCTAssertEqual(info, AppInfo(isiOSAppOnMac: false, freeDiskBytes: nil))
    }

    func testAMissingOrNegativeValueLeavesTheFreeSpaceOut() {
        XCTAssertNil(AppInfo.read(isiOSAppOnMac: { false }, freeDiskBytes: { nil }).freeDiskBytes)
        XCTAssertNil(AppInfo.read(isiOSAppOnMac: { false }, freeDiskBytes: { -1 }).freeDiskBytes)
    }

    func testZeroFreeBytesIsAValueNotAnAbsence() {
        XCTAssertEqual(AppInfo.read(isiOSAppOnMac: { false }, freeDiskBytes: { 0 }).freeDiskBytes, 0)
    }

    func testTheResolvedObjectUsesTheNamesOfTheTypeScriptAPI() {
        let dictionary = AppInfo(isiOSAppOnMac: true, freeDiskBytes: 42).dictionary
        XCTAssertEqual(Set(dictionary.keys), ["isiOSAppOnMac", "freeDiskBytes"])
        XCTAssertEqual(dictionary["isiOSAppOnMac"] as? Bool, true)
        XCTAssertEqual(dictionary["freeDiskBytes"] as? Int64, 42)
    }

    func testTheResolvedObjectLeavesOutAnUnknownFreeSpace() {
        let dictionary = AppInfo(isiOSAppOnMac: false, freeDiskBytes: nil).dictionary
        XCTAssertEqual(Set(dictionary.keys), ["isiOSAppOnMac"])
    }

    func testCapacitorCarriesBothValuesToJavaScript() {
        // call.resolve() coerces the dictionary to a JSObject; an Int64 it could not bridge would silently vanish there.
        let object = JSTypes.coerceDictionaryToJSObject(AppInfo(isiOSAppOnMac: true, freeDiskBytes: 9_007_199_254_740_991).dictionary)
        XCTAssertEqual(object?["isiOSAppOnMac"] as? Bool, true)
        XCTAssertEqual((object?["freeDiskBytes"] as? NSNumber)?.int64Value, 9_007_199_254_740_991)
    }

    func testThePluginShipsItsPrivacyManifest() throws {
        // The disk read is a required-reason API; the manifest that declares it is a resource of the Swift package.
        let url = try XCTUnwrap(Bundle.module.url(forResource: "PrivacyInfo", withExtension: "xcprivacy"))
        let plist = try XCTUnwrap(NSDictionary(contentsOf: url) as? [String: Any])
        let types = try XCTUnwrap(plist["NSPrivacyAccessedAPITypes"] as? [[String: Any]])
        let disk = try XCTUnwrap(types.first { $0["NSPrivacyAccessedAPIType"] as? String == "NSPrivacyAccessedAPICategoryDiskSpace" })
        XCTAssertEqual(disk["NSPrivacyAccessedAPITypeReasons"] as? [String], ["E174.1"])
    }

    func testTheRealReadsAnswerOnThisMachine() {
        // A simulator runs the iOS build, not an iOS app on a Mac, and its home directory sits on a volume that has free space.
        let info = AppInfo.read()
        XCTAssertFalse(info.isiOSAppOnMac)
        XCTAssertGreaterThan(info.freeDiskBytes ?? 0, 0)
    }
}
