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
  'text/plain',
]);

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export class StorageService {
  static async init() {
    try {
      await fs.access(UPLOAD_DIR);
    } catch {
      await fs.mkdir(UPLOAD_DIR, { recursive: true });
    }
  }

  static async saveFile(file: { filename: string; buffer: Buffer; mimetype: string }): Promise<{ file_url: string; file_name: string; file_size: number }> {
    // 1. Validate File Size
    if (file.buffer.length > MAX_FILE_SIZE) {
      throw new Error(`File too large. Max size is ${MAX_FILE_SIZE / (1024 * 1024)}MB`);
    }

    // 2. Validate MIME Type
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      throw new Error('File type not allowed');
    }

    await this.init();

    // 3. Generate SAFE Filename (Prevention of Path Traversal)
    const uniqueKey = crypto.randomBytes(16).toString('hex');
    const ext = path.extname(file.filename).toLowerCase();
    const savedName = `${uniqueKey}${ext}`;
    const filePath = path.join(UPLOAD_DIR, savedName);

    await fs.writeFile(filePath, file.buffer);

    return {
      file_url: `/uploads/${savedName}`,
      file_name: path.basename(file.filename), // Sanitized display name
      file_size: file.buffer.length,
    };
  }

  static getUploadPath(filename: string) {
    return path.join(UPLOAD_DIR, filename);
  }
}
