const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const AdmZip = require('adm-zip');
const { v4: uuidv4 } = require('uuid');
const { requireAuth } = require('../middleware/auth');
const pm = require('../services/processManager');
const config = require('../config');

// Load panel data (users, limits)
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

// Create server
router.post('/create', requireAuth, (req, res) => {
  const { name, entryPoint, ramLimit, cpuLimit } = req.body;
  const id = uuidv4().split('-')[0];
  const serverDir = pm.getServerDir(id);

  fs.mkdirSync(serverDir, { recursive: true });
  pm.saveMeta(id, {
    name: name || id,
    entryPoint: entryPoint || 'index.js',
    ramLimit: parseInt(ramLimit) || 512,
    cpuLimit: parseInt(cpuLimit) || 100,
  });

  if (req.files && req.files.botZip) {
    const zip = new AdmZip(req.files.botZip.data);
    zip.extractAllTo(serverDir, true);
  }

  res.redirect(`/servers/${id}`);
});

// Server detail page
router.get('/:id', requireAuth, (req, res) => {
  const { id } = req.params;
  const dir = pm.getServerDir(id);
  if (!fs.existsSync(dir)) return res.status(404).send('Server not found');

  const meta = pm.loadMeta(id);
  const status = pm.getStatus(id);
  const logs = pm.getLogs(id);

  res.render('server-detail', {
    serverId: id,
    meta,
    status,
    logs: logs.join('\n'),
    user: req.session.user,
  });
});

// Start
router.post('/:id/start', requireAuth, (req, res) => {
  const { ramLimit, cpuLimit } = req.body;
  const result = pm.start(req.params.id, { ramLimit, cpuLimit });
  res.json(result);
});

// Stop
router.post('/:id/stop', requireAuth, (req, res) => {
  const result = pm.stop(req.params.id);
  res.json(result);
});

// Restart
router.post('/:id/restart', requireAuth, (req, res) => {
  const result = pm.restart(req.params.id);
  res.json(result);
});

// Delete server
router.post('/:id/delete', requireAuth, (req, res) => {
  const { id } = req.params;
  pm.stop(id);
  const dir = pm.getServerDir(id);
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
  res.redirect('/');
});

// Get status (API)
router.get('/:id/status', requireAuth, (req, res) => {
  res.json(pm.getStatus(req.params.id));
});

// Get logs (API)
router.get('/:id/logs', requireAuth, (req, res) => {
  res.json({ logs: pm.getLogs(req.params.id) });
});

// Install npm package
router.post('/:id/npm', requireAuth, (req, res) => {
  const { packages } = req.body;
  if (!packages) return res.json({ success: false, message: 'No packages specified' });
  pm.runNpm(req.params.id, packages, null);
  res.json({ success: true, message: `Installing: ${packages}` });
});

// Update meta (entry point, name, limits)
router.post('/:id/meta', requireAuth, (req, res) => {
  const { name, entryPoint, ramLimit, cpuLimit } = req.body;
  const meta = pm.loadMeta(req.params.id);
  if (name) meta.name = name;
  if (entryPoint) meta.entryPoint = entryPoint;
  if (ramLimit) meta.ramLimit = parseInt(ramLimit);
  if (cpuLimit) meta.cpuLimit = parseInt(cpuLimit);
  pm.saveMeta(req.params.id, meta);
  res.json({ success: true });
});

// System stats API
router.get('/api/system-stats', requireAuth, (req, res) => {
  res.json(pm.getSystemStats());
});

// Panel data API (for admin)
router.get('/api/panel-data', requireAuth, (req, res) => {
  const data = loadPanelData();
  res.json(data);
});

// Update panel limits
router.post('/api/limits', requireAuth, (req, res) => {
  const { defaultRam, defaultCpu, maxServersPerUser } = req.body;
  const data = loadPanelData();
  data.serverLimits = {
    defaultRam: parseInt(defaultRam) || 512,
    defaultCpu: parseInt(defaultCpu) || 100,
    maxServersPerUser: parseInt(maxServersPerUser) || 5,
  };
  savePanelData(data);
  res.json({ success: true });
});

module.exports = router;
