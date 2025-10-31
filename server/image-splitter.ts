import { spawn } from "child_process";
import path from "path";
import fs from "fs";

export interface ImageTile {
  index: number;
  data: string; // base64-encoded PNG
  format: string;
  dimensions: [number, number];
  box: [number, number, number, number];
}

export interface SplitResult {
  success: boolean;
  should_split: boolean;
  original_dimensions?: [number, number];
  tiles?: ImageTile[];
  tile_count?: number;
  split_direction?: 'vertical' | 'horizontal';
  error?: string;
  traceback?: string;
}

export interface SplitConfig {
  max_width?: number;
  max_height?: number;
  overlap?: number;
  aspect_ratio_threshold?: number;
}

export async function splitImage(
  imageBuffer: Buffer,
  config: SplitConfig = {}
): Promise<SplitResult> {
  // Create temporary file for Python script
  const tempDir = path.join(process.cwd(), "temp");
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  
  const tempPath = path.join(tempDir, `split_${Date.now()}_${Math.random().toString(36).slice(2)}.png`);
  fs.writeFileSync(tempPath, imageBuffer);
  
  const pythonScript = path.join(process.cwd(), "server", "image-splitter.py");
  const configJson = JSON.stringify(config);
  
  return new Promise((resolve, reject) => {
    const pythonProcess = spawn("python3", [pythonScript, tempPath, configJson]);
    let outputData = "";
    let errorData = "";
    
    pythonProcess.stdout.on("data", (data) => {
      outputData += data.toString();
    });
    
    pythonProcess.stderr.on("data", (data) => {
      errorData += data.toString();
    });
    
    pythonProcess.on("close", (code) => {
      // Clean up temp file
      try {
        if (fs.existsSync(tempPath)) {
          fs.unlinkSync(tempPath);
        }
      } catch (err) {
        console.error("Failed to delete temp file:", tempPath, err);
      }
      
      if (code !== 0) {
        console.error("Image splitter failed:");
        console.error("Exit code:", code);
        console.error("Stderr:", errorData);
        console.error("Stdout:", outputData);
        reject(new Error(`Image splitter exited with code ${code}. Stderr: ${errorData}`));
        return;
      }
      
      try {
        const result: SplitResult = JSON.parse(outputData);
        resolve(result);
      } catch (error) {
        console.error("Failed to parse splitter output:", outputData.substring(0, 500));
        reject(new Error(`Failed to parse splitter output: ${outputData.substring(0, 200)}`));
      }
    });
    
    pythonProcess.on("error", (error) => {
      // Clean up temp file
      try {
        if (fs.existsSync(tempPath)) {
          fs.unlinkSync(tempPath);
        }
      } catch (err) {
        console.error("Failed to delete temp file:", tempPath, err);
      }
      reject(new Error(`Failed to spawn image splitter: ${error.message}`));
    });
  });
}
