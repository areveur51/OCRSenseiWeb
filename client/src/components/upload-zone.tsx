import { Upload, FileImage } from "lucide-react";
import { useState } from "react";

interface UploadZoneProps {
  onFilesSelected?: (files: File[]) => void;
}

export function UploadZone({ onFilesSelected }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    onFilesSelected?.(files);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    onFilesSelected?.(files);
  };

  return (
    <div
      className={`
        border-2 border-dashed rounded-lg min-h-48 
        flex flex-col items-center justify-center gap-4 p-8
        transition-colors
        ${isDragging ? 'border-primary bg-primary/5' : 'border-border hover-elevate'}
      `}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      data-testid="upload-zone"
    >
      <pre className="ascii-art text-2xl">
{`      ╱╲
     ╱  ╲
    ╱    ╲
   ╱──────╲
  ╱────────╲
 ╱──────────╲
   [UPLOAD]`}
      </pre>

      <div className="text-center space-y-2">
        <p className="font-medium">
          {isDragging ? '&gt; Drop files here_' : '&gt; Drag and drop images here'}
        </p>
        <p className="text-sm text-muted-foreground">or</p>
        <label>
          <input
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            onChange={handleFileInput}
            data-testid="input-file"
          />
          <span className="text-sm text-primary hover:underline cursor-pointer font-medium">
            Browse files
          </span>
        </label>
      </div>

      <p className="text-xs text-muted-foreground">
        Supports: JPG, PNG (Max 20MB per file, up to 100 files)
      </p>
    </div>
  );
}
