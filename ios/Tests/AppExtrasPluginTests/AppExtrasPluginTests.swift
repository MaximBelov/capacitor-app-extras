import XCTest
import Capacitor
@testable import AppExtrasPlugin

// The JavaScript reaches the plugin by jsName and the method by its name; a rename on either side fails only at run time on a
// phone, so it is pinned here.
final class AppExtrasPluginTests: XCTestCase {
    func testIsRegisteredUnderTheNameTheJavaScriptUses() {
        let plugin = AppExtrasPlugin()
        XCTAssertEqual(plugin.jsName, "AppExtras")
    }

    func testExposesForceCloseAndGetInfoAsPromiseMethodsAndNothingElse() {
        let methods = AppExtrasPlugin().pluginMethods
        XCTAssertEqual(methods.map { $0.name }, ["forceClose", "getInfo"])
        XCTAssertEqual(methods.map { $0.returnType }, [CAPPluginReturnPromise, CAPPluginReturnPromise])
    }

    func testEveryMethodNameHasAnObjectiveCSelector() {
        // Capacitor calls a method through the selector "<name>:"; a missing @objc compiles fine and fails on the phone.
        for name in ["forceClose", "getInfo"] {
            XCTAssertTrue(AppExtrasPlugin().responds(to: NSSelectorFromString("\(name):")), name)
        }
    }
}
