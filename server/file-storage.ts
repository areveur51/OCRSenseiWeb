import fs from "fs/promises";
import path from "path";
import { createWriteStream } from "fs";
import { pipeline } from "stream/promises";
import axios from "axios";

const UPLOAD_DIR = path.join(process.cwd(), "uploads");
const MAX_FILE_SIZE = 17 * 1024 * 1024; // 17MB

export interface FileUploadResult {
  filename: string;
  filePath: string;
  fileSize: number;
  format: string;
  width?: number;
  height?: number;
}

/**
 * Sanitize a string to be filesystem-safe
 * Replaces special characters with underscores and limits length
 */
function sanitizePathComponent(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9.-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .substring(0, 100);
}

/**
 * Create a readable upload path using project and directory names with IDs for uniqueness
 * Format: ProjectName_id{projectId}/DirectoryName_id{directoryId}/
 * The ID suffix ensures no collisions even if sanitization produces identical strings
 */
export function createUploadPath(
  projectName: string,
  directoryName: string,
  projectId: number,
  directoryId: number
): string {
  const sanitizedProject = sanitizePathComponent(projectName);
  const sanitizedDir = sanitizePathComponent(directoryName);
  
  // Add ID suffixes to guarantee uniqueness and prevent collisions
  const projectPath = `${sanitizedProject}_id${projectId}`;
  const dirPath = `${sanitizedDir}_id${directoryId}`;
  
  return path.join(projectPath, dirPath);
}

/**
 * Get legacy upload path for backwards compatibility with old data
 * Format: project_{projectId}/dir_{directoryId}/
 */
export function getLegacyUploadPath(projectId: number, directoryId: number): string {
  return path.join(`project_${projectId}`, `dir_${directoryId}`);
}

export class FileStorageService {
  async ensureUploadDir(subdirectory?: string): Promise<string> {
    const dir = subdirectory ? path.join(UPLOAD_DIR, subdirectory) : UPLOAD_DIR;
    await fs.mkdir(dir, { recursive: true });
    return dir;
  }

  async saveUploadedFile(
    file: Express.Multer.File,
    subdirectory: string
  ): Promise<FileUploadResult> {
    const dir = await this.ensureUploadDir(subdirectory);
    const timestamp = Date.now();
    const safeFilename = `${timestamp}_${file.originalname.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
    const filePath = path.join(dir, safeFilename);
    const relativePath = path.join(subdirectory, safeFilename);

    await fs.writeFile(filePath, file.buffer);

    const format = path.extname(file.originalname).slice(1).toLowerCase();

    return {
      filename: safeFilename,
      filePath: relativePath,
      fileSize: file.size,
      format,
    };
  }

  async downloadFromUrl(
    url: string,
    subdirectory: string
  ): Promise<FileUploadResult> {
    const dir = await this.ensureUploadDir(subdirectory);
    
    const response = await axios({
      method: "get",
      url,
      responseType: "stream",
      maxContentLength: MAX_FILE_SIZE,
      maxBodyLength: MAX_FILE_SIZE,
    });

    const contentType = response.headers["content-type"] || "";
    let extension = "jpg";
    
    if (contentType.includes("png")) extension = "png";
    else if (contentType.includes("tiff")) extension = "tiff";
    else if (contentType.includes("pdf")) extension = "pdf";

    const urlPath = new URL(url).pathname;
    const urlFilename = path.basename(urlPath);
    const timestamp = Date.now();
    const safeFilename = `${timestamp}_${urlFilename || `download.${extension}`}`;
    
    const filePath = path.join(dir, safeFilename);
    const relativePath = path.join(subdirectory, safeFilename);

    const writer = createWriteStream(filePath);
    await pipeline(response.data, writer);

    const stats = await fs.stat(filePath);

    return {
      filename: safeFilename,
      filePath: relativePath,
      fileSize: stats.size,
      format: extension,
    };
  }

  async deleteFile(filePath: string): Promise<void> {
    const fullPath = path.join(UPLOAD_DIR, filePath);
    try {
      await fs.unlink(fullPath);
    } catch (error) {
      console.error(`Failed to delete file ${filePath}:`, error);
    }
  }

  getFilePath(relativePath: string): string {
    return path.join(UPLOAD_DIR, relativePath);
  }

  async deleteDirectory(subdirectory: string): Promise<void> {
    const dir = path.join(UPLOAD_DIR, subdirectory);
    try {
      await fs.rm(dir, { recursive: true, force: true });
    } catch (error) {
      console.error(`Failed to delete directory ${subdirectory}:`, error);
    }
  }
}

export const fileStorage = new FileStorageService();
