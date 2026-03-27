const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const pm = require('../services/processManager');
const config = require('../config');

router.get('/', requireAuth, (req, res) => {
  const servers = pm.listServers();
  const sysStats = pm.getSystemStats();
  const cfg = config.loadConfig();
  res.render('dashboard', { servers, sysStats, user: req.session.user, cfg });
});

router.get('/api/stats', requireAuth, (req, res) => {
  res.json({ system: pm.getSystemStats(), servers: pm.listServers() });
});

module.exports = router;
