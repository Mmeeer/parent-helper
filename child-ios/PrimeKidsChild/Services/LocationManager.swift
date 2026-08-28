import Foundation
import CoreLocation

final class LocationManager: NSObject, ObservableObject, CLLocationManagerDelegate {
    static let shared = LocationManager()

    private let manager = CLLocationManager()
    @Published var authorizationStatus: CLAuthorizationStatus = .notDetermined
    @Published var lastLocation: CLLocation?

    // Buffer locations for sync
    private var locationBuffer: [LocationEntry] = []
    private let bufferLock = NSLock()

    /// Live-tracking throttle: at most one upload per minute while the child is moving.
    private let uploadThrottle: TimeInterval = 60
    private var lastUploadAt: Date = .distantPast
    private let uploadLock = NSLock()

    override private init() {
        super.init()
        manager.delegate = self
        manager.desiredAccuracy = kCLLocationAccuracyHundredMeters
        manager.pausesLocationUpdatesAutomatically = false
        manager.distanceFilter = 100 // meters
        manager.showsBackgroundLocationIndicator = false
        authorizationStatus = manager.authorizationStatus
        manager.allowsBackgroundLocationUpdates = (authorizationStatus == .authorizedAlways)
    }

    // MARK: - Permissions

    /// Two-step per Apple guidance: WhenInUse first (system prompt), then Always.
    /// Calling requestAlways from .notDetermined shows the WhenInUse prompt; iOS asks
    /// for the Always upgrade later once background location is actually used.
    func requestAlwaysAuthorization() {
        switch manager.authorizationStatus {
        case .notDetermined: manager.requestWhenInUseAuthorization()
        case .authorizedWhenInUse: manager.requestAlwaysAuthorization()
        default: break
        }
    }

    /// Background ("Always") permission — what the product needs.
    var isAuthorized: Bool {
        if Demo.isOn { return true }
        return authorizationStatus == .authorizedAlways
    }

    /// Any location permission (foreground tracking still works with WhenInUse).
    var canTrack: Bool {
        authorizationStatus == .authorizedAlways || authorizationStatus == .authorizedWhenInUse
    }

    // MARK: - Tracking

    func startTracking() {
        guard canTrack else { return }
        manager.allowsBackgroundLocationUpdates = isAuthorized
        if isAuthorized { manager.startMonitoringSignificantLocationChanges() }
        manager.startUpdatingLocation()
    }

    func stopTracking() {
        manager.stopMonitoringSignificantLocationChanges()
        manager.stopUpdatingLocation()
    }

    /// Ask iOS for a single fresh fix (used by the parent's "Find location" command).
    func requestFreshFix() {
        guard canTrack else { return }
        uploadLock.lock(); lastUploadAt = .distantPast; uploadLock.unlock()
        manager.requestLocation()
    }

    /// Get current location for SOS or on-demand locate
    func getCurrentLocation() async -> CLLocation? {
        if let loc = lastLocation, abs(loc.timestamp.timeIntervalSinceNow) < 60 {
            return loc
        }
        manager.requestLocation()
        // Wait briefly for location update
        try? await Task.sleep(nanoseconds: 3_000_000_000)
        return lastLocation
    }

    // MARK: - Buffer Management

    func drainLocations() -> [LocationEntry] {
        bufferLock.lock()
        defer { bufferLock.unlock() }
        let entries = locationBuffer
        locationBuffer.removeAll()
        return entries
    }

    /// Put entries back (front of the buffer) after a failed upload; keeps the ring-buffer cap.
    func requeue(_ entries: [LocationEntry]) {
        guard !entries.isEmpty else { return }
        bufferLock.lock()
        defer { bufferLock.unlock() }
        locationBuffer.insert(contentsOf: entries, at: 0)
        if locationBuffer.count > 500 { locationBuffer.removeFirst(locationBuffer.count - 500) }
    }

    // MARK: - CLLocationManagerDelegate

    func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        authorizationStatus = manager.authorizationStatus
        if authorizationStatus == .authorizedWhenInUse {
            // Ask for the Always upgrade right away (system decides whether to prompt now or later).
            manager.requestAlwaysAuthorization()
        }
        if canTrack && PrefsManager.shared.isPaired {
            startTracking()
        }
    }

    func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard let location = locations.last else { return }
        lastLocation = location

        let entry = LocationEntry(
            lat: location.coordinate.latitude,
            lng: location.coordinate.longitude,
            timestamp: ISO8601DateFormatter().string(from: location.timestamp)
        )

        bufferLock.lock()
        locationBuffer.append(entry)
        // Keep buffer reasonable
        if locationBuffer.count > 500 {
            locationBuffer = Array(locationBuffer.suffix(500))
        }
        bufferLock.unlock()

        // Push the fix to the backend right away (throttled) so the parent's map is live
        // instead of waiting for the next background refresh, which iOS may delay ~15 min.
        uploadIfDue()
    }

    /// Uploads buffered fixes at most once every `uploadThrottle` seconds. iOS keeps the app
    /// running briefly for each background location delivery, which is enough for one POST.
    private func uploadIfDue() {
        guard PrefsManager.shared.isPaired else { return }
        let now = Date()
        uploadLock.lock()
        let due = now.timeIntervalSince(lastUploadAt) >= uploadThrottle
        if due { lastUploadAt = now }
        uploadLock.unlock()
        guard due else { return }
        Task { await ActivitySyncService.shared.syncNow() }
    }

    func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        print("[Location] Error: \(error.localizedDescription)")
    }
}
