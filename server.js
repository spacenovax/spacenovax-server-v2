const express = require("express");
const cors = require("cors");
const sqlite3 = require("sqlite3").verbose();
const { v4: uuidv4 } = require("uuid");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_KEY = process.env.ADMIN_KEY || "spacenovax-admin";

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const db = new sqlite3.Database("./spacenovax.db");

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      telegram_id TEXT UNIQUE,
      username TEXT,
      invite_code TEXT UNIQUE,
      referrer_code TEXT,
      points INTEGER DEFAULT 100,
      wallet TEXT,
      last_mining_at TEXT,
      is_blocked INTEGER DEFAULT 0,
      created_at TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS missions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT,
      mission_key TEXT,
      reward INTEGER,
      status TEXT DEFAULT 'completed',
      completed_at TEXT,
      UNIQUE(user_id, mission_key)
    )
  `);
});

function nowIso() {
  return new Date().toISOString();
}

function makeInviteCode(username) {
  const prefix = username ? username.replace(/[^a-zA-Z0-9]/g, "").slice(0, 6).toUpperCase() : "SPNX";
  const random = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}${random}`;
}

function missionReward(key) {
  const rewards = {
    website: 100,
    youtube: 300,
    x: 300,
    telegram_group: 200,
    telegram_channel: 200,
    discord: 300
  };
  return rewards[key] || 0;
}

function requireAdmin(req, res, next) {
  const key = req.headers["x-admin-key"] || req.query.key;
  if (key !== ADMIN_KEY) {
    return res.status(401).json({ error: "unauthorized" });
  }
  next();
}

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin.html"));
});

app.get("/api/health", (req, res) => {
  res.json({
    project: "SpaceNovaX",
    status: "running",
    version: "2.0.0",
    point: "SNP",
    future_token: "SPNX",
    network: "Solana planned"
  });
});

