import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const nodeEnv = process.env.NODE_ENV || 'development';
const isProduction = nodeEnv === 'production';

const defaultDevSecret = 'iudwas_dev_jwt_secret_key_change_in_production';
const defaultDevRefreshSecret = 'iudwas_dev_refresh_secret_key_change_in_production';

if (isProduction && (!process.env.JWT_SECRET || process.env.JWT_SECRET === defaultDevSecret)) {
  throw new Error('FATAL SECURITY ERROR: JWT_SECRET must be set to a secure, non-default string in production environment.');
}

if (isProduction && (!process.env.JWT_REFRESH_SECRET || process.env.JWT_REFRESH_SECRET === defaultDevRefreshSecret)) {
  throw new Error('FATAL SECURITY ERROR: JWT_REFRESH_SECRET must be set to a secure, non-default string in production environment.');
}

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv,
  jwtSecret: process.env.JWT_SECRET || defaultDevSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1h',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || defaultDevRefreshSecret,
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  databasePath: process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'iudwas.db'),
  uploadDir: process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads'),
  corsOrigins: (process.env.CORS_ORIGIN || 'http://localhost:5173,http://localhost:3000').split(','),
  maxUploadSizeBytes: parseInt(process.env.MAX_UPLOAD_SIZE_BYTES || String(50 * 1024 * 1024), 10), // 50MB per PDF/doc
};
