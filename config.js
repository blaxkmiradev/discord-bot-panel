require('dotenv').config();
const path = require('path');
const db = require('./database');

module.exports = {
  port: process.env.PORT || 3000,
  sessionSecret: process.env.SESSION_SECRET || 'changeme_super_secret_key',
  serversDir: path.join(__dirname, 'servers'),
  // Load dynamic config from DB
  loadConfig() {
    const s = db.getAllSettings();
    return {
      siteName: s.site_name || 'Bot Panel',
      logoUrl: s.logo_url || '',
    };
  },
  saveConfig(cfg) {
    if (cfg.siteName !== undefined) db.setSetting('site_name', cfg.siteName);
    if (cfg.logoUrl !== undefined) db.setSetting('logo_url', cfg.logoUrl);
  },
};
