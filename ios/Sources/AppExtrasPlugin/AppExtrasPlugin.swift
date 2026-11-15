import Foundation
import Capacitor

@objc(AppExtrasPlugin)
public class AppExtrasPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "AppExtrasPlugin"
    public let jsName = "AppExtras"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "forceClose", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getInfo", returnType: CAPPluginReturnPromise)
    ]
    private let implementation = ForceClose()

    @objc func forceClose(_ call: CAPPluginCall) {
        // Resolved first, so the promise settles in JavaScript before the process exits.
        call.resolve()
        implementation.forceClose()
    }

    @objc func getInfo(_ call: CAPPluginCall) {
        // Capacitor calls plugin methods on its own serial queue, not on the main thread, so the disk read does not block the UI.
        call.resolve(AppInfo.read().dictionary)
    }
}
