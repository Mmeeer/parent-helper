import Foundation
import BackgroundTasks

final class BackgroundTaskManager {
    static let shared = BackgroundTaskManager()

    static let heartbeatTaskId = "com.primekids.child.heartbeat"
    static let syncTaskId = "com.primekids.child.activitySync"

    private init() {}

    /// Register background tasks — call from application(_:didFinishLaunchingWithOptions:)
    func registerTasks() {
        BGTaskScheduler.shared.register(
            forTaskWithIdentifier: Self.heartbeatTaskId,
            using: nil
        ) { task in
            self.handleHeartbeat(task as! BGAppRefreshTask)
        }

        BGTaskScheduler.shared.register(
            forTaskWithIdentifier: Self.syncTaskId,
            using: nil
        ) { task in
            self.handleActivitySync(task as! BGProcessingTask)
        }
    }

    /// Schedule both background tasks — call after pairing and on each app foreground
    func scheduleTasks() {
        scheduleHeartbeat()
        scheduleActivitySync()
    }

    // MARK: - Heartbeat (BGAppRefreshTask — ~15 min interval)

    private func scheduleHeartbeat() {
        let request = BGAppRefreshTaskRequest(identifier: Self.heartbeatTaskId)
        request.earliestBeginDate = Date(timeIntervalSinceNow: 15 * 60) // 15 minutes
        do {
            try BGTaskScheduler.shared.submit(request)
        } catch {
            print("[BGTask] Heartbeat schedule failed: \(error.localizedDescription)")
        }
    }

    private func handleHeartbeat(_ task: BGAppRefreshTask) {
        // Schedule next heartbeat immediately
        scheduleHeartbeat()

        let syncTask = Task {
            await ActivitySyncService.shared.sendHeartbeat()
            task.setTaskCompleted(success: true)
        }

        task.expirationHandler = {
            syncTask.cancel()
            task.setTaskCompleted(success: false)
        }
    }

    // MARK: - Activity Sync (BGProcessingTask — ~15 min interval)

    private func scheduleActivitySync() {
        let request = BGProcessingTaskRequest(identifier: Self.syncTaskId)
        request.earliestBeginDate = Date(timeIntervalSinceNow: 15 * 60)
        request.requiresNetworkConnectivity = true
        do {
            try BGTaskScheduler.shared.submit(request)
        } catch {
            print("[BGTask] Sync schedule failed: \(error.localizedDescription)")
        }
    }

    private func handleActivitySync(_ task: BGProcessingTask) {
        // Schedule next sync
        scheduleActivitySync()

        let syncTask = Task {
            await ActivitySyncService.shared.syncNow()
            await RuleManager.shared.refreshRules()
            task.setTaskCompleted(success: true)
        }

        task.expirationHandler = {
            syncTask.cancel()
            task.setTaskCompleted(success: false)
        }
    }
}
