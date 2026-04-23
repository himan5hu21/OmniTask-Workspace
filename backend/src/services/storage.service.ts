import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Root directory of the project
const rootDir = path.resolve(__dirname, '../../');
const UPLOAD_DIR = path.join(rootDir, 'uploads');

export class StorageService {
  static async init() {
    try {
      await fs.access(UPLOAD_DIR);
    } catch {
      await fs.mkdir(UPLOAD_DIR, { recursive: true });
    }
  }

  static async saveFile(file: { filename: string; buffer: Buffer }): Promise<{ file_url: string; file_name: string; file_size: number }> {
    await this.init();

    const uniqueKey = crypto.randomBytes(8).toString('hex');
    const savedName = `${uniqueKey}__${file.filename}`;
    const filePath = path.join(UPLOAD_DIR, savedName);

    await fs.writeFile(filePath, file.buffer);

    return {
      file_url: `/uploads/${savedName}`,
      file_name: file.filename,
      file_size: file.buffer.length,
    };
  }

  static getUploadPath(filename: string) {
    return path.join(UPLOAD_DIR, filename);
  }
}
