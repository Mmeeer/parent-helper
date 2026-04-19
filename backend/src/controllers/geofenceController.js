const Geofence = require('../models/Geofence');
const Child = require('../models/Child');
const { sendAlertNotification } = require('../services/pushNotification');

const verifyChild = async (childId, parentId) => {
  return Child.findOne({ _id: childId, parentId });
};

// GET /geofences/:childId
exports.list = async (req, res, next) => {
  try {
    const { childId } = req.params;
    const child = await verifyChild(childId, req.user._id);
    if (!child) return res.status(404).json({ error: 'Child not found' });

    const geofences = await Geofence.find({ childId, parentId: req.user._id })
      .sort({ createdAt: -1 });
    res.json(geofences);
  } catch (err) {
    next(err);
  }
};

// POST /geofences/:childId
exports.create = async (req, res, next) => {
  try {
    const { childId } = req.params;
    const child = await verifyChild(childId, req.user._id);
    if (!child) return res.status(404).json({ error: 'Child not found' });

    const { name, lat, lng, radiusMeters, alertOnEntry, alertOnExit, alertCooldownMinutes, hysteresisMeters } = req.body;

    if (!name || lat == null || lng == null) {
      return res.status(400).json({ error: 'Name, lat, and lng are required' });
    }

    const geofence = await Geofence.create({
      childId,
      parentId: req.user._id,
      name,
      lat,
      lng,
      radiusMeters: radiusMeters || 200,
      alertOnEntry: alertOnEntry !== false,
      alertOnExit: alertOnExit !== false,
      alertCooldownMinutes: alertCooldownMinutes != null ? alertCooldownMinutes : 30,
      hysteresisMeters: hysteresisMeters != null ? hysteresisMeters : 20,
    });

    res.status(201).json(geofence);
  } catch (err) {
    next(err);
  }
};

// PUT /geofences/:id
exports.update = async (req, res, next) => {
  try {
    const geofence = await Geofence.findOne({
      _id: req.params.id,
      parentId: req.user._id,
    });
    if (!geofence) return res.status(404).json({ error: 'Geofence not found' });

    const { name, lat, lng, radiusMeters, alertOnEntry, alertOnExit, active, alertCooldownMinutes, hysteresisMeters } = req.body;

    if (name !== undefined) geofence.name = name;
    if (lat !== undefined) geofence.lat = lat;
    if (lng !== undefined) geofence.lng = lng;
    if (radiusMeters !== undefined) geofence.radiusMeters = radiusMeters;
    if (alertOnEntry !== undefined) geofence.alertOnEntry = alertOnEntry;
    if (alertOnExit !== undefined) geofence.alertOnExit = alertOnExit;
    if (active !== undefined) geofence.active = active;
    if (alertCooldownMinutes !== undefined) geofence.alertCooldownMinutes = alertCooldownMinutes;
    if (hysteresisMeters !== undefined) geofence.hysteresisMeters = hysteresisMeters;

    await geofence.save();
    res.json(geofence);
  } catch (err) {
    next(err);
  }
};

// DELETE /geofences/:id
exports.remove = async (req, res, next) => {
  try {
    const geofence = await Geofence.findOneAndDelete({
      _id: req.params.id,
      parentId: req.user._id,
    });
    if (!geofence) return res.status(404).json({ error: 'Geofence not found' });

    res.json({ message: 'Geofence deleted' });
  } catch (err) {
    next(err);
  }
};

/**
 * Check geofence entry/exit for multiple location points.
 * Processes locations chronologically to catch transitions between syncs.
 * @param {string} childId
 * @param {Array<{lat: number, lng: number, timestamp?: string}>} locations - all location points from this sync
 * @param {object} io - socket.io instance
 * @returns {object} geofenceStates - map of geofenceId → boolean (inside)
 */
