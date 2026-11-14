import XCTest
@testable import AppLifecyclePlugin

final class AppLifecycleTests: XCTestCase {
    private var scheduled: [(delay: TimeInterval, work: () -> Void)] = []
    private var exits = 0

    private func lifecycle(delay: TimeInterval = AppLifecycle.defaultDelay) -> AppLifecycle {
        AppLifecycle(
            delay: delay,
            schedule: { delay, work in self.scheduled.append((delay, work)) },
            terminate: { self.exits += 1 }
        )
    }

    override func setUp() {
        super.setUp()
        scheduled = []
        exits = 0
    }

    func testNothingExitsBeforeTheScheduledWorkRuns() {
        XCTAssertTrue(lifecycle().forceClose())
        XCTAssertEqual(scheduled.count, 1)
        XCTAssertEqual(exits, 0)
    }

    func testExitsWhenTheScheduledWorkRuns() {
        lifecycle().forceClose()
        scheduled.forEach { $0.work() }
        XCTAssertEqual(exits, 1)
    }

    func testWaitsTheDefaultDelay() {
        lifecycle().forceClose()
        XCTAssertEqual(scheduled.first?.delay, 0.3)
    }

    func testASecondCallSchedulesNothing() {
        let lifecycle = lifecycle()
        XCTAssertTrue(lifecycle.forceClose())
        XCTAssertFalse(lifecycle.forceClose())
        scheduled.forEach { $0.work() }
        XCTAssertEqual(scheduled.count, 1)
        XCTAssertEqual(exits, 1)
    }

    func testConcurrentCallsScheduleOneExit() {
        let lifecycle = lifecycle()
        let results = UnsafeMutableBufferPointer<Bool>.allocate(capacity: 50)
        defer { results.deallocate() }
        DispatchQueue.concurrentPerform(iterations: 50) { index in
            results[index] = lifecycle.forceClose()
        }
        XCTAssertEqual(results.filter { $0 }.count, 1)
    }

    func testTheMainQueueSchedulerRunsTheWorkOnTheMainThreadAfterTheDelay() {
        let ran = expectation(description: "scheduled work ran")
        let start = Date()
        AppLifecycle.onMainQueue(0.05) {
            XCTAssertTrue(Thread.isMainThread)
            XCTAssertGreaterThanOrEqual(Date().timeIntervalSince(start), 0.05)
            ran.fulfill()
        }
        wait(for: [ran], timeout: 2)
    }
}
