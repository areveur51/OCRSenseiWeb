import fs from "fs/promises";
import path from "path";
import { createWriteStream } from "fs";
import { pipeline } from "stream/promises";
import axios from "axios";
import * as cheerio from "cheerio";

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

  /**
   * Extracts the actual image download URL from an HTML page (like archives.gov)
   * Returns the original URL if it's already a direct image link
   */
  async extractImageUrl(url: string): Promise<string> {
    try {
      // If it's a known HTML page domain (archives.gov), skip HEAD and parse HTML directly
      const isKnownHtmlPage = url.includes('archives.gov/id/');
      
      if (!isKnownHtmlPage) {
        // First, try to check if it's a direct image link via HEAD request
        try {
          const headResponse = await axios.head(url, {
            maxRedirects: 5,
            validateStatus: (status) => status < 400,
            timeout: 5000,
          });

          const contentType = headResponse.headers["content-type"] || "";

          // If it's already an image, return the URL as-is
          if (contentType.includes("image/")) {
            return url;
          }
        } catch (headError: any) {
          console.warn("HEAD request failed, will try HTML parsing:", headError.message);
          // Continue to HTML parsing
        }
      }

      // Fetch and parse HTML to find download link
      {
        const htmlResponse = await axios.get(url);
        const $ = cheerio.load(htmlResponse.data);

        // Look for download links - archives.gov uses <a> tags with "Download" text
        // and links to s3.amazonaws.com or direct image files
        let imageUrl = "";

        // Strategy 1: Find links with "Download" text
        $('a').each((_, elem) => {
          const href = $(elem).attr("href");
          const text = $(elem).text().trim();
          
          if (href && text.toLowerCase().includes("download")) {
            // Check if it's an image URL (ends with .jpg, .png, .tiff, .pdf or contains s3.amazonaws.com)
            if (
              href.match(/\.(jpg|jpeg|png|tiff|tif|pdf)$/i) ||
              href.includes("s3.amazonaws.com") ||
              href.includes("/NARAprodstorage/")
            ) {
              imageUrl = href;
              return false; // Break the loop
            }
          }
        });

        // Strategy 2: If no download link found, look for any image URLs in links
        if (!imageUrl) {
          $('a[href*=".jpg"], a[href*=".jpeg"], a[href*=".png"], a[href*=".tiff"], a[href*=".pdf"]').each((_, elem) => {
            const href = $(elem).attr("href");
            if (href) {
              imageUrl = href;
              return false; // Break the loop
            }
          });
        }

        if (imageUrl) {
          // Handle relative URLs
          if (imageUrl.startsWith('/')) {
            const urlObj = new URL(url);
            imageUrl = `${urlObj.protocol}//${urlObj.host}${imageUrl}`;
          } else if (!imageUrl.startsWith('http')) {
            const urlObj = new URL(url);
            imageUrl = new URL(imageUrl, url).href;
          }
          console.log(`[URL Download] Extracted image URL: ${imageUrl} from page: ${url}`);
          return imageUrl;
        } else {
          console.warn(`[URL Download] Could not find image URL in HTML page: ${url}`);
        }
      }

      // If we couldn't extract an image URL, return the original URL
      console.log(`[URL Download] Using original URL: ${url}`);
      return url;
    } catch (error: any) {
      // On error, return the original URL and let downloadFromUrl handle it
      console.error("[URL Download] Error extracting image URL:", error.message);
      return url;
    }
  }

  async downloadFromUrl(
    url: string,
    subdirectory: string
  ): Promise<FileUploadResult> {
    const dir = await this.ensureUploadDir(subdirectory);
    
    // First, try to extract the actual image URL if this is an HTML page
    const imageUrl = await this.extractImageUrl(url);
    
    const response = await axios({
      method: "get",
      url: imageUrl,
      responseType: "stream",
      maxContentLength: MAX_FILE_SIZE,
      maxBodyLength: MAX_FILE_SIZE,
    });

    const contentType = response.headers["content-type"] || "";
    let extension = "jpg";
    
    if (contentType.includes("png")) extension = "png";
    else if (contentType.includes("tiff")) extension = "tiff";
    else if (contentType.includes("pdf")) extension = "pdf";

    // Use the resolved image URL (not the original HTML page URL) for filename
    const urlPath = new URL(imageUrl).pathname;
    let urlFilename = path.basename(urlPath);
    
    // Decode URL-encoded characters (e.g., %E2%80%93 becomes –)
    try {
      urlFilename = decodeURIComponent(urlFilename);
    } catch (error) {
      // If decoding fails, use the original filename
      console.warn("Failed to decode URL filename:", error);
    }
    
    // Use the actual filename from the URL without timestamp prefix
    const safeFilename = urlFilename || `download_${Date.now()}.${extension}`;
    
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
