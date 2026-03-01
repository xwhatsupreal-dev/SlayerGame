import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import cors from "cors";
import axios from "axios";
import dotenv from "dotenv";
import { Client, GatewayIntentBits } from "discord.js";
import { fileURLToPath } from "url";
import fs from "fs";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database path setup
const dbPath = path.join(__dirname, "game.db");
const db = new Database(dbPath);

// Initialize Database
function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      password TEXT,
      discord_id TEXT UNIQUE
    );

    CREATE TABLE IF NOT EXISTS players (
      id INTEGER PRIMARY KEY,
      name TEXT,
      gender TEXT,
      level INTEGER DEFAULT 1,
      exp INTEGER DEFAULT 0,
      hp INTEGER DEFAULT 100,
      max_hp INTEGER DEFAULT 100,
      gold INTEGER DEFAULT 500,
      gems INTEGER DEFAULT 50,
      weapon TEXT DEFAULT 'Wooden Sword',
      str INTEGER DEFAULT 1,
      dex INTEGER DEFAULT 1,
      vit INTEGER DEFAULT 1,
      stat_points INTEGER DEFAULT 5,
      last_save DATETIME DEFAULT CURRENT_TIMESTAMP,
      language TEXT DEFAULT 'EN',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      theme_color TEXT DEFAULT '#ef4444',
      FOREIGN KEY(id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS achievements (
      id TEXT PRIMARY KEY,
      title_en TEXT,
      title_th TEXT,
      description_en TEXT,
      description_th TEXT,
      icon TEXT,
      requirement_type TEXT,
      requirement_value INTEGER
    );

    CREATE TABLE IF NOT EXISTS player_achievements (
      player_id INTEGER,
      achievement_id TEXT,
      unlocked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY(player_id, achievement_id),
      FOREIGN KEY(player_id) REFERENCES players(id),
      FOREIGN KEY(achievement_id) REFERENCES achievements(id)
    );
  `);

  // Initial Achievements
  const initialAchievements = [
    {
      id: 'lvl_5',
      title_en: 'Novice Slayer',
      title_th: 'นักล่าฝึกหัด',
      description_en: 'Reach Level 5',
      description_th: 'เลเวลถึง 5',
      icon: 'Sword',
      requirement_type: 'level',
      requirement_value: 5
    },
    {
      id: 'str_10',
      title_en: 'Brute Force',
      title_th: 'พลังทำลายล้าง',
      description_en: 'Reach 10 Strength',
      description_th: 'ความแข็งแกร่งถึง 10',
      icon: 'Dumbbell',
      requirement_type: 'str',
      requirement_value: 10
    },
    {
      id: 'gold_1000',
      title_en: 'Gold Digger',
      title_th: 'นักขุดทอง',
      description_en: 'Collect 1,000 Gold',
      description_th: 'สะสมทองครบ 1,000',
      icon: 'Coins',
      requirement_type: 'gold',
      requirement_value: 1000
    }
  ];

  const insertAch = db.prepare(`
    INSERT OR IGNORE INTO achievements (id, title_en, title_th, description_en, description_th, icon, requirement_type, requirement_value)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  initialAchievements.forEach(ach => {
    insertAch.run(ach.id, ach.title_en, ach.title_th, ach.description_en, ach.description_th, ach.icon, ach.requirement_type, ach.requirement_value);
  });

  console.log("Database initialized successfully (SQLite)");
}

async function startServer() {
  initDb();

  const app = express();
  const PORT = parseInt(process.env.PORT || "3000");
  const JWT_SECRET = process.env.JWT_SECRET || "slayer-secret-key";

  app.use(express.json());
  app.use(cookieParser());
  app.use(cors({ origin: true, credentials: true }));

  // Helper: Create Player
  const createPlayer = (userId: number, name: string, gender: string = 'Male') => {
    db.prepare(`
      INSERT INTO players (id, name, gender, level, exp, hp, max_hp, gold, gems, weapon, str, dex, vit, stat_points, language, created_at)
      VALUES (?, ?, ?, 1, 0, 100, 100, 500, 50, 'Wooden Sword', 1, 1, 1, 5, 'EN', CURRENT_TIMESTAMP)
    `).run(userId, name, gender);
  };

  // Discord Bot Initialization
  const discordClient = new Client({ intents: [GatewayIntentBits.Guilds] });
  const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;

  if (DISCORD_BOT_TOKEN) {
    discordClient.once('ready', () => {
      console.log(`Logged in as ${discordClient.user?.tag}!`);
    });
    discordClient.login(DISCORD_BOT_TOKEN).catch(err => {
      console.error("Discord Bot Login Error:", err);
    });
  }

  // Auth Middleware
  const authenticateToken = (req: any, res: any, next: any) => {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ error: "Unauthorized" });

    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
      if (err) return res.status(403).json({ error: "Forbidden" });
      req.user = user;
      next();
    });
  };

  // Register
  app.post("/api/auth/register", async (req, res) => {
    const { username, password, gender } = req.body;
    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      const result = db.prepare("INSERT INTO users (username, password) VALUES (?, ?)").run(username, hashedPassword);
      const userId = result.lastInsertRowid as number;

      createPlayer(userId, username, gender);

      res.json({ success: true });
    } catch (error: any) {
      console.error("Registration Error:", error);
      res.status(400).json({ error: error.message.includes("UNIQUE") ? "Username already exists" : "Registration failed" });
    }
  });

  // Login
  app.post("/api/auth/login", async (req, res) => {
    const { username, password } = req.body;
    try {
      const user: any = db.prepare("SELECT * FROM users WHERE username = ?").get(username);

      if (user && user.password && await bcrypt.compare(password, user.password)) {
        const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: "24h" });
        res.cookie("token", token, { 
          httpOnly: true, 
          secure: true, 
          sameSite: "none",
          maxAge: 24 * 60 * 60 * 1000 // 24 hours
        });
        res.json({ success: true, user: { id: user.id, username: user.username } });
      } else {
        res.status(401).json({ error: "Invalid username or password" });
      }
    } catch (error: any) {
      console.error("Login Error:", error);
      res.status(500).json({ error: "Internal server error during login" });
    }
  });

  // Logout
  app.post("/api/auth/logout", (req, res) => {
    res.clearCookie("token", { secure: true, sameSite: "none" });
    res.json({ success: true });
  });

  // Get Current User/Player
  app.get("/api/me", authenticateToken, (req: any, res) => {
    let player: any = db.prepare("SELECT * FROM players WHERE id = ?").get(req.user.id);
    if (!player) {
      createPlayer(req.user.id, req.user.username);
      player = db.prepare("SELECT * FROM players WHERE id = ?").get(req.user.id);
    }
    res.json({ user: req.user, player });
  });

  // Update Stats (Training)
  app.post("/api/player/train", authenticateToken, (req: any, res) => {
    const { str, dex, vit, pointsSpent } = req.body;
    const player: any = db.prepare("SELECT * FROM players WHERE id = ?").get(req.user.id);

    if (!player || player.stat_points < pointsSpent) {
      return res.status(400).json({ error: "Insufficient stat points" });
    }

    const newMaxHp = 100 + ((player.vit + vit) * 10);
    db.prepare(`
      UPDATE players 
      SET str = str + ?, dex = dex + ?, vit = vit + ?, stat_points = stat_points - ?, max_hp = ?, last_save = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(str, dex, vit, pointsSpent, newMaxHp, req.user.id);

    const updatedPlayer = db.prepare("SELECT * FROM players WHERE id = ?").get(req.user.id);
    res.json({ success: true, player: updatedPlayer });
  });

  // Manual Save
  app.post("/api/player/save", authenticateToken, (req: any, res) => {
    db.prepare("UPDATE players SET last_save = CURRENT_TIMESTAMP WHERE id = ?").run(req.user.id);
    const updatedPlayer = db.prepare("SELECT * FROM players WHERE id = ?").get(req.user.id);
    res.json({ success: true, player: updatedPlayer });
  });

  // Update Settings
  app.post("/api/player/settings", authenticateToken, (req: any, res) => {
    const { language, theme_color } = req.body;
    if (language) {
      db.prepare("UPDATE players SET language = ? WHERE id = ?").run(language, req.user.id);
    }
    if (theme_color) {
      db.prepare("UPDATE players SET theme_color = ? WHERE id = ?").run(theme_color, req.user.id);
    }
    const updatedPlayer = db.prepare("SELECT * FROM players WHERE id = ?").get(req.user.id);
    res.json({ success: true, player: updatedPlayer });
  });

  // Update Username
  app.post("/api/player/update-name", authenticateToken, (req: any, res) => {
    const { name } = req.body;
    if (!name || name.trim().length < 2) {
      return res.status(400).json({ error: "Name must be at least 2 characters long" });
    }
    db.prepare("UPDATE players SET name = ? WHERE id = ?").run(name.trim(), req.user.id);
    const updatedPlayer = db.prepare("SELECT * FROM players WHERE id = ?").get(req.user.id);
    res.json({ success: true, player: updatedPlayer });
  });

  // Get Achievements
  app.get("/api/achievements", authenticateToken, (req: any, res) => {
    const achievements = db.prepare("SELECT * FROM achievements").all();
    const unlocked = db.prepare("SELECT achievement_id FROM player_achievements WHERE player_id = ?").all(req.user.id);
    const unlockedIds = unlocked.map((u: any) => u.achievement_id);
    
    res.json({ achievements, unlockedIds });
  });

  // Check and Unlock Achievements
  app.post("/api/player/check-achievements", authenticateToken, (req: any, res) => {
    const player: any = db.prepare("SELECT * FROM players WHERE id = ?").get(req.user.id);
    const achievements: any = db.prepare("SELECT * FROM achievements").all();
    const unlocked: any = db.prepare("SELECT achievement_id FROM player_achievements WHERE player_id = ?").all(req.user.id);
    const unlockedIds = unlocked.map((u: any) => u.achievement_id);

    const newlyUnlocked: any[] = [];

    achievements.forEach((ach: any) => {
      if (!unlockedIds.includes(ach.id)) {
        let isMet = false;
        if (ach.requirement_type === 'level' && player.level >= ach.requirement_value) isMet = true;
        if (ach.requirement_type === 'str' && player.str >= ach.requirement_value) isMet = true;
        if (ach.requirement_type === 'gold' && player.gold >= ach.requirement_value) isMet = true;

        if (isMet) {
          db.prepare("INSERT INTO player_achievements (player_id, achievement_id) VALUES (?, ?)").run(req.user.id, ach.id);
          newlyUnlocked.push(ach);
        }
      }
    });

    res.json({ success: true, newlyUnlocked });
  });

  // Discord OAuth2 URL
  app.get("/api/auth/discord/url", (req, res) => {
    const clientId = process.env.DISCORD_CLIENT_ID;
    const redirectUri = process.env.DISCORD_REDIRECT_URI || (process.env.APP_URL ? `${process.env.APP_URL}/api/auth/discord/callback` : null);
    
    if (!clientId) {
      return res.status(400).json({ error: "Discord Client ID is not configured." });
    }
    const url = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri!)}&response_type=code&scope=identify`;
    res.json({ url });
  });

  // Discord Callback
  app.get("/api/auth/discord/callback", async (req, res) => {
    const { code } = req.query;
    if (!code) return res.status(400).send("No code provided");

    const clientId = process.env.DISCORD_CLIENT_ID;
    const clientSecret = process.env.DISCORD_CLIENT_SECRET;
    const redirectUri = process.env.DISCORD_REDIRECT_URI || (process.env.APP_URL ? `${process.env.APP_URL}/api/auth/discord/callback` : null);

    try {
      const tokenResponse = await axios.post("https://discord.com/api/oauth2/token", new URLSearchParams({
        client_id: clientId!,
        client_secret: clientSecret!,
        grant_type: "authorization_code",
        code: code as string,
        redirect_uri: redirectUri!,
      }), { headers: { "Content-Type": "application/x-www-form-urlencoded" } });

      const { access_token } = tokenResponse.data;
      const userResponse = await axios.get("https://discord.com/api/users/@me", {
        headers: { Authorization: `Bearer ${access_token}` }
      });

      const discordUser = userResponse.data;
      let user: any = db.prepare("SELECT * FROM users WHERE discord_id = ?").get(discordUser.id);

      if (!user) {
        const result = db.prepare("INSERT INTO users (username, discord_id) VALUES (?, ?)").run(discordUser.username, discordUser.id);
        user = { id: result.lastInsertRowid, username: discordUser.username };
        createPlayer(user.id, discordUser.username);
      }

      const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: "24h" });
      res.cookie("token", token, { httpOnly: true, secure: true, sameSite: "none" });

      res.send(`
        <html>
          <body>
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS' }, '*');
                window.close();
              } else {
                window.location.href = '/';
              }
            </script>
            <p>Authentication successful. This window should close automatically.</p>
          </body>
        </html>
      `);
    } catch (error) {
      console.error("Discord Auth Error:", error);
      res.status(500).send("Discord authentication failed");
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
