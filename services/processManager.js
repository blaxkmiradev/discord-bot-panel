const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const config = require('../config');
const db = require('../database');

const processes = new Map();
let ioInstance = null;

function setIO(io) {
  ioInstance = io;
}

function emit(serverId, data) {
  if (ioInstance) {
    ioInstance.to(`logs:${serverId}`).emit('log', { serverId, data });
  }
}

function getServerDir(serverId) {
  return path.join(config.serversDir, serverId);
}

function loadMeta(serverId) {
  return db.getServerMeta(serverId);
}

function saveMeta(serverId, meta) {
  db.saveServerMeta(serverId, meta);
}

function start(serverId) {
  if (processes.has(serverId)) {
    const entry = processes.get(serverId);
    if (entry.process && entry.status === 'running') {
      return { success: false, message: 'Already running' };
    }
  }

  const dir = getServerDir(serverId);
  const meta = loadMeta(serverId);
  const entryPoint = meta.entryPoint || 'index.js';
  const entryFull = path.join(dir, entryPoint);

  if (!fs.existsSync(entryFull)) {
    return { success: false, message: `Entry point not found: ${entryPoint}` };
  }

  const logs = processes.has(serverId) ? processes.get(serverId).logs : [];
  const startTime = new Date();
  const ramLimit = meta.ramLimit || 512;

  const env = {
    ...process.env,
    PATH: process.env.PATH,
    NODE_OPTIONS: `--max-old-space-size=${ramLimit}`,
  };

  const proc = spawn('node', [entryPoint], { cwd: dir, env });

  const entry = {
    process: proc, logs, status: 'running',
    pid: proc.pid, startTime,
    ramLimit, cpuLimit: meta.cpuLimit || 100,
  };
  processes.set(serverId, entry);

  const logLine = (type, data) => {
    const line = `[${new Date().toISOString()}] [${type}] ${data.toString().trimEnd()}`;
    entry.logs.push(line);
    if (entry.logs.length > 300) entry.logs.shift();
    emit(serverId, line);
  };

  proc.stdout.on('data', (d) => logLine('OUT', d));
  proc.stderr.on('data', (d) => logLine('ERR', d));
  proc.on('close', (code) => {
    const line = `[${new Date().toISOString()}] [SYS] Process exited with code ${code}`;
    entry.logs.push(line);
    entry.status = 'stopped';
    entry.process = null;
    emit(serverId, line);
  });
  proc.on('error', (err) => {
    const line = `[${new Date().toISOString()}] [SYS] Error: ${err.message}`;
    entry.logs.push(line);
    entry.status = 'stopped';
    entry.process = null;
    emit(serverId, line);
  });

  return { success: true, message: `Started PID ${proc.pid} (RAM limit: ${ramLimit}MB)` };
}

function stop(serverId) {
  const entry = processes.get(serverId);
  if (!entry || !entry.process) return { success: false, message: 'Not running' };
  entry.process.kill('SIGTERM');
  entry.status = 'stopped';
  entry.process = null;
  return { success: true, message: 'Stopped' };
}

function restart(serverId) {
  stop(serverId);
  setTimeout(() => start(serverId), 500);
  return { success: true, message: 'Restarting...' };
}

function getStatus(serverId) {
  const entry = processes.get(serverId);
  if (!entry) return { status: 'stopped', pid: null, startTime: null, cpu: 0, mem: 0 };
  let cpu = 0, mem = 0;
  if (entry.process && entry.process.pid) {
    try { const u = processUsage(entry.process.pid); cpu = u.cpu; mem = u.mem; } catch (e) {}
  }
  return { status: entry.status || 'stopped', pid: entry.pid, startTime: entry.startTime || null, ramLimit: entry.ramLimit, cpuLimit: entry.cpuLimit, cpu, mem };
}

function processUsage(pid) {
  try {
    if (process.platform === 'linux') {
      const stat = fs.readFileSync(`/proc/${pid}/stat`, 'utf8');
      const statm = fs.readFileSync(`/proc/${pid}/statm`, 'utf8');
      const parts = stat.split(/\s+/);
      const totalTime = parseInt(parts[13], 10) + parseInt(parts[14], 10);
      const seconds = os.uptime() - parseInt(parts[21], 10) / os.constants.hz;
      const cpuPercent = seconds > 0 ? (totalTime / os.constants.hz / seconds) * 100 : 0;
      const memPages = parseInt(statm.split(/\s+/)[1], 10);
      return { cpu: Math.round(cpuPercent * 100) / 100, mem: Math.round((memPages * 4) / 1024 * 100) / 100 };
    }
  } catch (e) {}
  return { cpu: 0, mem: 0 };
}

function getLogs(serverId) {
  const entry = processes.get(serverId);
  return entry ? entry.logs : [];
}

function runNpm(serverId, packages) {
  const dir = getServerDir(serverId);
  const args = ['install', ...packages.split(' ').filter(Boolean)];
  const proc = spawn('npm', args, { cwd: dir });
  const send = (data) => {
    const line = data.toString().trimEnd();
    const entry = processes.get(serverId);
    if (entry) { entry.logs.push(`[NPM] ${line}`); if (entry.logs.length > 300) entry.logs.shift(); }
    emit(serverId, `[NPM] ${line}`);
  };
  proc.stdout.on('data', send);
  proc.stderr.on('data', send);
  proc.on('close', (code) => {
    emit(serverId, `[NPM] npm install finished with code ${code}`);
  });
}

function listServers() {
  const dir = config.serversDir;
  if (!fs.existsSync(dir)) return [];
  // List from filesystem, enrich with DB meta
  return fs.readdirSync(dir)
    .filter((f) => fs.statSync(path.join(dir, f)).isDirectory())
    .map((id) => {
      const meta = loadMeta(id);
      const st = getStatus(id);
      return { id, name: meta.name || id, ...st, entryPoint: meta.entryPoint || 'index.js' };
    });
}

function getSystemStats() {
  const cpus = os.cpus();
  const cpuUsage = cpus.map(cpu => {
    const total = Object.values(cpu.times).reduce((a, b) => a + b, 0);
    return 100 - Math.round((cpu.times.idle / total) * 100 * 100) / 100;
  });
  const avgCpu = Math.round(cpuUsage.reduce((a, b) => a + b, 0) / cpuUsage.length * 100) / 100;
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  return {
    cpu: avgCpu, cpuCores: cpus.length,
    memTotal: Math.round(totalMem / 1024 / 1024),
    memUsed: Math.round(usedMem / 1024 / 1024),
    memFree: Math.round(freeMem / 1024 / 1024),
    memPercent: Math.round((usedMem / totalMem) * 100 * 100) / 100,
    uptime: os.uptime(),
  };
}

module.exports = {
  setIO, start, stop, restart, getStatus, getLogs, runNpm,
  listServers, loadMeta, saveMeta, getServerDir, getSystemStats,
};
