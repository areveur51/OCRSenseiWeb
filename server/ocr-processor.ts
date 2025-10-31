import { spawn } from "child_process";
import path from "path";
import fs from "fs";
import { storage } from "./storage";
import { fileStorage } from "./file-storage";

interface OcrResult {
  success: boolean;
  pytesseract_text?: string;
  pytesseract_confidence?: number;
  easyocr_text?: string;
  easyocr_confidence?: number;
  consensus_text?: string;
  consensus_source?: string;
  bounding_boxes?: Array<{
    text: string;
    confidence: number;
    x: number;
    y: number;
    width: number;
    height: number;
  }>;
  error?: string;
}

export class OcrProcessor {
  private processing = false;
  private queue: number[] = [];
  private workerCount = 2;
  private activeWorkers = 0;

  async processImage(imageId: number): Promise<OcrResult> {
    const image = await storage.getImage(imageId);
    if (!image) {
      throw new Error(`Image ${imageId} not found`);
    }

    // Get OCR settings from database
    const settings = await storage.getSettings();
    
    // Build OCR configuration
    const ocrConfig = {
      oem: settings.ocrEngineMode,
      psm1: settings.ocrPsmConfig1,
      psm2: settings.ocrPsmConfig2,
      preprocessing: settings.ocrPreprocessing === 1,
      upscale: settings.ocrUpscale === 1,
      denoise: settings.ocrDenoise === 1,
      deskew: settings.ocrDeskew === 1,
      performancePreset: settings.ocrPerformancePreset || 'balanced',
      enableCache: settings.ocrEnableCache === 1,
    };

    let imagePath: string;
    let tempFile = false;

    // Check if image is stored in database or filesystem
    if (image.imageData) {
      // Image is in database, create temporary file
      const tempDir = path.join(process.cwd(), "temp");
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      // Use the correct file extension based on the image format
      const extension = image.format?.toLowerCase() || 'png';
      imagePath = path.join(tempDir, `ocr_${imageId}_${Date.now()}.${extension}`);
      
      // Ensure we have a proper Buffer for writing
      // Neon serverless may return Uint8Array or JSON representation of Buffer
      let bufferData: Buffer;
      const imageData: any = image.imageData; // Type assertion for complex type checking
      
      if (Buffer.isBuffer(imageData)) {
        bufferData = imageData;
      } else if (imageData instanceof Uint8Array) {
        bufferData = Buffer.from(imageData);
      } else if (typeof imageData === 'object' && imageData !== null && imageData.type === 'Buffer' && Array.isArray(imageData.data)) {
        // Neon returns bytea as {type: 'Buffer', data: [bytes...]}
        bufferData = Buffer.from(imageData.data);
      } else if (typeof imageData === 'string') {
        // Base64 encoded
        bufferData = Buffer.from(imageData, 'base64');
      } else if (Array.isArray(imageData)) {
        bufferData = Buffer.from(imageData);
      } else {
        throw new Error(`Unexpected imageData type: ${typeof imageData}, value: ${JSON.stringify(imageData).slice(0, 200)}`);
      }
      
      fs.writeFileSync(imagePath, bufferData);
      tempFile = true;
    } else if (image.filePath) {
      // Image is in filesystem (legacy)
      imagePath = fileStorage.getFilePath(image.filePath);
    } else {
      throw new Error(`Image ${imageId} has no imageData or filePath`);
    }

    const pythonScript = path.join(process.cwd(), "server", "ocr-service.py");
    const configJson = JSON.stringify(ocrConfig);
    
    if (!imagePath) {
      throw new Error("Image path is required");
    }

    return new Promise((resolve, reject) => {
      const pythonProcess = spawn("python3", [pythonScript, imagePath, configJson]);
      let outputData = "";
      let errorData = "";

      pythonProcess.stdout.on("data", (data) => {
        outputData += data.toString();
      });

      pythonProcess.stderr.on("data", (data) => {
        errorData += data.toString();
      });

      pythonProcess.on("close", (code) => {
        // Clean up temporary file if it was created
        if (tempFile && fs.existsSync(imagePath)) {
          try {
            fs.unlinkSync(imagePath);
          } catch (error) {
            console.error("Failed to delete temporary file:", imagePath, error);
          }
        }

        if (code !== 0) {
          console.error("OCR Python process failed:");
          console.error("Exit code:", code);
          console.error("Stderr:", errorData);
          console.error("Stdout:", outputData);
          console.error("Image path:", imagePath);
          console.error("Config:", configJson);
          reject(new Error(`OCR process exited with code ${code}. Stderr: ${errorData}. Stdout: ${outputData}`));
          return;
        }

        try {
          const result: OcrResult = JSON.parse(outputData);
          resolve(result);
        } catch (error) {
          reject(new Error(`Failed to parse OCR output: ${outputData}`));
        }
      });

      pythonProcess.on("error", (error) => {
        // Clean up temporary file if it was created
        if (tempFile && fs.existsSync(imagePath)) {
          try {
            fs.unlinkSync(imagePath);
          } catch (cleanupError) {
            console.error("Failed to delete temporary file:", imagePath, cleanupError);
          }
        }
        reject(new Error(`Failed to spawn OCR process: ${error.message}`));
      });
    });
  }

