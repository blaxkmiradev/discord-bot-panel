const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { requireAuth } = require('../middleware/auth');
const config = require('../config');

// Load panel data
function loadPanelData() {
  try {
    if (fs.existsSync(config.dataFile)) {
      return JSON.parse(fs.readFileSync(config.dataFile, 'utf8'));
    }
  } catch (e) {}
  return { users: [], serverLimits: { defaultRam: 512, defaultCpu: 100, maxServersPerUser: 5 } };
}

function savePanelData(data) {
  fs.writeFileSync(config.dataFile, JSON.stringify(data, null, 2));
}

// Settings page
router.get('/', requireAuth, (req, res) => {
  const cfg = config.loadConfig();
  const panelData = loadPanelData();
  res.render('settings', {
    cfg,
    panelData,
    user: req.session.user,
    flash: req.query.saved ? 'Settings saved!' : null,
    error: null,
  });
});

// Save general settings
router.post('/general', requireAuth, (req, res) => {
  const { siteName, logoUrl } = req.body;
  const cfg = config.loadConfig();
  cfg.siteName = siteName || 'Bot Panel';
  cfg.logoUrl = logoUrl || '';
  config.saveConfig(cfg);
  res.redirect('/settings?saved=1');
});

// Change admin username/password
router.post('/credentials', requireAuth, (req, res) => {
  const { currentPass, newUser, newPass, confirmPass } = req.body;
  const cfg = config.loadConfig();
  const panelData = loadPanelData();

  if (currentPass !== cfg.adminPass) {
    return res.render('settings', { cfg, panelData, user: req.session.user, flash: null, error: 'Current password is incorrect' });
  }
  if (newPass && newPass !== confirmPass) {
    return res.render('settings', { cfg, panelData, user: req.session.user, flash: null, error: 'New passwords do not match' });
  }

  if (newUser) cfg.adminUser = newUser;
  if (newPass) cfg.adminPass = newPass;
  config.saveConfig(cfg);

  req.session.user = cfg.adminUser;
  res.redirect('/settings?saved=1');
});

// Update server limits
router.post('/limits', requireAuth, (req, res) => {
  const { defaultRam, defaultCpu, maxServersPerUser } = req.body;
  const panelData = loadPanelData();
  panelData.serverLimits = {
    defaultRam: parseInt(defaultRam) || 512,
    defaultCpu: parseInt(defaultCpu) || 100,
    maxServersPerUser: parseInt(maxServersPerUser) || 5,
  };
  savePanelData(panelData);
  res.redirect('/settings?saved=1');
});

// Create sub-user
router.post('/users/create', requireAuth, (req, res) => {
  const { username, password, maxServers, maxRam } = req.body;
  const panelData = loadPanelData();
  if (!panelData.users) panelData.users = [];

  if (panelData.users.find(u => u.username === username)) {
    const cfg = config.loadConfig();
    return res.render('settings', { cfg, panelData, user: req.session.user, flash: null, error: 'Username already exists' });
  }

  panelData.users.push({
    username,
    password,
    maxServers: parseInt(maxServers) || 3,
    maxRam: parseInt(maxRam) || 512,
    servers: [],
    createdAt: new Date().toISOString(),
  });
  savePanelData(panelData);
  res.redirect('/settings?saved=1');
});

// Delete sub-user
router.post('/users/:username/delete', requireAuth, (req, res) => {
  const panelData = loadPanelData();
  panelData.users = (panelData.users || []).filter(u => u.username !== req.params.username);
  savePanelData(panelData);
  res.json({ success: true });
});

// Logo upload
router.post('/logo', requireAuth, (req, res) => {
  if (!req.files || !req.files.logo) return res.redirect('/settings');
  const file = req.files.logo;
  const ext = path.extname(file.name).toLowerCase();
  const allowed = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp'];
  if (!allowed.includes(ext)) {
    const cfg = config.loadConfig();
    const panelData = loadPanelData();
    return res.render('settings', { cfg, panelData, user: req.session.user, flash: null, error: 'Invalid file type' });
  }
  const dest = path.join(__dirname, '../public/logo' + ext);
  file.mv(dest, (err) => {
    if (err) return res.redirect('/settings');
    const cfg = config.loadConfig();
    cfg.logoUrl = '/logo' + ext;
    config.saveConfig(cfg);
    res.redirect('/settings?saved=1');
  });
});

module.exports = router;
