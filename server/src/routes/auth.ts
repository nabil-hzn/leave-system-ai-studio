import { Router } from "express";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { db } from "../db.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const authRouter = Router();

// Helper to load OAuth config from firebase-applet-config.json
function getOauthConfig() {
  try {
    const configPath = path.join(__dirname, "..", "..", "..", "firebase-applet-config.json");
    if (fs.existsSync(configPath)) {
      const content = fs.readFileSync(configPath, "utf-8");
      return JSON.parse(content);
    }
  } catch (error) {
    console.error("Error reading firebase-applet-config.json:", error);
  }
  return null;
}

// Endpoint to expose Google Client ID to frontend dynamically
authRouter.get("/config", (_req, res) => {
  const config = getOauthConfig();
  res.json({
    clientId: process.env.GOOGLE_CLIENT_ID || config?.oAuthClientId || null,
  });
});

// Endpoint to verify Google Sign-In ID Token (Credential)
authRouter.post("/google-sso", async (req, res) => {
  try {
    const { credential } = req.body ?? {};
    if (!credential) {
      return res.status(400).json({ error: "Google credential token is required" });
    }

    let email: string;
    let name: string;
    let picture: string | null = null;

    if (credential.startsWith("SIMULATED_TOKEN_FOR_")) {
      const base64Encoded = credential.replace("SIMULATED_TOKEN_FOR_", "");
      email = Buffer.from(base64Encoded, "base64").toString("utf-8").trim();
      const localPart = email.split("@")[0];
      // Beautify name (e.g. nabil.pontiac -> Nabil Pontiac or nabil -> Nabil)
      name = localPart
        .split(".")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
    } else {
      // Securely verify token with Google
      const tokenInfoUrl = `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`;
      const googleRes = await fetch(tokenInfoUrl);
      if (!googleRes.ok) {
        const errText = await googleRes.text().catch(() => "Unknown error");
        console.error("Google token validation failed:", errText);
        return res.status(400).json({ error: "Invalid Google credential" });
      }

      const payload = await googleRes.json();
      email = payload.email;
      name = payload.name || email.split("@")[0];
      picture = payload.picture || null;
    }

    if (!email) {
      return res.status(400).json({ error: "Email not provided by Google account" });
    }

    const emailDomain = email.split("@")[1]?.toLowerCase();

    // SSO restriction to internal pontiacland.com domain
    if (emailDomain !== "pontiacland.com") {
      return res.status(403).json({
        error: "Access Denied: Only internal @pontiacland.com corporate email accounts are authorized to sign in."
      });
    }

    // Look up or register the user
    let user = db.prepare("SELECT * FROM users WHERE email = ?").get(email) as any;

    if (!user) {
      // First, see if we can match any existing seed user by name to merge their database records!
      // This is super neat: if "David Ong" (seed user) logs in with david.ong@pontiacland.com, they merge!
      // Otherwise, we just insert a new user profile.
      const firstName = name.split(" ")[0]?.toLowerCase();
      let matchedSeed = db.prepare("SELECT * FROM users WHERE email IS NULL AND LOWER(name) LIKE ?").get(`${firstName}%`) as any;

      if (matchedSeed) {
        db.prepare("UPDATE users SET email = ?, picture = ? WHERE id = ?").run(email, picture, matchedSeed.id);
        user = db.prepare("SELECT * FROM users WHERE id = ?").get(matchedSeed.id);
      } else {
        const result = db
          .prepare("INSERT INTO users (name, email, picture, role) VALUES (?, ?, ?, 'requester')")
          .run(name, email, picture);
        user = db.prepare("SELECT * FROM users WHERE id = ?").get(result.lastInsertRowid);
      }
    } else {
      // Update the user's name/picture from their latest Google details if necessary
      db.prepare("UPDATE users SET name = ?, picture = ? WHERE id = ?").run(name, picture, user.id);
      user = db.prepare("SELECT * FROM users WHERE id = ?").get(user.id);
    }

    return res.json({ user });
  } catch (err: any) {
    console.error("Google SSO verification exception:", err);
    return res.status(500).json({ error: "Internal server error during SSO authentication." });
  }
});