  async processQueueItem(queueId: number): Promise<void> {
    const queueItem = await storage.getQueueItem(queueId);
    if (!queueItem) {
      throw new Error(`Queue item ${queueId} not found`);
    }

    await storage.updateQueueItem(queueId, {
      status: "processing",
      startedAt: new Date(),
    });

    try {
      const result = await this.processImage(queueItem.imageId);

      if (result.success) {
        // Upsert OCR result: updates existing or inserts new
        // This is atomic and safe - no data loss if processing fails
        await storage.upsertOcrResult({
          imageId: queueItem.imageId,
          pytesseractText: result.pytesseract_text || null,
          pytesseractConfidence: result.pytesseract_confidence || null,
          easyocrText: result.easyocr_text || null,
          easyocrConfidence: result.easyocr_confidence || null,
          consensusText: result.consensus_text || null,
          consensusSource: result.consensus_source || null,
          boundingBoxes: result.bounding_boxes as any,
        });

        await storage.updateQueueItem(queueId, {
          status: "completed",
          completedAt: new Date(),
        });
      } else {
        throw new Error(result.error || "OCR processing failed");
      }
    } catch (error: any) {
      await storage.updateQueueItem(queueId, {
        status: "failed",
        errorMessage: error.message,
        attempts: queueItem.attempts + 1,
        completedAt: new Date(),
      });
      throw error;
    }
  }

  async startProcessing(): Promise<void> {
    if (this.processing) {
      return;
    }

    this.processing = true;
    
    // Get worker count from settings
    try {
      const settings = await storage.getSettings();
      this.workerCount = settings.ocrWorkerCount || 2;
      console.log(`OCR processor starting with ${this.workerCount} concurrent workers`);
    } catch (error) {
      console.error("Failed to load worker count from settings, using default:", error);
      this.workerCount = 2;
    }

    // Start multiple concurrent workers
    const workers = [];
    for (let i = 0; i < this.workerCount; i++) {
      workers.push(this.worker(i));
    }

    await Promise.all(workers);
  }

  private async worker(workerId: number): Promise<void> {
    console.log(`OCR worker ${workerId} started`);
    
    while (this.processing) {
      try {
        const queuedItems = await storage.getQueuedItems();
        
        if (queuedItems.length === 0) {
          await new Promise((resolve) => setTimeout(resolve, 5000));
          continue;
        }

        // Find first item not being processed by another worker
        const item = queuedItems.find(item => item.status === 'pending');
        
        if (!item) {
          await new Promise((resolve) => setTimeout(resolve, 2000));
          continue;
        }

        this.activeWorkers++;
        console.log(`Worker ${workerId} processing OCR queue item ${item.id} for image ${item.imageId} (${this.activeWorkers}/${this.workerCount} workers active)`);
        
        try {
          await this.processQueueItem(item.id);
          console.log(`Worker ${workerId} completed OCR queue item ${item.id}`);
        } finally {
          this.activeWorkers--;
        }
      } catch (error) {
        console.error(`Worker ${workerId} error processing queue:`, error);
        this.activeWorkers--;
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    }
    
    console.log(`OCR worker ${workerId} stopped`);
  }

  stopProcessing(): void {
    this.processing = false;
  }
}

export const ocrProcessor = new OcrProcessor();
