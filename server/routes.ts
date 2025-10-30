import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import { storage } from "./storage";
import { fileStorage, createUploadPath, getLegacyUploadPath } from "./file-storage";
import { ocrProcessor } from "./ocr-processor";
import {
  insertProjectSchema,
  insertDirectorySchema,
  insertImageSchema,
} from "@shared/schema";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 17 * 1024 * 1024, // 17MB
  },
  fileFilter: (req, file, cb) => {
    const allowedFormats = ["jpg", "jpeg", "png", "tiff", "tif", "pdf"];
    const ext = file.originalname.split(".").pop()?.toLowerCase();
    
    if (ext && allowedFormats.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file format. Allowed: JPG, PNG, TIFF, PDF"));
    }
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Projects
  app.get("/api/projects", async (req, res) => {
    try {
      const projects = await storage.getAllProjects();
      
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
      const project = await storage.createProject(validated);
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

  // Directories
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
      const directory = await storage.createDirectory(validated);
      res.status(201).json(directory);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/directories/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = insertDirectorySchema.partial().parse(req.body);
      const directory = await storage.updateDirectory(id, updates);
      
      if (!directory) {
        return res.status(404).json({ error: "Directory not found" });
      }
      
      res.json(directory);
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

  // Images
  app.get("/api/directories/:directoryId/images", async (req, res) => {
    try {
      const directoryId = parseInt(req.params.directoryId);
      const images = await storage.getImagesByDirectory(directoryId);
      
      const imagesWithOcr = await Promise.all(
        images.map(async (image) => {
          const ocrResult = await storage.getOcrResultByImage(image.id);
          const queueItem = await storage.getQueueItemByImage(image.id);
          return {
            ...image,
            ocrResult,
            processingStatus: queueItem?.status || "not_queued",
          };
        })
      );
      
      res.json(imagesWithOcr);
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

  app.patch("/api/images/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = insertImageSchema.partial().parse(req.body);
      const image = await storage.updateImage(id, updates);
      
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
        const fileResult = await fileStorage.saveUploadedFile(
          file,
          uploadPath
        );
        
        const image = await storage.createImage({
          directoryId,
          filename: fileResult.filename,
          originalFilename: file.originalname,
          filePath: fileResult.filePath,
          fileSize: fileResult.fileSize,
          format: fileResult.format,
          width: fileResult.width || null,
          height: fileResult.height || null,
          sourceType: "upload",
          sourceUrl: null,
          imageData: file.buffer,
        });
        
        await storage.createQueueItem({
          imageId: image.id,
          status: "pending",
          priority: 0,
          attempts: 0,
          errorMessage: null,
        });
        
        uploadedImages.push(image);
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
      
      const image = await storage.createImage({
        directoryId,
        filename: fileResult.filename,
        originalFilename: fileResult.filename,
        filePath: fileResult.filePath,
        fileSize: fileResult.fileSize,
        format: fileResult.format,
        width: fileResult.width || null,
        height: fileResult.height || null,
        sourceType: "url",
        sourceUrl: url,
        imageData: fileResult.buffer,
      });
      
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
      const { q } = req.query;
      
      if (!q || typeof q !== "string") {
        return res.status(400).json({ error: "Query parameter 'q' is required" });
      }
      
      const results = await storage.searchText(q);
      res.json(results);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  const httpServer = createServer(app);

  // Start OCR processing queue
  ocrProcessor.startProcessing().catch(console.error);

  return httpServer;
}
