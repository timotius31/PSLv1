import jwt from "jsonwebtoken";
import { config } from "./config.js";

export function signAccessToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role, username: user.username },
    config.jwtAccessSecret,
    { expiresIn: config.accessTokenTtl }
  );
}

export function signRefreshToken(user, tokenId) {
  return jwt.sign(
    { sub: user.id, role: user.role, jti: tokenId },
    config.jwtRefreshSecret,
    { expiresIn: `${config.refreshTokenTtlDays}d` }
  );
}

export function verifyAccessToken(token) {
  return jwt.verify(token, config.jwtAccessSecret);
}

export function verifyRefreshToken(token) {
  return jwt.verify(token, config.jwtRefreshSecret);
}
