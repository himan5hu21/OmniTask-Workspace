import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import { v2 as cloudinary } from 'cloudinary';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Root directory of the project
const rootDir = path.resolve(__dirname, '../../');
const UPLOAD_DIR = path.join(rootDir, 'uploads');

const DISALLOWED_EXTENSIONS = /\.(exe|bat|cmd|sh|msi|vbs|vbe|wsf|wsh|lnk|com|pif|scr)$/i;
const DISALLOWED_MIME_TYPES = new Set([
  'application/x-msdownload', // .exe, .msi, etc.
  'application/x-sh',
]);

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

// Check if Cloudinary is configured and not using the default placeholder
const isCloudinaryConfigured = !!(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET &&
  process.env.CLOUDINARY_API_SECRET !== 'your_api_secret_here'
);

if (isCloudinaryConfigured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME as string,
    api_key: process.env.CLOUDINARY_API_KEY as string,
    api_secret: process.env.CLOUDINARY_API_SECRET as string,
  });
  console.log('[Storage] Cloudinary initialized successfully.');
} else {
  console.log('[Storage] Cloudinary not configured or using placeholders. Falling back to local storage.');
}

export class StorageService {
  private static getPublicBaseUrl() {
    const configuredBaseUrl =
      process.env.FILE_PUBLIC_BASE_URL ||
      process.env.PUBLIC_APP_URL ||
      process.env.BACKEND_PUBLIC_URL;

    if (configuredBaseUrl) {
      return configuredBaseUrl.replace(/\/+$/, '');
    }

    const port = process.env.PORT || '8000';
    return `http://localhost:${port}`;
  }

  static async init(folder?: string) {
    const targetDir = folder ? path.join(UPLOAD_DIR, folder) : UPLOAD_DIR;
    try {
      await fs.access(targetDir);
    } catch {
      await fs.mkdir(targetDir, { recursive: true });
    }
    return targetDir;
  }

  private static parseCloudinaryUrl(url: string): { publicId: string; resourceType: 'image' | 'video' | 'raw' } | null {
    try {
      if (!url || !url.includes('res.cloudinary.com')) return null;

      const parts = url.split('/');
      const uploadIndex = parts.indexOf('upload');
      if (uploadIndex === -1 || uploadIndex < 2) return null;

      const resourceType = parts[uploadIndex - 1] as 'image' | 'video' | 'raw';

      const omniIndex = url.indexOf('/omnitask/');
      let publicIdWithExt = '';
      if (omniIndex !== -1) {
        publicIdWithExt = url.substring(omniIndex + 1); // strip leading slash
      } else {
        let remainingParts = parts.slice(uploadIndex + 1);
        remainingParts = remainingParts.filter(part => {
          if (part.startsWith('v') && /^\d+$/.test(part.substring(1))) return false; // version
          if (part.includes(',')) return false; // transformation e.g. f_auto,q_auto
          if (/^(w|h|f|q|c|g|r|e|o|l|u|y|p|d|fl|dl)_/.test(part)) return false; // standard cloudinary transform prefixes
          return true;
        });
        publicIdWithExt = remainingParts.join('/');
      }

      const ext = path.extname(publicIdWithExt);
      const publicId = resourceType === 'raw'
        ? publicIdWithExt
        : publicIdWithExt.substring(0, publicIdWithExt.length - ext.length);

      return { publicId, resourceType };
    } catch {
      return null;
    }
  }

  static async saveFile(
    file: { filename: string; buffer: Buffer; mimetype: string },
    folder: 'user' | 'message' | 'task' = 'message'
  ): Promise<{ file_url: string; file_name: string; file_size: number }> {
    // 1. Validate File Size
    if (file.buffer.length > MAX_FILE_SIZE) {
      throw new Error(`File too large. Max size is ${MAX_FILE_SIZE / (1024 * 1024)}MB`);
    }

    // 2. Validate MIME Type and Extensions for Security
    if (DISALLOWED_MIME_TYPES.has(file.mimetype) || DISALLOWED_EXTENSIONS.test(file.filename)) {
      throw new Error('File type not allowed');
    }

    // 3. If Cloudinary is configured, upload directly via stream
    if (isCloudinaryConfigured) {
      try {
        const uploadResult = await new Promise<any>((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            {
              folder: `omnitask/${folder}`,
              resource_type: 'auto',
            },
            (error, result) => {
              if (error) return reject(error);
              resolve(result);
            }
          );
          uploadStream.end(file.buffer);
        });

        return {
          file_url: uploadResult.secure_url,
          file_name: path.basename(file.filename),
          file_size: uploadResult.bytes,
        };
      } catch (err: any) {
        console.error('[Storage] Cloudinary upload failed, throwing error:', err);
        throw new Error(`Cloudinary upload failed: ${err.message || err}`);
      }
    }

    // 4. Fallback to Local Disk Storage
    const targetDir = await this.init(folder);

    // Generate SAFE Filename
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

    if (relativePath.startsWith('http://') || relativePath.startsWith('https://')) {
      // If it is a Cloudinary image URL, inject f_auto,q_auto for optimal delivery speed
      if (relativePath.includes('res.cloudinary.com') && relativePath.includes('/image/upload/')) {
        if (!relativePath.includes('f_auto')) {
          return relativePath.replace('/image/upload/', '/image/upload/f_auto,q_auto/');
        }
      }
      return relativePath;
    }

    const normalizedPath = relativePath.startsWith('/uploads')
      ? relativePath
      : `/uploads/${relativePath.replace(/^\/+/, '')}`;

    return normalizedPath;
  }

  static getUploadPath(relativePath: string) {
    let cleanPath = relativePath;

    // If it's a full URL, parse out the pathname
    if (relativePath.startsWith('http://') || relativePath.startsWith('https://')) {
      try {
        const url = new URL(relativePath);
        cleanPath = url.pathname; // e.g. "/uploads/message/file.jpg"
      } catch (e) {
        // fallback if parsing fails
      }
    }

    // Strip "/uploads/" prefix if present
    if (cleanPath.startsWith('/uploads/')) {
      cleanPath = cleanPath.slice('/uploads/'.length);
    } else if (cleanPath.startsWith('uploads/')) {
      cleanPath = cleanPath.slice('uploads/'.length);
    }

    return path.join(UPLOAD_DIR, cleanPath);
  }

  static async deleteFile(relativePath: string) {
    if (!relativePath) return;

    // 1. Try to delete from Cloudinary if it is a Cloudinary URL
    const cloudinaryInfo = this.parseCloudinaryUrl(relativePath);
    if (cloudinaryInfo && isCloudinaryConfigured) {
      try {
        await new Promise<void>((resolve, reject) => {
          cloudinary.uploader.destroy(
            cloudinaryInfo.publicId,
            { resource_type: cloudinaryInfo.resourceType },
            (error, result) => {
              if (error) return reject(error);
              resolve();
            }
          );
        });
        console.log(`[Storage] Deleted file from Cloudinary: ${cloudinaryInfo.publicId}`);
        return;
      } catch (error) {
        console.error(`[Storage] Failed to delete from Cloudinary: ${relativePath}`, error);
        // Do not throw; proceed to local deletion check just in case
      }
    }

    // 2. Fallback to Local disk deletion
    const filePath = this.getUploadPath(relativePath);
    try {
      await fs.unlink(filePath);
      console.log(`[Storage] Deleted local file: ${filePath}`);
    } catch (error: any) {
      // Silently fail if file not found, log other errors
      if (error.code !== 'ENOENT') {
        console.error(`Failed to delete local file: ${filePath}`, error);
      }
    }
  }
}
