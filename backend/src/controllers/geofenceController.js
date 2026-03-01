const Geofence = require('../models/Geofence');
const Child = require('../models/Child');

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

    const { name, lat, lng, radiusMeters, alertOnEntry, alertOnExit } = req.body;

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

    const { name, lat, lng, radiusMeters, alertOnEntry, alertOnExit, active } = req.body;

    if (name !== undefined) geofence.name = name;
    if (lat !== undefined) geofence.lat = lat;
    if (lng !== undefined) geofence.lng = lng;
    if (radiusMeters !== undefined) geofence.radiusMeters = radiusMeters;
    if (alertOnEntry !== undefined) geofence.alertOnEntry = alertOnEntry;
    if (alertOnExit !== undefined) geofence.alertOnExit = alertOnExit;
    if (active !== undefined) geofence.active = active;

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

// POST /geofences/check — Called by activity sync to check geofence triggers
exports.checkLocation = async (childId, lat, lng, io) => {
  try {
    const geofences = await Geofence.find({ childId, active: true });
    const Alert = require('../models/Alert');

    for (const fence of geofences) {
      const distance = getDistanceMeters(lat, lng, fence.lat, fence.lng);
      const isInside = distance <= fence.radiusMeters;

      // Simple trigger: if inside a fence zone, check if we should alert
      // For more sophisticated entry/exit, we'd need to track previous state
      if (isInside && fence.alertOnEntry) {
        // Check if we already alerted recently (within 30 min)
        const recentAlert = await Alert.findOne({
          childId,
          type: 'geofence_trigger',
          'data.geofenceId': fence._id.toString(),
          createdAt: { $gte: new Date(Date.now() - 30 * 60 * 1000) },
        });

        if (!recentAlert) {
          const alert = await Alert.create({
            parentId: fence.parentId,
            childId,
            type: 'geofence_trigger',
            message: `Entered zone: ${fence.name}`,
            data: {
              geofenceId: fence._id,
              geofenceName: fence.name,
              event: 'entry',
              lat,
              lng,
              distance: Math.round(distance),
            },
          });

          if (io) {
            io.to(`parent:${fence.parentId}`).emit('alert:new', alert);
          }
        }
      }
    }
  } catch (err) {
    console.error('[Geofence] Check error:', err.message);
  }
};

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
