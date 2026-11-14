import Foundation

@objc public class AppLifecycle: NSObject {
    @objc public func echo(_ value: String) -> String {
        print(value)
        return value
    }
}