exports.checkLocations = async (childId, locations, io) => {
  const geofenceStates = {};
  try {
    if (!locations || locations.length === 0) return geofenceStates;

    const geofences = await Geofence.find({ childId, active: true });
    const Alert = require('../models/Alert');

    // Sort locations chronologically
    const sortedLocations = [...locations].sort(
      (a, b) => new Date(a.timestamp || 0) - new Date(b.timestamp || 0),
    );

    for (const fence of geofences) {
      const fenceId = fence._id.toString();
      const hysteresis = fence.hysteresisMeters || 20;
      const cooldownMs = (fence.alertCooldownMinutes || 30) * 60 * 1000;

      let wasInside = (fence.childrenInside || []).some(
        (id) => id.toString() === childId.toString(),
      );

      // Process each location point to detect all transitions
      for (const loc of sortedLocations) {
        const distance = getDistanceMeters(loc.lat, loc.lng, fence.lat, fence.lng);

        // Hysteresis: use radius for entry threshold, radius + buffer for exit threshold.
        // This prevents rapid toggling when GPS drifts near the boundary.
        const isInside = wasInside
          ? distance <= fence.radiusMeters + hysteresis  // already inside: must move beyond radius + buffer to exit
          : distance <= fence.radiusMeters;              // outside: must cross radius to enter

        if (isInside && !wasInside) {
          // --- ENTRY ---
          await Geofence.findByIdAndUpdate(fence._id, {
            $addToSet: { childrenInside: childId },
          });

          if (fence.alertOnEntry && !(await isInCooldown(Alert, fence, childId, 'entry', cooldownMs))) {
            const alert = await Alert.create({
              parentId: fence.parentId,
              childId,
              type: 'geofence_trigger',
              message: `Entered zone: ${fence.name}`,
              data: {
                geofenceId: fence._id,
                geofenceName: fence.name,
                event: 'entry',
                lat: loc.lat,
                lng: loc.lng,
                distance: Math.round(distance),
              },
            });
            if (io) io.to(`parent:${fence.parentId}`).emit('alert:new', alert);
            sendAlertNotification(fence.parentId, alert);
          }
          wasInside = true;
        } else if (!isInside && wasInside) {
          // --- EXIT ---
          await Geofence.findByIdAndUpdate(fence._id, {
            $pull: { childrenInside: childId },
          });

          if (fence.alertOnExit && !(await isInCooldown(Alert, fence, childId, 'exit', cooldownMs))) {
            const alert = await Alert.create({
              parentId: fence.parentId,
              childId,
              type: 'geofence_trigger',
              message: `Left zone: ${fence.name}`,
              data: {
                geofenceId: fence._id,
                geofenceName: fence.name,
                event: 'exit',
                lat: loc.lat,
                lng: loc.lng,
                distance: Math.round(distance),
              },
            });
            if (io) io.to(`parent:${fence.parentId}`).emit('alert:new', alert);
            sendAlertNotification(fence.parentId, alert);
          }
          wasInside = false;
        }
      }

      geofenceStates[fenceId] = wasInside;
    }
  } catch (err) {
    console.error('[Geofence] Check error:', err.message);
  }
  return geofenceStates;
};

// Backward-compatible single-location wrapper
exports.checkLocation = async (childId, lat, lng, io) => {
  return exports.checkLocations(childId, [{ lat, lng, timestamp: new Date().toISOString() }], io);
};

/**
 * Check if a geofence alert of the same event type was created within the cooldown window.
 */
async function isInCooldown(Alert, fence, childId, event, cooldownMs) {
  if (cooldownMs <= 0) return false;

  const cutoff = new Date(Date.now() - cooldownMs);
  const recentAlert = await Alert.findOne({
    childId,
    type: 'geofence_trigger',
    'data.geofenceId': fence._id,
    'data.event': event,
    createdAt: { $gte: cutoff },
  }).lean();

  return !!recentAlert;
}

function getDistanceMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000; // Earth radius in meters
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg) {
  return (deg * Math.PI) / 180;
}
