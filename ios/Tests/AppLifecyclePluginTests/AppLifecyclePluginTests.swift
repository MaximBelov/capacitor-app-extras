import XCTest
import Capacitor
@testable import AppLifecyclePlugin

// The JavaScript reaches the plugin by jsName and the method by its name; a rename on either side fails only at run time on a
// phone, so it is pinned here.
final class AppLifecyclePluginTests: XCTestCase {
    func testIsRegisteredUnderTheNameTheJavaScriptUses() {
        let plugin = AppLifecyclePlugin()
        XCTAssertEqual(plugin.jsName, "AppLifecycle")
    }

    func testExposesForceCloseAsAPromiseMethodAndNothingElse() {
        let methods = AppLifecyclePlugin().pluginMethods
        XCTAssertEqual(methods.map { $0.name }, ["forceClose"])
        XCTAssertEqual(methods.first?.returnType, CAPPluginReturnPromise)
    }

    func testTheMethodNameHasAnObjectiveCSelector() {
        // Capacitor calls the method through the selector "forceClose:"; a missing @objc compiles fine and fails on the phone.
        XCTAssertTrue(AppLifecyclePlugin().responds(to: NSSelectorFromString("forceClose:")))
    }
}
