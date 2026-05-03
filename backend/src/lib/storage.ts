import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Root directory of the project
const rootDir = path.resolve(__dirname, '../../');
const UPLOAD_DIR = path.join(rootDir, 'uploads');

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf',
  'application/zip',
  'application/x-zip-compressed',
  'application/octet-stream', // Often used for binary files
  'text/plain',
]);

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export class StorageService {
  static async init(folder?: string) {
    const targetDir = folder ? path.join(UPLOAD_DIR, folder) : UPLOAD_DIR;
    try {
      await fs.access(targetDir);
    } catch {
      await fs.mkdir(targetDir, { recursive: true });
    }
    return targetDir;
  }

  static async saveFile(file: { filename: string; buffer: Buffer; mimetype: string }, folder: 'user' | 'message' | 'task' = 'message'): Promise<{ file_url: string; file_name: string; file_size: number }> {
    // 1. Validate File Size
    if (file.buffer.length > MAX_FILE_SIZE) {
      throw new Error(`File too large. Max size is ${MAX_FILE_SIZE / (1024 * 1024)}MB`);
    }

    // 2. Validate MIME Type
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      throw new Error('File type not allowed');
    }

    const targetDir = await this.init(folder);

    // 3. Generate SAFE Filename
    const uniqueKey = crypto.randomBytes(16).toString('hex');
    const ext = path.extname(file.filename).toLowerCase();
    const savedName = `${uniqueKey}${ext}`;
    const filePath = path.join(targetDir, savedName);

    await fs.writeFile(filePath, file.buffer);

    return {
      file_url: `${folder}/${savedName}`,
      file_name: path.basename(file.filename),
      file_size: file.buffer.length,
    };
  }

  static getFileUrl(relativePath: string) {
    if (!relativePath) return '';
    if (relativePath.startsWith('http') || relativePath.startsWith('/uploads')) return relativePath;
    return `/uploads/${relativePath}`;
  }

  static getUploadPath(relativePath: string) {
    return path.join(UPLOAD_DIR, relativePath);
  }

  static async deleteFile(relativePath: string) {
    if (!relativePath) return;
    const filePath = this.getUploadPath(relativePath);
    try {
      await fs.unlink(filePath);
    } catch (error: any) {
      // Silently fail if file not found, log other errors
      if (error.code !== 'ENOENT') {
        console.error(`Failed to delete file: ${filePath}`, error);
      }
    }
  }
}
