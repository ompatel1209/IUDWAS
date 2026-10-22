import jwt from 'jsonwebtoken';
import { config } from '../config';
import { UserRole } from '../types';

export interface TokenPayload {
  userId: string;
  email: string;
  role: UserRole;
  departmentId: string | null;
  tokenId?: string;
}

export function generateAccessToken(payload: Omit<TokenPayload, 'tokenId'>): string {
  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn as any,
  });
}

export function generateRefreshToken(payload: TokenPayload): string {
  return jwt.sign(payload, config.jwtRefreshSecret, {
    expiresIn: config.jwtRefreshExpiresIn as any,
  });
}

export function verifyAccessToken(token: string): TokenPayload {
  return jwt.verify(token, config.jwtSecret) as TokenPayload;
}

export function verifyRefreshToken(token: string): TokenPayload {
  return jwt.verify(token, config.jwtRefreshSecret) as TokenPayload;
}
