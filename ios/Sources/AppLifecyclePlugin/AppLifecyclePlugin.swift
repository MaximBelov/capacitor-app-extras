import Foundation
import Capacitor

@objc(AppLifecyclePlugin)
public class AppLifecyclePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "AppLifecyclePlugin"
    public let jsName = "AppLifecycle"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "forceClose", returnType: CAPPluginReturnPromise)
    ]
    private let implementation = AppLifecycle()

    @objc func forceClose(_ call: CAPPluginCall) {
        // Resolved first, so the promise settles in JavaScript before the process exits.
        call.resolve()
        implementation.forceClose()
    }
}
