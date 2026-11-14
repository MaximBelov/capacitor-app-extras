import Foundation

/// Ends the app process with `exit(0)`, a short moment after it is asked to.
///
/// The delay lets the resolved call travel back to the web view before the process goes, and keeps `exit` from racing a UIKit
/// transition that is still running. The scheduler and the exit are passed in so that the delay and the guard can be tested
/// without ending the test process; `AppLifecyclePlugin` uses the real ones.
@objc public class AppLifecycle: NSObject {
    public static let defaultDelay: TimeInterval = 0.3

    public typealias Scheduler = (_ delay: TimeInterval, _ work: @escaping () -> Void) -> Void

    private let delay: TimeInterval
    private let schedule: Scheduler
    private let terminate: () -> Void
    private let lock = NSLock()
    private var closing = false

    public init(
        delay: TimeInterval = AppLifecycle.defaultDelay,
        schedule: @escaping Scheduler = AppLifecycle.onMainQueue,
        terminate: @escaping () -> Void = { exit(0) }
    ) {
        self.delay = delay
        self.schedule = schedule
        self.terminate = terminate
    }

    /// Schedules the exit. Returns false, and schedules nothing, when an exit is already scheduled.
    @discardableResult
    @objc public func forceClose() -> Bool {
        lock.lock()
        defer { lock.unlock() }
        if closing {
            return false
        }
        closing = true
        schedule(delay, terminate)
        return true
    }

    public static func onMainQueue(_ delay: TimeInterval, _ work: @escaping () -> Void) {
        DispatchQueue.main.asyncAfter(deadline: .now() + delay, execute: work)
    }
}
