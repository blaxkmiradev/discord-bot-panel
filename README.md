# 🤖 Discord Bot Hosting Panel

> **A professional, self-hosted Discord bot management platform with real-time monitoring, resource limits, and multi-user support.**

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-Express-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/Bootstrap-5-7952B3?style=for-the-badge&logo=bootstrap&logoColor=white" alt="Bootstrap" />
  <img src="https://img.shields.io/badge/Socket.IO-Realtime-010101?style=for-the-badge&logo=socketdotio&logoColor=white" alt="Socket.IO" />
  <img src="https://img.shields.io/badge/Cloudflare-Tunnel-F38020?style=for-the-badge&logo=cloudflare&logoColor=white" alt="Cloudflare" />
</p>

---

## 📸 Screenshots

### Dashboard with Real-Time Stats
![Dashboard](https://via.placeholder.com/800x450/1a1d23/5865F2?text=Dashboard+with+Live+CPU%2FRAM+Monitoring)

### Server Management with Live Logs
![Server Management](https://via.placeholder.com/800x450/1a1d23/5865F2?text=Server+Detail+with+Real-Time+Logs)

### Settings Panel
![Settings](https://via.placeholder.com/800x450/1a1d23/5865F2?text=Settings+%26+User+Management)

---

## ✨ Features

### 🎛️ Server Management
- **Create/Delete** bot servers instantly
- **Start/Stop/Restart** with one click
- **ZIP Upload** - Deploy bots by uploading a zip file
- **File Manager** - Browse, edit, upload, delete files
- **Code Editor** - In-browser editing with syntax highlighting (Ctrl+S to save)
- **NPM Installer** - Install packages directly from the panel

### 📊 Real-Time Monitoring
- **Live CPU Usage** - Per-server and system-wide
- **Live RAM Usage** - Track memory consumption in real-time
- **Resource Graphs** - Visual progress bars for quick insights
- **Live Log Streaming** - See stdout/stderr in real-time via WebSocket

### 🔒 Resource Limits
- **RAM Limit** - Set max memory per server (64MB - 8GB)
- **CPU Limit** - Cap CPU usage percentage (10% - 100%)
- **Server Quotas** - Limit max servers per user
- **Enforced Limits** - Node.js process constraints via `NODE_OPTIONS`

### 👥 Multi-User Support
- **Sub-User Accounts** - Create accounts for team members
- **Per-User Limits** - Different quotas per user
- **Admin Panel** - Full user management
- **Secure Sessions** - Express-session based auth

### 🎨 Customization
- **Custom Branding** - Change site name
- **Logo Upload** - Upload your own logo
- **Mobile Responsive** - App-like UI on phones
- **Dark Sidebar** - Professional navigation

### 🌐 Hosting
- **Cloudflare Tunnel** - Expose locally without port forwarding
- **Quick Deploy** - Runs on any Node.js environment
- **No Database** - File-based storage for simplicity

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/blaxkmiradev/discord-bot-panel.git
cd discord-bot-panel

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your settings

# Start the panel
npm start
```

### Access
Open **http://localhost:3000**

Default credentials:
- **Username:** `admin`
- **Password:** `admin123`

⚠️ **Change the password immediately after first login!**

---

## 📁 Project Structure

```
discord-bot-panel/
├── server.js              # Main Express application
├── config.js              # Configuration loader
├── package.json           # Dependencies
├── .env.example           # Environment template
├── middleware/
│   └── auth.js            # Authentication middleware
├── routes/
│   ├── auth.js            # Login/logout routes
│   ├── dashboard.js       # Dashboard & stats API
│   ├── servers.js         # Server CRUD & process control
│   ├── files.js           # File manager routes
│   └── settings.js        # Settings & user management
├── services/
│   └── processManager.js  # Process spawning, monitoring, limits
├── views/                 # EJS templates
│   ├── layout.ejs         # Base layout with navigation
│   ├── login.ejs          # Login page
│   ├── dashboard.ejs      # Main dashboard
│   ├── server-detail.ejs  # Server management page
│   ├── file-manager.ejs   # File browser
│   ├── file-editor.ejs    # Code editor
│   └── settings.ejs       # Admin settings
├── public/
│   ├── css/
│   │   └── style.css      # Custom styles
│   └── js/
│       └── app.js         # Frontend utilities
└── servers/               # Bot directories (auto-created)
```

---

## ⚙️ Configuration

### Environment Variables (.env)

| Variable         | Default                  | Description                |
|------------------|--------------------------|----------------------------|
| `PORT`           | `3000`                   | Server port                |
| `SESSION_SECRET` | `changeme_super_secret`  | Session encryption key     |
| `ADMIN_USER`     | `admin`                  | Admin username             |
| `ADMIN_PASS`     | `admin123`               | Admin password             |

### Server Limits (via Settings UI)

| Setting                | Default | Range       | Description              |
|------------------------|---------|-------------|--------------------------|
| Default RAM Limit      | 512 MB  | 64-8192 MB  | Default memory per bot   |
| Default CPU Limit      | 100%    | 10-100%     | Default CPU cap          |
| Max Servers Per User   | 5       | 1-50        | Server quota per user    |

---

## 📱 Mobile Support

The panel is fully responsive with:
- Bottom navigation bar on mobile
- Touch-optimized buttons (44px minimum)
- Collapsible sidebar
- App-like experience on phones

---

## 🔐 Security Notes

1. **Change default credentials** before deploying
2. **Use HTTPS** in production (Cloudflare Tunnel provides this)
3. **Run behind reverse proxy** (nginx/Caddy) for production
4. **Regular backups** of the `servers/` directory
5. **Sub-users** have isolated server access

---

## 🛠️ API Endpoints

| Method | Endpoint                    | Description              |
|--------|-----------------------------|--------------------------|
| GET    | `/api/stats`                | Real-time system stats   |
| GET    | `/servers/:id/status`       | Server status & usage    |
| GET    | `/servers/:id/logs`         | Server logs              |
| POST   | `/servers/:id/start`        | Start a server           |
| POST   | `/servers/:id/stop`         | Stop a server            |
| POST   | `/servers/:id/restart`      | Restart a server         |
| POST   | `/servers/:id/npm`          | Install npm packages     |
| POST   | `/servers/:id/meta`         | Update server settings   |

---

## 🌐 Cloudflare Tunnel Setup

The panel includes built-in Cloudflare Tunnel support for easy public hosting:

```bash
# Install cloudflared (if not installed)
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64
chmod +x cloudflared-linux-amd64
sudo mv cloudflared-linux-amd64 /usr/local/bin/cloudflared

# Start tunnel
cloudflared tunnel --url http://localhost:3000
```

You'll get a public URL like: `https://your-tunnel.trycloudflare.com`

---

## 📊 System Requirements

| Resource | Minimum | Recommended |
|----------|---------|-------------|
| RAM      | 256 MB  | 1 GB+       |
| CPU      | 1 core  | 2+ cores    |
| Storage  | 1 GB    | 10 GB+      |
| Node.js  | 18+     | 20+         |

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👨‍💻 Author

**Rikixz**

- GitHub: [@blaxkmiradev](https://github.com/blaxkmiradev)
- Avatar: ![Rikixz](https://avatars.githubusercontent.com/u/246539416?s=88&u=7db1395e75bc70cf7ecbd3a1a9aa84dbc76b85ac&v=4)

---

## 🙏 Acknowledgments

- [Express.js](https://expressjs.com/) - Web framework
- [Bootstrap 5](https://getbootstrap.com/) - UI framework
- [Socket.IO](https://socket.io/) - Real-time communication
- [Cloudflare](https://cloudflare.com/) - Tunnel hosting
- [Chart.js](https://www.chartjs.org/) - Data visualization

---

<p align="center">
  <strong>Made with ❤️ by Rikixz</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/github/stars/blaxkmiradev/discord-bot-panel?style=social" alt="GitHub stars" />
  <img src="https://img.shields.io/github/forks/blaxkmiradev/discord-bot-panel?style=social" alt="GitHub forks" />
</p>
