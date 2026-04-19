const GeoCache = require('../models/GeoCache');

// Round to 4 decimal places (~11m precision) for cache key grouping
function roundCoord(val) {
  return Math.round(val * 10000) / 10000;
}

/**
 * POST /geocode/reverse
 * Body: { lat, lng }
 * Returns: { address, cached }
 *
 * Checks MongoDB cache first. Only calls Google Maps Geocoding API on cache miss.
 */
exports.reverse = async (req, res, next) => {
  try {
    const { lat, lng } = req.body;
    if (lat == null || lng == null) {
      return res.status(400).json({ error: 'lat and lng are required' });
    }

    const rLat = roundCoord(lat);
    const rLng = roundCoord(lng);

    // Check cache
    const cached = await GeoCache.findOne({ lat: rLat, lng: rLng }).lean();
    if (cached) {
      return res.json({ address: cached.address, cached: true });
    }

    // Cache miss — call Google Maps Geocoding API
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      return res.status(503).json({ error: 'Geocoding service not configured' });
    }

    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}&language=mn`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'OK' || !data.results || data.results.length === 0) {
      return res.status(404).json({ error: 'Address not found', googleStatus: data.status });
    }

    const address = data.results[0].formatted_address;

    // Store in cache (upsert to handle race conditions)
    await GeoCache.findOneAndUpdate(
      { lat: rLat, lng: rLng },
      { address, cachedAt: new Date() },
      { upsert: true },
    );

    res.json({ address, cached: false });
  } catch (err) {
    next(err);
  }
};
