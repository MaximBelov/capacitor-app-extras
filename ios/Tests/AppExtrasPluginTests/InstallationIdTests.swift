import XCTest
@testable import AppExtrasPlugin

final class InstallationIdTests: XCTestCase {
    private var suite = ""
    private var defaults: UserDefaults!

    override func setUpWithError() throws {
        try super.setUpWithError()
        suite = "InstallationIdTests.\(UUID().uuidString)"
        defaults = try XCTUnwrap(UserDefaults(suiteName: suite))
    }

    override func tearDown() {
        defaults.removePersistentDomain(forName: suite)
        super.tearDown()
    }

    private func installationId(vendorId: String? = "VENDOR-1", newId: String = "NEW-1") -> InstallationId {
        InstallationId(defaults: defaults, vendorId: { vendorId }, newId: { newId })
    }

    func testUsesTheKeyCordovaPluginDeviceKeptItsUuidUnder() {
        XCTAssertEqual(InstallationId.defaultsKey, "CDVUUID")
    }

    func testKeepsAnIdThatIsAlreadyStored() {
        defaults.set("FROM-CORDOVA", forKey: "CDVUUID")
        XCTAssertEqual(installationId().current(), "FROM-CORDOVA")
        XCTAssertEqual(defaults.string(forKey: "CDVUUID"), "FROM-CORDOVA")
    }

    func testStoresTheVendorIdWhenNothingIsStored() {
        XCTAssertEqual(installationId(vendorId: "VENDOR-1").current(), "VENDOR-1")
        XCTAssertEqual(defaults.string(forKey: "CDVUUID"), "VENDOR-1")
    }

    func testALaterVendorIdChangeDoesNotMoveTheId() {
        XCTAssertEqual(installationId(vendorId: "VENDOR-1").current(), "VENDOR-1")
        XCTAssertEqual(installationId(vendorId: "VENDOR-2").current(), "VENDOR-1")
        XCTAssertEqual(defaults.string(forKey: "CDVUUID"), "VENDOR-1")
    }

    func testStoresANewIdWhenThereIsNoVendorId() {
        XCTAssertEqual(installationId(vendorId: nil, newId: "NEW-1").current(), "NEW-1")
        XCTAssertEqual(installationId(vendorId: "VENDOR-1", newId: "NEW-2").current(), "NEW-1")
    }

    func testAnEmptyVendorIdCountsAsNone() {
        XCTAssertEqual(installationId(vendorId: "", newId: "NEW-1").current(), "NEW-1")
    }

    func testAnEmptyStoredValueIsReplaced() {
        defaults.set("", forKey: "CDVUUID")
        XCTAssertEqual(installationId(vendorId: "VENDOR-1").current(), "VENDOR-1")
        XCTAssertEqual(defaults.string(forKey: "CDVUUID"), "VENDOR-1")
    }

    func testIsNeverEmpty() {
        let id = installationId(vendorId: nil, newId: "").current()
        XCTAssertNotNil(UUID(uuidString: id))
        XCTAssertEqual(defaults.string(forKey: "CDVUUID"), id)
    }

    func testConcurrentFirstCallsAllAnswerTheSameId() {
        let ids = UnsafeMutableBufferPointer<String>.allocate(capacity: 50)
        ids.initialize(repeating: "")
        defer { ids.deallocate() }
        DispatchQueue.concurrentPerform(iterations: 50) { index in
            ids[index] = InstallationId(defaults: defaults, vendorId: { nil }).current()
        }
        XCTAssertEqual(Set(ids).count, 1)
        XCTAssertEqual(defaults.string(forKey: "CDVUUID"), ids[0])
    }

    func testTheRealVendorIdAnswersOnThisMachineFromAnyThread() {
        // A simulator has a vendor id; the read hops to the main thread when it is called from another one.
        XCTAssertNotNil(InstallationId.deviceVendorId())
        let read = expectation(description: "read off the main thread")
        DispatchQueue.global().async {
            XCTAssertNotNil(InstallationId.deviceVendorId())
            read.fulfill()
        }
        wait(for: [read], timeout: 5)
    }
}
