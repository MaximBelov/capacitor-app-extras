import Foundation
import UIKit

/// The id `getInfo()` answers as `installationId`: one per install of the app, never changed once it is written.
///
/// It lives in `UserDefaults` under `CDVUUID`, the key `cordova-plugin-device` kept its `device.uuid` under, so an app that moves
/// from Cordova to Capacitor keeps the id it already had. When the key is empty the vendor id is stored there, or a new random
/// UUID when the system has no vendor id yet (it can answer nil shortly after a restart, before the device is unlocked).
///
/// The defaults, the vendor id and the new UUID are passed in so that the rules can be tested without the real device;
/// `AppExtrasPlugin` uses the real ones.
public final class InstallationId {
    /// The `UserDefaults` key `cordova-plugin-device` used. Changing it gives every existing install a new id.
    public static let defaultsKey = "CDVUUID"

    private let defaults: UserDefaults
    private let vendorId: () -> String?
    private let newId: () -> String
    /// Shared by every instance, so that two calls at once cannot store two different ids.
    private static let lock = NSLock()

    public init(
        defaults: UserDefaults = .standard,
        vendorId: @escaping () -> String? = InstallationId.deviceVendorId,
        newId: @escaping () -> String = { UUID().uuidString }
    ) {
        self.defaults = defaults
        self.vendorId = vendorId
        self.newId = newId
    }

    /// The stored id; when there is none yet, the vendor id or a new UUID, stored first. Never empty.
    public func current() -> String {
        if let stored = stored() {
            return stored
        }
        // Read outside the lock: the vendor id may wait for the main thread, which could itself be waiting for the lock.
        var candidate = vendorId() ?? ""
        if candidate.isEmpty {
            candidate = newId()
        }
        if candidate.isEmpty {
            candidate = UUID().uuidString
        }
        InstallationId.lock.lock()
        defer { InstallationId.lock.unlock() }
        // Another call may have stored one in the meantime; the first one written wins.
        if let stored = stored() {
            return stored
        }
        defaults.set(candidate, forKey: InstallationId.defaultsKey)
        return candidate
    }

    private func stored() -> String? {
        guard let value = defaults.string(forKey: InstallationId.defaultsKey), !value.isEmpty else {
            return nil
        }
        return value
    }

    /// `UIDevice.current.identifierForVendor`, read on the main thread, which UIKit expects.
    public static func deviceVendorId() -> String? {
        if Thread.isMainThread {
            return MainActor.assumeIsolated { UIDevice.current.identifierForVendor?.uuidString }
        }
        return DispatchQueue.main.sync {
            MainActor.assumeIsolated { UIDevice.current.identifierForVendor?.uuidString }
        }
    }
}
