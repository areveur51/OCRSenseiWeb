import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import { storage } from "./storage";
import { fileStorage, createUploadPath, getLegacyUploadPath } from "./file-storage";
import { ocrProcessor } from "./ocr-processor";
import { splitImage } from "./image-splitter";
import {
  insertProjectSchema,
  insertDirectorySchema,
  insertImageSchema,
  insertMonitoredSearchSchema,
  updateSettingsSchema,
} from "@shared/schema";
import { generateSlug, generateUniqueSlug } from "@shared/slugs";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 17 * 1024 * 1024, // 17MB
  },
  fileFilter: (req, file, cb) => {
    // Only allow PNG and JPG files for reliable OCR processing
    const allowedFormats = ["jpg", "jpeg", "png"];
    const ext = file.originalname.split(".").pop()?.toLowerCase();
    
    if (ext && allowedFormats.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file format. Only PNG and JPG files are allowed."));
    }
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Projects
  app.get("/api/projects", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const projects = await storage.getAllProjects(limit);
      
      const projectsWithStats = await Promise.all(
        projects.map(async (project) => {
          const stats = await storage.getProjectStats(project.id);
          return {
            ...project,
            ...stats,
          };
        })
      );
      
      res.json(projectsWithStats);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/projects/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const project = await storage.getProject(id);
      
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      
      const stats = await storage.getProjectStats(id);
      res.json({ ...project, ...stats });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/projects", async (req, res) => {
    try {
      const validated = insertProjectSchema.parse(req.body);
      
      // Generate slug from project name
      const baseSlug = generateSlug(validated.name);
      
      // Get existing project slugs to ensure uniqueness
      const existingProjects = await storage.getAllProjects();
      const existingSlugs = existingProjects.map(p => p.slug);
      const uniqueSlug = generateUniqueSlug(baseSlug, existingSlugs);
      
      const project = await storage.createProject({
        name: validated.name,
        description: validated.description,
        slug: uniqueSlug,
      } as any);
      res.status(201).json(project);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/projects/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = insertProjectSchema.partial().parse(req.body);
      const project = await storage.updateProject(id, updates);
      
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      
      res.json(project);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/projects/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      const project = await storage.getProject(id);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      
      const directories = await storage.getDirectoriesByProject(id);
      for (const dir of directories) {
        // Delete both new readable path and legacy path for backwards compatibility
        const uploadPath = createUploadPath(project.name, dir.name, project.id, dir.id);
        const legacyPath = getLegacyUploadPath(project.id, dir.id);
        await fileStorage.deleteDirectory(uploadPath);
        await fileStorage.deleteDirectory(legacyPath);
      }
      
      const success = await storage.deleteProject(id);
      
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/projects/:id/convert-to-directory", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { targetProjectId, newParentDirId } = req.body;
      
      if (!targetProjectId) {
        return res.status(400).json({ error: "targetProjectId is required" });
      }
      
      const newDir = await storage.convertProjectToDirectory(id, targetProjectId, newParentDirId);
      res.status(200).json(newDir);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/projects/:id/reorder", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { sortOrder } = req.body;
      
      if (sortOrder === undefined) {
        return res.status(400).json({ error: "sortOrder is required" });
      }

      const success = await storage.updateProjectOrder(id, sortOrder);
      if (!success) {
        return res.status(404).json({ error: "Project not found" });
      }
      
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error reordering project:", error);
      res.status(500).json({ 
        error: error.message || "Failed to reorder project" 
      });
    }
  });

  // Directories
  app.post("/api/directories/:id/convert-to-project", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      const newProject = await storage.convertDirectoryToProject(id);
      res.status(200).json(newProject);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  app.get("/api/projects/:projectId/directories", async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const directories = await storage.getDirectoriesByProject(projectId);
      res.json(directories);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/directories", async (req, res) => {
    try {
      const validated = insertDirectorySchema.parse(req.body);
      
      // Normalize the name (trim whitespace)
      const normalizedName = validated.name.trim();
      
      // Prevent empty names after trimming
      if (!normalizedName) {
        return res.status(400).json({ error: "Directory name cannot be empty" });
      }
      
      // Get existing directories in this project
      const existingDirectories = await storage.getDirectoriesByProject(validated.projectId);
      
      // Check for duplicate names at the same level (same parentId, case-insensitive)
      const duplicateAtSameLevel = existingDirectories.find(
        d => d.name.trim().toLowerCase() === normalizedName.toLowerCase() && 
             d.parentId === validated.parentId
      );
      
      if (duplicateAtSameLevel) {
        const parentName = validated.parentId 
          ? existingDirectories.find(d => d.id === validated.parentId)?.name || "parent directory"
          : "root level";
        return res.status(400).json({ 
          error: `A directory named "${normalizedName}" already exists at ${parentName}` 
        });
      }
      
      // Generate slug from normalized directory name
      const baseSlug = generateSlug(normalizedName);
      
      // Get existing directory slugs to ensure uniqueness
      const existingSlugs = existingDirectories.map(d => d.slug);
      const uniqueSlug = generateUniqueSlug(baseSlug, existingSlugs);
      
      const directory = await storage.createDirectory({
        projectId: validated.projectId,
        name: normalizedName,
        path: validated.path,
        parentId: validated.parentId,
        slug: uniqueSlug,
      } as any);
      res.status(201).json(directory);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/directories/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = insertDirectorySchema.partial().parse(req.body);
      
      // Get the directory being updated
      const directory = await storage.getDirectory(id);
      if (!directory) {
        return res.status(404).json({ error: "Directory not found" });
      }
      
      // If renaming, check for duplicate names at the same level
      if (updates.name) {
        // Normalize the name (trim whitespace)
        const normalizedName = updates.name.trim();
        
        // Prevent empty names after trimming
        if (!normalizedName) {
          return res.status(400).json({ error: "Directory name cannot be empty" });
        }
        
        // Check if name actually changed (after normalization)
        if (normalizedName.toLowerCase() !== directory.name.trim().toLowerCase()) {
          const existingDirectories = await storage.getDirectoriesByProject(directory.projectId);
          const duplicateAtSameLevel = existingDirectories.find(
            d => d.id !== id && 
                 d.name.trim().toLowerCase() === normalizedName.toLowerCase() && 
                 d.parentId === directory.parentId
          );
          
          if (duplicateAtSameLevel) {
            const parentName = directory.parentId 
              ? existingDirectories.find(d => d.id === directory.parentId)?.name || "parent directory"
              : "root level";
            return res.status(400).json({ 
              error: `A directory named "${normalizedName}" already exists at ${parentName}` 
            });
          }
          
          // Generate new slug if name changed
          const baseSlug = generateSlug(normalizedName);
          const existingSlugs = existingDirectories.filter(d => d.id !== id).map(d => d.slug);
          const uniqueSlug = generateUniqueSlug(baseSlug, existingSlugs);
          updates.slug = uniqueSlug;
        }
        
        // Update the name to the normalized version
        updates.name = normalizedName;
      }
      
      const updatedDirectory = await storage.updateDirectory(id, updates);
      
      if (!updatedDirectory) {
        return res.status(404).json({ error: "Directory not found" });
      }
      
      res.json(updatedDirectory);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/directories/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const directory = await storage.getDirectory(id);
      
      if (!directory) {
        return res.status(404).json({ error: "Directory not found" });
      }
      
      const project = await storage.getProject(directory.projectId);
      if (project) {
        // Delete both new readable path and legacy path for backwards compatibility
        const uploadPath = createUploadPath(project.name, directory.name, project.id, directory.id);
        const legacyPath = getLegacyUploadPath(project.id, directory.id);
        await fileStorage.deleteDirectory(uploadPath);
        await fileStorage.deleteDirectory(legacyPath);
      }
      
      const success = await storage.deleteDirectory(id);
      
      if (!success) {
        return res.status(404).json({ error: "Directory not found" });
      }
      
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/directories/:id/reorder", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { sortOrder } = req.body;
      
      if (typeof sortOrder !== 'number') {
        return res.status(400).json({ error: "sortOrder must be a number" });
      }
      
      const success = await storage.updateDirectoryOrder(id, sortOrder);
      
      if (!success) {
        return res.status(404).json({ error: "Directory not found" });
      }
      
      res.status(200).json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/directories/:id/change-parent", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { newParentId, newPath } = req.body;
      
      if (typeof newPath !== 'string') {
        return res.status(400).json({ error: "newPath must be a string" });
      }
      
      // Get the directory being moved
      const directory = await storage.getDirectory(id);
      if (!directory) {
        return res.status(404).json({ error: "Directory not found" });
      }

      // If setting a new parent, validate it
      if (newParentId !== null) {
        const newParent = await storage.getDirectory(parseInt(newParentId));
        if (!newParent) {
          return res.status(404).json({ error: "Target parent directory not found" });
        }

        // Ensure both directories are in the same project
        if (directory.projectId !== newParent.projectId) {
          return res.status(400).json({ error: "Cannot move directory to a different project" });
        }

        // Prevent circular dependencies: check if newParent is a descendant of directory
        const isDescendant = async (parentId: number | null, ancestorId: number): Promise<boolean> => {
          if (!parentId) return false;
          if (parentId === ancestorId) return true;
          const parent = await storage.getDirectory(parentId);
          return parent ? isDescendant(parent.parentId, ancestorId) : false;
        };

        if (await isDescendant(parseInt(newParentId), id)) {
          return res.status(400).json({ error: "Cannot move directory into itself or its descendants" });
        }
      }
      
      const updated = await storage.changeDirectoryParent(
        id, 
        newParentId === null ? null : parseInt(newParentId),
        newPath
      );
      
      if (!updated) {
        return res.status(404).json({ error: "Failed to update directory" });
      }
      
      res.status(200).json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Images
  app.get("/api/directories/:directoryId/images", async (req, res) => {
    try {
      const directoryId = parseInt(req.params.directoryId);
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 25;
      
      const allImages = await storage.getImagesByDirectory(directoryId);
      
      // Apply pagination
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedImages = allImages.slice(startIndex, endIndex);
      
      const imagesWithOcr = await Promise.all(
        paginatedImages.map(async (image) => {
          const ocrResult = await storage.getOcrResultByImage(image.id);
          const queueItem = await storage.getQueueItemByImage(image.id);
          return {
            ...image,
            ocrResult,
            processingStatus: queueItem?.status || "not_queued",
          };
        })
      );
      
      res.json({
        images: imagesWithOcr,
        pagination: {
          page,
          limit,
          total: allImages.length,
          totalPages: Math.ceil(allImages.length / limit),
        },
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/images/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const image = await storage.getImage(id);
      
      if (!image) {
        return res.status(404).json({ error: "Image not found" });
      }
      
      const ocrResult = await storage.getOcrResultByImage(id);
      const queueItem = await storage.getQueueItemByImage(id);
      
      res.json({
        ...image,
        ocrResult,
        processingStatus: queueItem?.status || "not_queued",
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/images/:id/file", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const image = await storage.getImage(id);
      
      if (!image) {
        return res.status(404).json({ error: "Image not found" });
      }
      
      // Prefer database storage, fall back to filesystem
      if (image.imageData) {
        const mimeType = {
          'jpg': 'image/jpeg',
          'jpeg': 'image/jpeg',
          'png': 'image/png',
          'tiff': 'image/tiff',
          'tif': 'image/tiff',
          'pdf': 'application/pdf',
        }[image.format.toLowerCase()] || 'application/octet-stream';
        
        res.set('Content-Type', mimeType);
        res.set('Content-Length', image.imageData.length.toString());
        res.send(image.imageData);
      } else if (image.filePath) {
        // Fallback to filesystem for legacy images
        const filePath = fileStorage.getFilePath(image.filePath);
        res.sendFile(filePath);
      } else {
        res.status(404).json({ error: "Image data not found" });
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/images/:id/text", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const ocrResult = await storage.getOcrResultByImage(id);
      
      if (!ocrResult) {
        return res.status(404).json({ error: "OCR result not found" });
      }
      
      res.json({ 
        text: ocrResult.consensusText,
        confidence: ocrResult.pytesseractConfidence,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/images/:id/results", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const ocrResult = await storage.getOcrResultByImage(id);
      
      if (!ocrResult) {
        return res.status(404).json({ error: "OCR result not found" });
      }
      
      res.json(ocrResult);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/images/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      // Only allow updating filename for now (rename operation)
      const { filename } = req.body;
      if (!filename || typeof filename !== 'string') {
        return res.status(400).json({ error: "filename is required" });
      }
      
      const image = await storage.updateImage(id, { filename });
      
      if (!image) {
        return res.status(404).json({ error: "Image not found" });
      }
      
      res.json(image);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/images/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteImage(id);
      
      if (!success) {
        return res.status(404).json({ error: "Image not found" });
      }
      
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // File Upload
  app.post("/api/directories/:directoryId/upload", upload.array("images", 20), async (req, res) => {
    try {
      const directoryId = parseInt(req.params.directoryId);
      const files = req.files as Express.Multer.File[];
      
      if (!files || files.length === 0) {
        return res.status(400).json({ error: "No files uploaded" });
      }
      
      const directory = await storage.getDirectory(directoryId);
      if (!directory) {
        return res.status(404).json({ error: "Directory not found" });
      }
      
      const project = await storage.getProject(directory.projectId);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      
      const uploadPath = createUploadPath(project.name, directory.name, project.id, directoryId);
      const uploadedImages = [];
      
      for (const file of files) {
        // Check if image has extreme dimensions and should be split
        const splitResult = await splitImage(file.buffer, {
          max_width: 2550,
          max_height: 3300,
          overlap: 100,
          aspect_ratio_threshold: 5.0,
        });
        
        if (!splitResult.success) {
          console.error("Image splitting check failed:", splitResult.error);
          // Fall back to normal upload if splitter fails
          const fileResult = await fileStorage.saveUploadedFile(file, uploadPath);
          const filenameWithoutExt = file.originalname.replace(/\.[^.]+$/, '');
          const baseSlug = generateSlug(filenameWithoutExt);
          const existingImages = await storage.getImagesByDirectory(directoryId);
          const existingSlugs = existingImages.map(img => img.slug);
          const uniqueSlug = generateUniqueSlug(baseSlug, existingSlugs);
          
          const image = await storage.createImage({
            directoryId,
            filename: fileResult.filename,
            originalFilename: file.originalname,
            slug: uniqueSlug,
            filePath: fileResult.filePath,
            fileSize: fileResult.fileSize,
            format: fileResult.format,
            width: fileResult.width || null,
            height: fileResult.height || null,
            sourceType: "upload",
            sourceUrl: null,
            imageData: file.buffer,
          } as any);
          
          await storage.createQueueItem({
            imageId: image.id,
            status: "pending",
            priority: 0,
            attempts: 0,
            errorMessage: null,
          });
          
          uploadedImages.push(image);
          continue;
        }
        
        if (splitResult.should_split && splitResult.tiles && splitResult.tiles.length > 0) {
          // Image has extreme dimensions - split into multiple uploads
          console.log(`Splitting extreme image: ${file.originalname} (${splitResult.original_dimensions![0]}x${splitResult.original_dimensions![1]}) into ${splitResult.tile_count} tiles`);
          
          const filenameWithoutExt = file.originalname.replace(/\.[^.]+$/, '');
          const baseSlug = generateSlug(filenameWithoutExt);
          
          // Get existing slugs once for all tiles
          const existingImages = await storage.getImagesByDirectory(directoryId);
          let existingSlugs = existingImages.map(img => img.slug);
          
          for (const tile of splitResult.tiles) {
            // Convert base64 back to buffer
            const tileBuffer = Buffer.from(tile.data, 'base64');
            
            // Create incremented filename
            const tileName = `${filenameWithoutExt}-${tile.index}`;
            const tileSlug = generateUniqueSlug(generateSlug(tileName), existingSlugs);
            existingSlugs.push(tileSlug); // Add to list to prevent duplicates
            
            // Save tile as if it were a normal upload
            const tileFile = {
              ...file,
              originalname: `${tileName}.png`,
              buffer: tileBuffer,
              size: tileBuffer.length,
            };
            
            const fileResult = await fileStorage.saveUploadedFile(tileFile as any, uploadPath);
            
            const image = await storage.createImage({
              directoryId,
              filename: fileResult.filename,
              originalFilename: `${tileName}.png`,
              slug: tileSlug,
              filePath: fileResult.filePath,
              fileSize: fileResult.fileSize,
              format: 'png',
              width: tile.dimensions[0],
              height: tile.dimensions[1],
              sourceType: "upload",
              sourceUrl: null,
              imageData: tileBuffer,
            } as any);
            
            await storage.createQueueItem({
              imageId: image.id,
              status: "pending",
              priority: 0,
              attempts: 0,
              errorMessage: null,
            });
            
            uploadedImages.push(image);
          }
        } else {
          // Normal image - upload as-is
          const fileResult = await fileStorage.saveUploadedFile(file, uploadPath);
          
          const filenameWithoutExt = file.originalname.replace(/\.[^.]+$/, '');
          const baseSlug = generateSlug(filenameWithoutExt);
          
          const existingImages = await storage.getImagesByDirectory(directoryId);
          const existingSlugs = existingImages.map(img => img.slug);
          const uniqueSlug = generateUniqueSlug(baseSlug, existingSlugs);
          
          const image = await storage.createImage({
            directoryId,
            filename: fileResult.filename,
            originalFilename: file.originalname,
            slug: uniqueSlug,
            filePath: fileResult.filePath,
            fileSize: fileResult.fileSize,
            format: fileResult.format,
            width: splitResult.original_dimensions?.[0] || null,
            height: splitResult.original_dimensions?.[1] || null,
            sourceType: "upload",
            sourceUrl: null,
            imageData: file.buffer,
          } as any);
          
          await storage.createQueueItem({
            imageId: image.id,
            status: "pending",
            priority: 0,
            attempts: 0,
            errorMessage: null,
          });
          
          uploadedImages.push(image);
        }
      }
      
      res.status(201).json(uploadedImages);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // URL Download
  app.post("/api/directories/:directoryId/download-url", async (req, res) => {
    try {
      const directoryId = parseInt(req.params.directoryId);
      const { url } = req.body;
      
      if (!url) {
        return res.status(400).json({ error: "URL is required" });
      }
      
      const directory = await storage.getDirectory(directoryId);
      if (!directory) {
        return res.status(404).json({ error: "Directory not found" });
      }
      
      const project = await storage.getProject(directory.projectId);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      
      const uploadPath = createUploadPath(project.name, directory.name, project.id, directoryId);
      const fileResult = await fileStorage.downloadFromUrl(
        url,
        uploadPath
      );
      
      // Generate slug from downloaded filename (without extension)
      const filenameWithoutExt = fileResult.filename.replace(/\.[^.]+$/, '');
      const baseSlug = generateSlug(filenameWithoutExt);
      
      // Get existing slugs in this directory to ensure uniqueness
      const existingImages = await storage.getImagesByDirectory(directoryId);
      const existingSlugs = existingImages.map(img => img.slug);
      const uniqueSlug = generateUniqueSlug(baseSlug, existingSlugs);
      
      const image = await storage.createImage({
        directoryId,
        filename: fileResult.filename,
        originalFilename: fileResult.filename,
        slug: uniqueSlug,
        filePath: fileResult.filePath,
        fileSize: fileResult.fileSize,
        format: fileResult.format,
        width: fileResult.width || null,
        height: fileResult.height || null,
        sourceType: "url",
        sourceUrl: url,
        imageData: fileResult.buffer,
      } as any);
      
      await storage.createQueueItem({
        imageId: image.id,
        status: "pending",
        priority: 0,
        attempts: 0,
        errorMessage: null,
      });
      
      res.status(201).json(image);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // OCR Processing
  app.post("/api/images/:id/process", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const image = await storage.getImage(id);
      
      if (!image) {
        return res.status(404).json({ error: "Image not found" });
      }
      
      let queueItem = await storage.getQueueItemByImage(id);
      
      if (!queueItem) {
        queueItem = await storage.createQueueItem({
          imageId: id,
          status: "pending",
          priority: 1,
          attempts: 0,
          errorMessage: null,
        });
      } else {
        await storage.updateQueueItem(queueItem.id, {
          status: "pending",
          priority: 1,
        });
      }
      
      res.json({ message: "Image queued for processing", queueItem });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Batch OCR Processing
  app.post("/api/images/batch/process", async (req, res) => {
    try {
      const { imageIds } = req.body;
      
      if (!Array.isArray(imageIds) || imageIds.length === 0) {
        return res.status(400).json({ error: "imageIds must be a non-empty array" });
      }
      
      if (imageIds.length > 100) {
        return res.status(400).json({ error: "Maximum 100 images per batch" });
      }
      
      const queuedItems = [];
      const errors = [];
      
      for (const id of imageIds) {
        try {
          const image = await storage.getImage(parseInt(id));
          
          if (!image) {
            errors.push({ imageId: id, error: "Image not found" });
            continue;
          }
          
          let queueItem = await storage.getQueueItemByImage(parseInt(id));
          
          if (!queueItem) {
            queueItem = await storage.createQueueItem({
              imageId: parseInt(id),
              status: "pending",
              priority: 1,
              attempts: 0,
              errorMessage: null,
            });
          } else {
            await storage.updateQueueItem(queueItem.id, {
              status: "pending",
              priority: 1,
            });
          }
          
          queuedItems.push(queueItem);
        } catch (error: any) {
          errors.push({ imageId: id, error: error.message });
        }
      }
      
      res.json({ 
        message: `Batch queued: ${queuedItems.length} images`,
        queued: queuedItems.length,
        failed: errors.length,
        queuedItems,
        errors: errors.length > 0 ? errors : undefined
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/processing-queue", async (req, res) => {
    try {
      const queuedItems = await storage.getQueuedItems();
      res.json(queuedItems);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Search
  app.get("/api/search", async (req, res) => {
    try {
      const { q, offset, limit } = req.query;
      
      if (!q || typeof q !== "string") {
        return res.status(400).json({ error: "Query parameter 'q' is required" });
      }
      
      const options = {
        offset: offset ? parseInt(offset as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
      };
      
      const { results, total } = await storage.searchText(q, options);
      res.json({ results, total });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Monitored Searches
  app.get("/api/monitored-searches", async (req, res) => {
    try {
      const searches = await storage.getMonitoredSearches();
      res.json(searches);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/monitored-searches", async (req, res) => {
    try {
      const validated = insertMonitoredSearchSchema.parse(req.body);
      const search = await storage.createMonitoredSearch(validated);
      res.status(201).json(search);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/monitored-searches/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteMonitoredSearch(id);
      
      if (!deleted) {
        return res.status(404).json({ error: "Monitored search not found" });
      }
      
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Settings
  app.get("/api/settings", async (req, res) => {
    try {
      const appSettings = await storage.getSettings();
      res.json(appSettings);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/settings", async (req, res) => {
    try {
      const validated = updateSettingsSchema.parse(req.body);
      const updated = await storage.updateSettings(validated);
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Slug-based routes for shareable URLs
  // Project by slug
  app.get("/api/p/:projectSlug", async (req, res) => {
    try {
      const slug = req.params.projectSlug;
      const project = await storage.getProjectBySlug(slug);
      
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      
      const stats = await storage.getProjectStats(project.id);
      res.json({ ...project, ...stats });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Directories by project slug
  app.get("/api/p/:projectSlug/directories", async (req, res) => {
    try {
      const slug = req.params.projectSlug;
      const project = await storage.getProjectBySlug(slug);
      
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      
      const directories = await storage.getDirectoriesByProject(project.id);
      res.json(directories);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Directory by slug (within project)
  app.get("/api/p/:projectSlug/:dirSlug", async (req, res) => {
    try {
      const { projectSlug, dirSlug } = req.params;
      const project = await storage.getProjectBySlug(projectSlug);
      
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      
      const directory = await storage.getDirectoryBySlug(project.id, dirSlug);
      
      if (!directory) {
        return res.status(404).json({ error: "Directory not found" });
      }
      
      res.json(directory);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Images by directory slug
  app.get("/api/p/:projectSlug/:dirSlug/images", async (req, res) => {
    try {
      const { projectSlug, dirSlug } = req.params;
      const project = await storage.getProjectBySlug(projectSlug);
      
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      
      const directory = await storage.getDirectoryBySlug(project.id, dirSlug);
      
      if (!directory) {
        return res.status(404).json({ error: "Directory not found" });
      }
      
      const images = await storage.getImagesByDirectory(directory.id);
      res.json(images);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Image by slug (within directory)
  app.get("/api/p/:projectSlug/:dirSlug/img/:imageSlug", async (req, res) => {
    try {
      const { projectSlug, dirSlug, imageSlug } = req.params;
      const project = await storage.getProjectBySlug(projectSlug);
      
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      
      const directory = await storage.getDirectoryBySlug(project.id, dirSlug);
      
      if (!directory) {
        return res.status(404).json({ error: "Directory not found" });
      }
      
      const image = await storage.getImageBySlug(directory.id, imageSlug);
      
      if (!image) {
        return res.status(404).json({ error: "Image not found" });
      }
      
      const ocrResult = await storage.getOcrResultByImage(image.id);
      const queueItem = await storage.getQueueItemByImage(image.id);
      
      res.json({
        ...image,
        ocrResult,
        processingStatus: queueItem?.status || "not_queued",
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  const httpServer = createServer(app);

  // Start OCR processing queue
  ocrProcessor.startProcessing().catch(console.error);

  return httpServer;
}
