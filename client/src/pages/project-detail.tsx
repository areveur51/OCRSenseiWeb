import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { BreadcrumbNav } from "@/components/breadcrumb-nav";
import { Button } from "@/components/ui/button";
import { ImageCard } from "@/components/image-card";
import { UploadZone } from "@/components/upload-zone";
import { Upload, Play, Plus, MoreVertical, Edit, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Project, Directory, Image } from "@shared/schema";

interface ProjectWithStats extends Project {
  totalImages: number;
  processedImages: number;
  totalDirectories: number;
}

interface ImageWithOcr extends Image {
  ocrResult?: any;
  processingStatus: string;
}

export default function ProjectDetail() {
  const params = useParams();
  const projectId = params.id ? parseInt(params.id) : null;
  const directoryParam = params.subdir || "root";
  
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [createDirDialogOpen, setCreateDirDialogOpen] = useState(false);
  const [renameDirDialogOpen, setRenameDirDialogOpen] = useState(false);
  const [deleteDirDialogOpen, setDeleteDirDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [newDirName, setNewDirName] = useState("");
  const [renameDirValue, setRenameDirValue] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: project } = useQuery<ProjectWithStats>({
    queryKey: [`/api/projects/${projectId}`],
    enabled: !!projectId,
  });

  const { data: directories } = useQuery<Directory[]>({
    queryKey: [`/api/projects/${projectId}/directories`],
    enabled: !!projectId,
  });

  const currentDirectory = directories?.find(d => d.name === directoryParam) || directories?.[0];

  const { data: images, isLoading: imagesLoading } = useQuery<ImageWithOcr[]>({
    queryKey: [`/api/directories/${currentDirectory?.id}/images`],
    enabled: !!currentDirectory?.id,
  });

  const handleFileUpload = async (files: FileList | File[]) => {
    // If no directory exists, create a default one first
    if (!currentDirectory) {
      if (!projectId) {
        toast({
          variant: "destructive",
          title: "Upload Failed",
          description: "No project selected",
        });
        return;
      }

      try {
        // Create a default "root" directory
        const response = await apiRequest("POST", "/api/directories", {
          projectId,
          name: "root",
          path: "/root",
          parentId: null,
        });
        const newDir = await response.json() as Directory;

        // Invalidate directories to refresh the list
        await queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/directories`] });

        // Wait a moment for the query to refresh
        await new Promise(resolve => setTimeout(resolve, 500));

        // Now proceed with upload using the new directory
        const formData = new FormData();
        Array.from(files).forEach((file) => {
          formData.append("images", file);
        });

        setUploading(true);
        await fetch(`/api/directories/${newDir.id}/upload`, {
          method: "POST",
          body: formData,
          credentials: "include",
        });

        queryClient.invalidateQueries({ queryKey: [`/api/directories/${newDir.id}/images`] });
        
        toast({
          title: "Upload Successful",
          description: `Created directory and uploaded ${files.length} image(s).`,
        });
        
        setUploadDialogOpen(false);
      } catch (error: any) {
        toast({
          variant: "destructive",
          title: "Upload Failed",
          description: error.message || "Failed to create directory or upload images",
        });
      } finally {
        setUploading(false);
      }
      return;
    }

    setUploading(true);
    const formData = new FormData();
    
    Array.from(files).forEach((file) => {
      formData.append("images", file);
    });

    try {
      await fetch(`/api/directories/${currentDirectory.id}/upload`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      queryClient.invalidateQueries({ queryKey: [`/api/directories/${currentDirectory.id}/images`] });
      
      toast({
        title: "Upload Successful",
        description: `${files.length} image(s) uploaded and queued for processing.`,
      });
      
      setUploadDialogOpen(false);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Upload Failed",
        description: error.message || "Failed to upload images",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleCreateDirectory = async () => {
    if (!projectId || !newDirName.trim()) return;

    try {
      await apiRequest("POST", "/api/directories", {
        projectId,
        name: newDirName.trim(),
        path: `/${newDirName.trim()}`,
        parentId: null,
      });

      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/directories`] });
      
      toast({
        title: "Directory Created",
        description: `Directory "${newDirName.trim()}" has been created.`,
      });
      
      setCreateDirDialogOpen(false);
      setNewDirName("");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Creation Failed",
        description: error.message || "Failed to create directory",
      });
    }
  };

  const handleProcessPending = async () => {
    if (!images) return;

    const pendingImages = images.filter(img => img.processingStatus === "not_queued");
    
    try {
      await Promise.all(
        pendingImages.map(img =>
          apiRequest("POST", `/api/images/${img.id}/process`)
        )
      );

      queryClient.invalidateQueries({ queryKey: [`/api/directories/${currentDirectory?.id}/images`] });
      
      toast({
        title: "Processing Started",
        description: `${pendingImages.length} image(s) queued for OCR processing.`,
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Processing Failed",
        description: error.message || "Failed to queue images for processing",
      });
    }
  };

  const handleRenameDirectory = async () => {
    if (!currentDirectory || !renameDirValue.trim() || currentDirectory.name === "root") return;

    try {
      const response = await apiRequest("PATCH", `/api/directories/${currentDirectory.id}`, {
        name: renameDirValue.trim(),
        path: `/${renameDirValue.trim()}`,
      });
      await response.json();

      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/directories`] });
      
      toast({
        title: "Directory Renamed",
        description: `Directory renamed to "${renameDirValue.trim()}".`,
      });
      
      setRenameDirDialogOpen(false);
      setRenameDirValue("");
      setLocation(`/project/${projectId}/${renameDirValue.trim()}`);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Rename Failed",
        description: error.message || "Failed to rename directory",
      });
    }
  };

  const handleDeleteDirectory = async () => {
    if (!currentDirectory || currentDirectory.name === "root") return;

    try {
      await apiRequest("DELETE", `/api/directories/${currentDirectory.id}`);

      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/directories`] });
      
      toast({
        title: "Directory Deleted",
        description: `Directory "${currentDirectory.name}" and its contents have been deleted.`,
      });
      
      setDeleteDirDialogOpen(false);
      setLocation(`/project/${projectId}/root`);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Delete Failed",
        description: error.message || "Failed to delete directory",
      });
    }
  };

  const completedCount = images?.filter(img => img.processingStatus === "completed").length || 0;
  const processingCount = images?.filter(img => img.processingStatus === "processing").length || 0;
  const pendingCount = images?.filter(img => img.processingStatus === "pending").length || 0;

  return (
    <div className="space-y-6">
      <BreadcrumbNav
        items={[
          { label: "Dashboard", href: "/" },
          { label: project?.name || "Project", href: `/project/${projectId}/root` },
          ...(currentDirectory && currentDirectory.name !== "root" 
            ? [{ label: currentDirectory.name }] 
            : []
          ),
        ]}
        onNavigate={(href) => setLocation(href)}
      />

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex gap-8">
          <pre className="ascii-art text-xl hidden md:block">
{`╔═══════════════╗
║  ███████████  ║
║  ███████████  ║
║  ███████████  ║
║  ███████████  ║
╚═══════════════╝
   [FOLDER]`}
          </pre>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-semibold tracking-tight">
                <span className="headline-highlight">
                  {project?.name} {currentDirectory && currentDirectory.name !== "root" ? ` / ${currentDirectory.name}` : ""}
                </span>
              </h1>
              {currentDirectory && currentDirectory.name !== "root" && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" data-testid="button-directory-menu">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => {
                      setRenameDirValue(currentDirectory.name);
                      setRenameDirDialogOpen(true);
                    }} data-testid="menu-item-rename-directory">
                      <Edit className="h-4 w-4 mr-2" />
                      Rename Directory
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => setDeleteDirDialogOpen(true)}
                      className="text-destructive"
                      data-testid="menu-item-delete-directory"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Directory
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              &gt; {images?.length || 0} images • {completedCount} completed • {processingCount} processing • {pendingCount} pending_
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Dialog open={createDirDialogOpen} onOpenChange={setCreateDirDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" data-testid="button-create-directory">
                <Plus className="h-4 w-4 mr-2" />
                New Directory
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Directory</DialogTitle>
                <DialogDescription>
                  Create a new subdirectory for organizing images
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="dir-name">Directory Name</Label>
                  <Input
                    id="dir-name"
                    value={newDirName}
                    onChange={(e) => setNewDirName(e.target.value)}
                    placeholder="e.g., 1920s, Legal Docs, etc."
                    data-testid="input-directory-name"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateDirDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateDirectory} disabled={!newDirName.trim()}>
                  Create
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" data-testid="button-upload">
                <Upload className="h-4 w-4 mr-2" />
                Upload
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Upload Images</DialogTitle>
                <DialogDescription>
                  Upload scanned images for OCR processing (max 17MB per file)
                </DialogDescription>
              </DialogHeader>
              {uploading ? (
                <div className="text-center py-12 text-muted-foreground">
                  <div className="ascii-art">UPLOADING...</div>
                </div>
              ) : (
                <UploadZone
                  onFilesSelected={handleFileUpload}
                />
              )}
            </DialogContent>
          </Dialog>

          <Button onClick={handleProcessPending} data-testid="button-process">
            <Play className="h-4 w-4 mr-2" />
            Process Pending
          </Button>
        </div>
      </div>

      {imagesLoading ? (
        <div className="text-center py-12 space-y-4">
          <pre className="ascii-art text-sm inline-block">
{`╔══════════════╗
║  ▓▒░░░░░▒▓  ║
║ ▓▒░LOAD░▒▓ ║
║  ▓▒░ING░▒▓  ║
║  ▓▒░░░░░▒▓  ║
╚══════════════╝`}
          </pre>
          <p className="text-muted-foreground animate-pulse">
            Loading images...
          </p>
        </div>
      ) : !images || images.length === 0 ? (
        <div className="text-center py-12 space-y-4">
          <pre className="ascii-art text-sm text-muted-foreground inline-block">
{`╔════════════╗
║    ∅∅∅∅    ║
║  NO DATA   ║
╚════════════╝`}
          </pre>
          <p className="text-muted-foreground">
            No images yet. Upload some to get started!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {images.map((image) => {
            let status: "completed" | "processing" | "pending" | "error" = "pending";
            if (image.processingStatus === "completed") status = "completed";
            else if (image.processingStatus === "processing") status = "processing";
            else if (image.processingStatus === "failed") status = "error";

            const confidence = image.ocrResult?.pytesseractConfidence || image.ocrResult?.easyocrConfidence;

            return (
              <ImageCard
                key={image.id}
                filename={image.originalFilename}
                status={status}
                confidence={confidence}
                thumbnailUrl={`/api/images/${image.id}/file`}
                onClick={() => setLocation(`/image/${image.id}`)}
              />
            );
          })}
        </div>
      )}

      <Dialog open={renameDirDialogOpen} onOpenChange={setRenameDirDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Directory</DialogTitle>
            <DialogDescription>
              Enter a new name for this directory
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="rename-dir-name">Directory Name</Label>
              <Input
                id="rename-dir-name"
                value={renameDirValue}
                onChange={(e) => setRenameDirValue(e.target.value)}
                placeholder="Enter new name"
                data-testid="input-rename-directory"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameDirDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRenameDirectory} disabled={!renameDirValue.trim()} data-testid="button-confirm-rename">
              Rename
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDirDialogOpen} onOpenChange={setDeleteDirDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Directory?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the directory "{currentDirectory?.name}" and all its images and OCR results. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteDirectory} className="bg-destructive hover:bg-destructive/90" data-testid="button-confirm-delete">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
