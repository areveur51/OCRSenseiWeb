import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Upload, CheckCircle, XCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function PublicUpload() {
  const params = useParams();
  const uploadToken = params.token;
  const { toast } = useToast();
  
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [uploadedCount, setUploadedCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: directoryInfo, isLoading, error } = useQuery<{
    directoryName: string;
    projectName: string;
    path: string;
  }>({
    queryKey: [`/api/upload/${uploadToken}/info`],
    enabled: !!uploadToken,
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setSelectedFiles(prev => [...prev, ...newFiles]);
    }
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0 || !uploadToken) return;

    setUploading(true);
    try {
      const formData = new FormData();
      selectedFiles.forEach(file => {
        formData.append("images", file);
      });

      // Use fetch directly for file uploads to properly handle multipart/form-data
      const res = await fetch(`/api/upload/${uploadToken}`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Upload failed");
      }

      const response = await res.json() as { count: number; message: string; success: boolean };

      setUploadedCount(response.count || selectedFiles.length);
      setUploadComplete(true);
      setSelectedFiles([]);
      
      toast({
        title: "Upload Successful",
        description: response.message || `${response.count} file(s) uploaded successfully`,
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Upload Failed",
        description: error.message || "Failed to upload files",
      });
    } finally {
      setUploading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <pre className="ascii-art text-base inline-block">
{`╔═══╗
║▓▒░║
║░▒▓║
╚═══╝`}
          </pre>
          <p className="text-muted-foreground animate-pulse">
            Loading upload page...
          </p>
        </div>
      </div>
    );
  }

  if (error || !directoryInfo) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-6">
          <pre className="ascii-art text-base text-destructive inline-block">
{`╔═══╗
║ ✗ ║
║   ║
╚═══╝`}
          </pre>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold">Invalid Upload Link</h1>
            <p className="text-muted-foreground">
              This upload link is not valid or has been removed.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 sm:p-8">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <pre className="ascii-art text-lg inline-block">
{`╔═══════════════════════════════════════╗
║  [TERMINAL] Upload Files_             ║
╚═══════════════════════════════════════╝`}
          </pre>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold terminal-text">OCRSenseiWeb</h1>
            <p className="text-lg text-muted-foreground">
              Upload files to <span className="text-primary font-mono">{directoryInfo.directoryName}</span>
            </p>
            <p className="text-sm text-muted-foreground">
              Project: {directoryInfo.projectName} / {directoryInfo.path}
            </p>
          </div>
        </div>

        {/* Upload Complete State */}
        {uploadComplete && (
          <div className="border border-border rounded-md p-8 text-center space-y-4 bg-card">
            <CheckCircle className="h-16 w-16 text-primary mx-auto" />
            <div className="space-y-2">
              <h2 className="text-2xl font-bold">Upload Complete!</h2>
              <p className="text-muted-foreground">
                Successfully uploaded {uploadedCount} file{uploadedCount !== 1 ? 's' : ''}
              </p>
            </div>
            <Button
              onClick={() => {
                setUploadComplete(false);
                setUploadedCount(0);
              }}
              data-testid="button-upload-more"
            >
              Upload More Files
            </Button>
          </div>
        )}

        {/* Upload Form */}
        {!uploadComplete && (
          <div className="border border-border rounded-md p-6 space-y-6 bg-card">
            <div className="space-y-4">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".png,.jpg,.jpeg"
                onChange={handleFileSelect}
                className="hidden"
                data-testid="input-file"
              />
              
              {selectedFiles.length === 0 ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-border rounded-md p-12 text-center cursor-pointer hover-elevate active-elevate-2 transition-colors"
                  data-testid="upload-zone"
                >
                  <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-lg mb-2">Click to select files</p>
                  <p className="text-sm text-muted-foreground">
                    PNG and JPG files only • Max 20MB per file • Up to 100 files
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">
                      Selected Files ({selectedFiles.length})
                    </h3>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      data-testid="button-add-more"
                    >
                      Add More
                    </Button>
                  </div>
                  
                  <div className="max-h-64 overflow-y-auto space-y-2 border border-border rounded-md p-4">
                    {selectedFiles.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2 rounded hover-elevate"
                        data-testid={`file-item-${index}`}
                      >
                        <span className="text-sm font-mono truncate flex-1 mr-4">
                          {file.name}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            {(file.size / 1024 / 1024).toFixed(2)} MB
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveFile(index)}
                            data-testid={`button-remove-${index}`}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setSelectedFiles([])}
                      className="flex-1"
                      data-testid="button-clear-all"
                    >
                      Clear All
                    </Button>
                    <Button
                      onClick={handleUpload}
                      disabled={uploading || selectedFiles.length === 0}
                      className="flex-1"
                      data-testid="button-upload"
                    >
                      {uploading ? (
                        <>
                          <span className="animate-pulse">Uploading...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4 mr-2" />
                          Upload {selectedFiles.length} File{selectedFiles.length !== 1 ? 's' : ''}
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Info */}
        <div className="text-center text-sm text-muted-foreground">
          <p>Files will be queued for OCR processing after upload</p>
        </div>
      </div>
    </div>
  );
}
