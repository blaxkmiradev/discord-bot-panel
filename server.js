require('dotenv').config();
const express = require('express');
const http = require('http');
const socketio = require('socket.io');
const session = require('express-session');
const fileUpload = require('express-fileupload');
const path = require('path');
const fs = require('fs');
const config = require('./config');
const pm = require('./services/processManager');

const app = express();
const server = http.createServer(app);
const io = socketio(server);

pm.setIO(io);

if (!fs.existsSync(config.serversDir)) {
  fs.mkdirSync(config.serversDir, { recursive: true });
}

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(fileUpload({ limits: { fileSize: 100 * 1024 * 1024 } }));
app.use(session({
  secret: config.sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 },
}));

// Inject cfg into all responses
app.use((req, res, next) => {
  res.locals.cfg = config.loadConfig();
  next();
});

app.use('/', require('./routes/auth'));
app.use('/', require('./routes/dashboard'));
app.use('/servers', require('./routes/servers'));
app.use('/files', require('./routes/files'));
app.use('/settings', require('./routes/settings'));

io.on('connection', (socket) => {
  socket.on('join-logs', (serverId) => {
    socket.join(`logs:${serverId}`);
    const logs = pm.getLogs(serverId);
    socket.emit('log-history', { logs });
  });
  socket.on('leave-logs', (serverId) => {
    socket.leave(`logs:${serverId}`);
  });
});

// Broadcast system stats every 2s
setInterval(() => {
  io.emit('system-stats', pm.getSystemStats());
  pm.listServers().forEach(s => {
    io.to(`logs:${s.id}`).emit('server-status', pm.getStatus(s.id));
  });
}, 2000);

server.listen(config.port, () => {
  const cfg = config.loadConfig();
  console.log(`${cfg.siteName} running on http://localhost:${config.port}`);
  console.log(`Admin: ${cfg.adminUser}`);
});
