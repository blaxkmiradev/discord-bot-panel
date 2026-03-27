const express = require('express');
const router = express.Router();
const path = require('path');
const db = require('../database');
const config = require('../config');

// Settings page
router.get('/', (req, res) => {
  const cfg = config.loadConfig();
  const users = db.getAllUsers();
  const defaultRam = db.getSetting('default_ram') || 512;
  const defaultCpu = db.getSetting('default_cpu') || 100;
  const maxServersPerUser = db.getSetting('max_servers_per_user') || 5;
  res.render('settings', {
    cfg,
    users,
    defaultRam,
    defaultCpu,
    maxServersPerUser,
    user: req.session.user,
    flash: req.query.saved ? 'Settings saved!' : null,
    error: null,
  });
});

// Save general settings
router.post('/general', (req, res) => {
  const { siteName, logoUrl } = req.body;
  config.saveConfig({ siteName: siteName || 'Bot Panel', logoUrl: logoUrl || '' });
  res.redirect('/settings?saved=1');
});

// Change admin credentials
router.post('/credentials', (req, res) => {
  const { currentPass, newUser, newPass, confirmPass } = req.body;
  const cfg = config.loadConfig();
  const users = db.getAllUsers();
  const defaultRam = db.getSetting('default_ram') || 512;
  const defaultCpu = db.getSetting('default_cpu') || 100;
  const maxServersPerUser = db.getSetting('max_servers_per_user') || 5;

  const valid = db.verifyPassword(req.session.user, currentPass);
  if (!valid) {
    return res.render('settings', { cfg, users, defaultRam, defaultCpu, maxServersPerUser, user: req.session.user, flash: null, error: 'Current password is incorrect' });
  }
  if (newPass && newPass !== confirmPass) {
    return res.render('settings', { cfg, users, defaultRam, defaultCpu, maxServersPerUser, user: req.session.user, flash: null, error: 'New passwords do not match' });
  }

  db.updateAdminCredentials(newUser || null, newPass || null);
  if (newUser) req.session.user = newUser;
  res.redirect('/settings?saved=1');
});

// Update server limits
router.post('/limits', (req, res) => {
  const { defaultRam, defaultCpu, maxServersPerUser } = req.body;
  db.setSetting('default_ram', parseInt(defaultRam) || 512);
  db.setSetting('default_cpu', parseInt(defaultCpu) || 100);
  db.setSetting('max_servers_per_user', parseInt(maxServersPerUser) || 5);
  res.redirect('/settings?saved=1');
});

// Create sub-user
router.post('/users/create', (req, res) => {
  const { username, password, maxServers, maxRam } = req.body;
  const result = db.createUser(username, password, parseInt(maxServers) || 3, parseInt(maxRam) || 512);
  if (!result.success) {
    const cfg = config.loadConfig();
    const users = db.getAllUsers();
    const defaultRam = db.getSetting('default_ram') || 512;
    const defaultCpu = db.getSetting('default_cpu') || 100;
    const maxServersPerUser = db.getSetting('max_servers_per_user') || 5;
    return res.render('settings', { cfg, users, defaultRam, defaultCpu, maxServersPerUser, user: req.session.user, flash: null, error: result.message });
  }
  res.redirect('/settings?saved=1');
});

// Delete sub-user
router.post('/users/:username/delete', (req, res) => {
  db.deleteUser(req.params.username);
  res.json({ success: true });
});

// Logo upload
router.post('/logo', (req, res) => {
  if (!req.files || !req.files.logo) return res.redirect('/settings');
  const file = req.files.logo;
  const ext = path.extname(file.name).toLowerCase();
  const allowed = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp'];
  if (!allowed.includes(ext)) {
    const cfg = config.loadConfig();
    const users = db.getAllUsers();
    const defaultRam = db.getSetting('default_ram') || 512;
    const defaultCpu = db.getSetting('default_cpu') || 100;
    const maxServersPerUser = db.getSetting('max_servers_per_user') || 5;
    return res.render('settings', { cfg, users, defaultRam, defaultCpu, maxServersPerUser, user: req.session.user, flash: null, error: 'Invalid file type' });
  }
  const dest = path.join(__dirname, '../public/logo' + ext);
  file.mv(dest, (err) => {
    if (err) return res.redirect('/settings');
    config.saveConfig({ logoUrl: '/logo' + ext });
    res.redirect('/settings?saved=1');
  });
});

module.exports = router;
