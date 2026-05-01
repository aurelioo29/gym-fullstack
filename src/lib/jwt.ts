import jwt, { SignOptions } from "jsonwebtoken";
import { env } from "@/lib/env";

export type JwtUserPayload = {
  id: string;
  roleId: string;
  role: string;
  email: string;
};

export function signAccessToken(payload: JwtUserPayload) {
  return jwt.sign(payload, env.auth.jwtAccessSecret, {
    expiresIn: env.auth.jwtAccessExpiresIn,
  } as SignOptions);
}

export function signRefreshToken(payload: JwtUserPayload) {
  return jwt.sign(payload, env.auth.jwtRefreshSecret, {
    expiresIn: env.auth.jwtRefreshExpiresIn,
  } as SignOptions);
}

export function verifyAccessToken(token: string) {
  return jwt.verify(token, env.auth.jwtAccessSecret) as JwtUserPayload & {
    iat: number;
    exp: number;
  };
}

export function verifyRefreshToken(token: string) {
  return jwt.verify(token, env.auth.jwtRefreshSecret) as JwtUserPayload & {
    iat: number;
    exp: number;
  };
}

export function decodeToken(token: string) {
  return jwt.decode(token) as
    | (JwtUserPayload & {
        iat: number;
        exp: number;
      })
    | null;
}
