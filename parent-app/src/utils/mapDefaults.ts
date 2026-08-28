/**
 * Default map camera for every MapView in the app.
 *
 * Centred on Ulaanbaatar, Mongolia — this is only the *fallback* used when the
 * child has no location fix yet (and no geofence to centre on). As soon as real
 * coordinates exist the map centres on those instead.
 */
export const DEFAULT_REGION = {
  latitude: 47.9184,
  longitude: 106.9177,
  latitudeDelta: 0.12,
  longitudeDelta: 0.12,
};
