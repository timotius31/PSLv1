import bcrypt from "bcryptjs";
import express from "express";
import { v4 as uuidv4 } from "uuid";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../auth.js";
import { config } from "../config.js";
import { query } from "../db.js";

export const authRoutes = express.Router();

authRoutes.post("/login", async (req, res) => {
  const { username, password } = req.body;

  const { rows } = await query("select * from users where username = $1", [username]);
  const user = rows[0];

  if (!user || !user.is_active) {
    return res.status(401).json({ message: "Invalid username or password" });
  }

  const matches = await bcrypt.compare(password, user.password_hash);
  if (!matches) {
    return res.status(401).json({ message: "Invalid username or password" });
  }

  const tokenId = uuidv4();
  const refreshToken = signRefreshToken(user, tokenId);
  const expiresAt = new Date(Date.now() + config.refreshTokenTtlDays * 24 * 60 * 60 * 1000);

  await query(
    "insert into refresh_tokens (id, user_id, expires_at) values ($1, $2, $3)",
    [tokenId, user.id, expiresAt]
  );

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: config.nodeEnv === "production",
    maxAge: config.refreshTokenTtlDays * 24 * 60 * 60 * 1000
  });

  return res.json({
    accessToken: signAccessToken(user),
    user: sanitizeUser(user)
  });
});

authRoutes.post("/refresh", async (req, res) => {
  const token = req.cookies.refreshToken;
  if (!token) return res.status(401).json({ message: "Missing refresh token" });

  try {
    const payload = verifyRefreshToken(token);
    const { rows } = await query(
      `select users.*
       from refresh_tokens
       join users on users.id = refresh_tokens.user_id
       where refresh_tokens.id = $1
         and refresh_tokens.revoked_at is null
         and refresh_tokens.expires_at > now()`,
      [payload.jti]
    );

    const user = rows[0];
    if (!user) return res.status(401).json({ message: "Refresh token revoked" });

    return res.json({ accessToken: signAccessToken(user), user: sanitizeUser(user) });
  } catch {
    return res.status(401).json({ message: "Invalid refresh token" });
  }
});

authRoutes.post("/logout", async (req, res) => {
  const token = req.cookies.refreshToken;

  if (token) {
    try {
      const payload = verifyRefreshToken(token);
      await query("update refresh_tokens set revoked_at = now() where id = $1", [payload.jti]);
    } catch {
      // Ignore malformed refresh tokens during logout.
    }
  }

  res.clearCookie("refreshToken");
  return res.json({ ok: true });
});

function sanitizeUser(user) {
  return {
    id: user.id,
    username: user.username,
    fullName: user.full_name,
    role: user.role
  };
}
