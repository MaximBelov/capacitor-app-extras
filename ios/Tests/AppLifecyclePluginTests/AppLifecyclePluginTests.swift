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

    func testExposesForceCloseAndGetInfoAsPromiseMethodsAndNothingElse() {
        let methods = AppLifecyclePlugin().pluginMethods
        XCTAssertEqual(methods.map { $0.name }, ["forceClose", "getInfo"])
        XCTAssertEqual(methods.map { $0.returnType }, [CAPPluginReturnPromise, CAPPluginReturnPromise])
    }

    func testEveryMethodNameHasAnObjectiveCSelector() {
        // Capacitor calls a method through the selector "<name>:"; a missing @objc compiles fine and fails on the phone.
        for name in ["forceClose", "getInfo"] {
            XCTAssertTrue(AppLifecyclePlugin().responds(to: NSSelectorFromString("\(name):")), name)
        }
    }
}
