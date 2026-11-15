import XCTest
@testable import AppExtrasPlugin

final class ForceCloseTests: XCTestCase {
    private var scheduled: [(delay: TimeInterval, work: () -> Void)] = []
    private var exits = 0

    private func closer(delay: TimeInterval = ForceClose.defaultDelay) -> ForceClose {
        ForceClose(
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
        XCTAssertTrue(closer().forceClose())
        XCTAssertEqual(scheduled.count, 1)
        XCTAssertEqual(exits, 0)
    }

    func testExitsWhenTheScheduledWorkRuns() {
        closer().forceClose()
        scheduled.forEach { $0.work() }
        XCTAssertEqual(exits, 1)
    }

    func testWaitsTheDefaultDelay() {
        closer().forceClose()
        XCTAssertEqual(scheduled.first?.delay, 0.3)
    }

    func testASecondCallSchedulesNothing() {
        let closer = closer()
        XCTAssertTrue(closer.forceClose())
        XCTAssertFalse(closer.forceClose())
        scheduled.forEach { $0.work() }
        XCTAssertEqual(scheduled.count, 1)
        XCTAssertEqual(exits, 1)
    }

    func testConcurrentCallsScheduleOneExit() {
        let closer = closer()
        let results = UnsafeMutableBufferPointer<Bool>.allocate(capacity: 50)
        defer { results.deallocate() }
        DispatchQueue.concurrentPerform(iterations: 50) { index in
            results[index] = closer.forceClose()
        }
        XCTAssertEqual(results.filter { $0 }.count, 1)
    }

    func testTheMainQueueSchedulerRunsTheWorkOnTheMainThreadAfterTheDelay() {
        let ran = expectation(description: "scheduled work ran")
        let start = Date()
        ForceClose.onMainQueue(0.05) {
            XCTAssertTrue(Thread.isMainThread)
            XCTAssertGreaterThanOrEqual(Date().timeIntervalSince(start), 0.05)
            ran.fulfill()
        }
        wait(for: [ran], timeout: 2)
    }
}