app.post("/api/register", (req, res) => {
  const { telegram_id, username, referrer_code } = req.body;

  if (!telegram_id) return res.status(400).json({ error: "telegram_id is required" });

  db.get("SELECT * FROM users WHERE telegram_id = ?", [telegram_id], (err, user) => {
    if (err) return res.status(500).json({ error: err.message });
    if (user) return res.json({ user });

    const id = uuidv4();
    const invite_code = makeInviteCode(username);
    const created_at = nowIso();

    db.run(
      `INSERT INTO users (id, telegram_id, username, invite_code, referrer_code, points, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, telegram_id, username || "", invite_code, referrer_code || "", 100, created_at],
      function (err) {
        if (err) return res.status(500).json({ error: err.message });

        if (referrer_code) {
          db.run("UPDATE users SET points = points + 500 WHERE invite_code = ?", [referrer_code]);
        }

        db.get("SELECT * FROM users WHERE id = ?", [id], (err, newUser) => {
          if (err) return res.status(500).json({ error: err.message });
          res.json({ user: newUser });
        });
      }
    );
  });
});

app.get("/api/user/:telegram_id", (req, res) => {
  db.get("SELECT * FROM users WHERE telegram_id = ?", [req.params.telegram_id], (err, user) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!user) return res.status(404).json({ error: "user not found" });
    res.json({ user });
  });
});

app.post("/api/mine", (req, res) => {
  const { telegram_id } = req.body;
  if (!telegram_id) return res.status(400).json({ error: "telegram_id is required" });

  db.get("SELECT * FROM users WHERE telegram_id = ?", [telegram_id], (err, user) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!user) return res.status(404).json({ error: "user not found" });
    if (user.is_blocked) return res.status(403).json({ error: "user blocked" });

    if (user.last_mining_at) {
      const last = new Date(user.last_mining_at);
      const next = new Date(last.getTime() + 24 * 60 * 60 * 1000);
      if (new Date() < next) {
        const remainingMs = next.getTime() - new Date().getTime();
        return res.status(429).json({
          error: "mining cooldown",
          remaining_seconds: Math.ceil(remainingMs / 1000)
        });
      }
    }

    db.run(
      "UPDATE users SET points = points + 100, last_mining_at = ? WHERE telegram_id = ?",
      [nowIso(), telegram_id],
      function (err) {
        if (err) return res.status(500).json({ error: err.message });

        db.get("SELECT * FROM users WHERE telegram_id = ?", [telegram_id], (err, updated) => {
          if (err) return res.status(500).json({ error: err.message });
          res.json({ success: true, reward: 100, point: "SNP", user: updated });
        });
      }
    );
  });
});

app.post("/api/mission/complete", (req, res) => {
  const { telegram_id, mission_key } = req.body;
  const reward = missionReward(mission_key);

  if (!telegram_id || !mission_key) {
    return res.status(400).json({ error: "telegram_id and mission_key are required" });
  }
  if (!reward) return res.status(400).json({ error: "invalid mission_key" });

  db.get("SELECT * FROM users WHERE telegram_id = ?", [telegram_id], (err, user) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!user) return res.status(404).json({ error: "user not found" });
    if (user.is_blocked) return res.status(403).json({ error: "user blocked" });

    db.run(
      "INSERT INTO missions (user_id, mission_key, reward, status, completed_at) VALUES (?, ?, ?, ?, ?)",
      [user.id, mission_key, reward, "completed", nowIso()],
      function (err) {
        if (err) return res.status(409).json({ error: "mission already completed" });

        db.run("UPDATE users SET points = points + ? WHERE id = ?", [reward, user.id], (err) => {
          if (err) return res.status(500).json({ error: err.message });

          db.get("SELECT * FROM users WHERE id = ?", [user.id], (err, updated) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, mission_key, reward, point: "SNP", user: updated });
          });
        });
      }
    );
  });
});

app.post("/api/wallet", (req, res) => {
  const { telegram_id, wallet } = req.body;

  if (!telegram_id || !wallet) return res.status(400).json({ error: "telegram_id and wallet are required" });

  const solanaRegex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
  if (!solanaRegex.test(wallet)) return res.status(400).json({ error: "invalid Solana wallet address" });

  db.run("UPDATE users SET wallet = ? WHERE telegram_id = ?", [wallet, telegram_id], function (err) {
    if (err) return res.status(500).json({ error: err.message });

    db.get("SELECT * FROM users WHERE telegram_id = ?", [telegram_id], (err, user) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, user });
    });
  });
});

app.get("/api/rank", (req, res) => {
  db.all("SELECT username, points, invite_code FROM users WHERE is_blocked = 0 ORDER BY points DESC LIMIT 100", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ ranking: rows });
  });
});

app.get("/api/admin/stats", requireAdmin, (req, res) => {
  db.get("SELECT COUNT(*) AS users, COALESCE(SUM(points), 0) AS total_points FROM users", [], (err, a) => {
    if (err) return res.status(500).json({ error: err.message });
    db.get("SELECT COUNT(*) AS wallets FROM users WHERE wallet IS NOT NULL AND wallet != ''", [], (err, b) => {
      if (err) return res.status(500).json({ error: err.message });
      db.get("SELECT COUNT(*) AS missions FROM missions", [], (err, c) => {
        if (err) return res.status(500).json({ error: err.message });
        db.get("SELECT COUNT(*) AS blocked FROM users WHERE is_blocked = 1", [], (err, d) => {
          if (err) return res.status(500).json({ error: err.message });
          res.json({ users: a.users, total_points: a.total_points, wallets: b.wallets, missions: c.missions, blocked: d.blocked });
        });
      });
    });
  });
});

app.get("/api/admin/users", requireAdmin, (req, res) => {
  db.all("SELECT * FROM users ORDER BY points DESC LIMIT 500", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ users: rows });
  });
});

app.post("/api/admin/block", requireAdmin, (req, res) => {
  const { telegram_id, blocked } = req.body;
  db.run("UPDATE users SET is_blocked = ? WHERE telegram_id = ?", [blocked ? 1 : 0, telegram_id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

app.get("/api/admin/export", requireAdmin, (req, res) => {
  db.all("SELECT * FROM users ORDER BY points DESC", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });

    const header = "telegram_id,username,points,wallet,invite_code,referrer_code,is_blocked,created_at\n";
    const body = rows.map(r => {
      return `${r.telegram_id},${r.username},${r.points},${r.wallet || ""},${r.invite_code},${r.referrer_code || ""},${r.is_blocked},${r.created_at}`;
    }).join("\n");

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", "attachment; filename=spacenovax_users.csv");
    res.send(header + body);
  });
});

app.listen(PORT, () => {
  console.log(`SpaceNovaX Server + Dashboard v2 running on port ${PORT}`);
  console.log(`Admin dashboard: http://localhost:${PORT}`);
  console.log(`Default admin key: ${ADMIN_KEY}`);
});
