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

    override private init() {
        super.init()
        manager.delegate = self
        manager.desiredAccuracy = kCLLocationAccuracyHundredMeters
        manager.allowsBackgroundLocationUpdates = true
        manager.pausesLocationUpdatesAutomatically = false
        manager.distanceFilter = 100 // meters
    }

    // MARK: - Permissions

    func requestAlwaysAuthorization() {
        manager.requestAlwaysAuthorization()
    }

    var isAuthorized: Bool {
        authorizationStatus == .authorizedAlways
    }

    // MARK: - Tracking

    func startTracking() {
        guard isAuthorized else { return }
        manager.startMonitoringSignificantLocationChanges()
        manager.startUpdatingLocation()
    }

    func stopTracking() {
        manager.stopMonitoringSignificantLocationChanges()
        manager.stopUpdatingLocation()
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

    // MARK: - CLLocationManagerDelegate

    func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        authorizationStatus = manager.authorizationStatus
        if isAuthorized {
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
    }

    func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        print("[Location] Error: \(error.localizedDescription)")
    }
}
