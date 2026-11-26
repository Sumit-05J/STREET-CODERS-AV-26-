import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const backendRoot = path.resolve(__dirname, '../..')

dotenv.config({ path: path.join(backendRoot, '.env') })

const maxMb = Number(process.env.MAX_FILE_SIZE_MB || 100)
const rawOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean)

const configuredUploadDir = process.env.UPLOAD_DIR || 'uploads'

export const env = {
  port: Number(process.env.PORT || 8080),
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigins: rawOrigins,
  allowExtensionCors: process.env.ALLOW_EXTENSION_CORS !== 'false',
  databaseUrl: process.env.DATABASE_URL || '',
  jwtSecret: process.env.JWT_SECRET || '',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  storageDriver: process.env.STORAGE_DRIVER || 'local',
  uploadDir: path.isAbsolute(configuredUploadDir)
    ? configuredUploadDir
    : path.resolve(backendRoot, configuredUploadDir),
  maxFileSizeBytes: maxMb * 1024 * 1024,
  publicBaseUrl: process.env.PUBLIC_BASE_URL || 'http://localhost:8080',
  ffmpegPath: process.env.FFMPEG_PATH || 'ffmpeg',
  ffprobePath: process.env.FFPROBE_PATH || 'ffprobe',
  transcriptionProvider: process.env.TRANSCRIPTION_PROVIDER || 'none',
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  s3: {
    endpoint: process.env.S3_ENDPOINT || '',
    region: process.env.S3_REGION || 'us-east-1',
    bucket: process.env.S3_BUCKET || '',
    accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
  },
}

if (!env.jwtSecret) {
  if (env.nodeEnv === 'production') {
    throw new Error('JWT_SECRET environment variable must be set in production.')
  }
  env.jwtSecret = 'dev-only-echospace-secret-change-in-prod'
}
