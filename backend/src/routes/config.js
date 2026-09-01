const express = require('express');
const router = express.Router();
const AppSetting = require('../models/AppSetting');
const { otpRequired } = require('../controllers/otpController');

// GET /config/app — Public (no auth): app-wide config for both apps.
// Returns editable legal terms + tutorial video URL. Missing keys → null.
router.get('/app', async (req, res, next) => {
  try {
    const keys = ['terms.parent', 'terms.child', 'tutorial.videoUrl'];
    const map = await AppSetting.getMap(keys);

    const valueOf = (k) => (map[k] && map[k].value !== undefined ? map[k].value : null);
    // updatedAt = most recent change across the returned settings (null if none set)
    const updatedAt = keys.reduce((latest, k) => {
      const u = map[k] && map[k].updatedAt ? new Date(map[k].updatedAt) : null;
      return u && (!latest || u > latest) ? u : latest;
    }, null);

    res.json({
      otpEnabled: otpRequired(),
      termsParent: valueOf('terms.parent'),
      termsChild: valueOf('terms.child'),
      tutorialVideoUrl: valueOf('tutorial.videoUrl'),
      updatedAt,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
