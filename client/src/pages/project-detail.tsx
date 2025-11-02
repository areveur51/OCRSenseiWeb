import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { BreadcrumbNav } from "@/components/breadcrumb-nav";
import { Button } from "@/components/ui/button";
import { ImageCard } from "@/components/image-card";
import { UploadZone } from "@/components/upload-zone";
import { Upload, Play, Plus, MoreVertical, Edit, Trash2, ChevronLeft, ChevronRight, RotateCcw, Link2 } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  const projectSlug = params.projectSlug;
  const dirSlug = params.dirSlug;
  
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [createDirDialogOpen, setCreateDirDialogOpen] = useState(false);
  const [renameDirDialogOpen, setRenameDirDialogOpen] = useState(false);
  const [deleteDirDialogOpen, setDeleteDirDialogOpen] = useState(false);
  const [renameProjectDialogOpen, setRenameProjectDialogOpen] = useState(false);
  const [deleteProjectDialogOpen, setDeleteProjectDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [newDirName, setNewDirName] = useState("");
  const [newDirParentId, setNewDirParentId] = useState<number | null>(null);
  const [renameDirValue, setRenameDirValue] = useState("");
  const [renameProjectValue, setRenameProjectValue] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: project } = useQuery<ProjectWithStats>({
    queryKey: [`/api/p/${projectSlug}`],
    enabled: !!projectSlug,
  });

  const { data: directories } = useQuery<Directory[]>({
    queryKey: [`/api/p/${projectSlug}/directories`],
    enabled: !!projectSlug,
  });

  // Find current directory by slug, or use root directory (parentId is null)
  const currentDirectory = dirSlug 
    ? directories?.find(d => d.slug === dirSlug)
    : directories?.find(d => d.parentId === null);
  
  // Helper function to build directory path hierarchy for breadcrumbs
  const getDirectoryPath = (dir: Directory | undefined): Directory[] => {
    if (!dir || !directories) return [];
    const path: Directory[] = [dir];
    let current = dir;
    while (current.parentId) {
      const parent = directories.find(d => d.id === current.parentId);
      if (!parent) break;
      path.unshift(parent);
      current = parent;
    }
    return path;
  };
  
  const directoryPath = getDirectoryPath(currentDirectory);

  // Reset pagination when directory changes
  useEffect(() => {
    setCurrentPage(1);
  }, [currentDirectory?.id]);

  interface PaginatedImagesResponse {
    images: ImageWithOcr[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }

  const { data: imagesData, isLoading: imagesLoading } = useQuery<PaginatedImagesResponse>({
    queryKey: [`/api/directories/${currentDirectory?.id}/images`, currentPage, pageSize],
    queryFn: async () => {
      const response = await fetch(
        `/api/directories/${currentDirectory?.id}/images?page=${currentPage}&limit=${pageSize}`,
        { credentials: 'include' }
      );
      if (!response.ok) throw new Error('Failed to fetch images');
      return response.json();
    },
    enabled: !!currentDirectory?.id,
  });

  const images = imagesData?.images;
  const pagination = imagesData?.pagination;

  const handleFilesSelected = async (files: File[]) => {
    setSelectedFiles(files);
    
    // Check for duplicates if we have a current directory
    if (currentDirectory?.id) {
      try {
        const existingImagesResponse = await fetch(
          `/api/directories/${currentDirectory.id}/images?page=1&limit=10000`,
          { credentials: 'include' }
        );
        
        if (existingImagesResponse.ok) {
          const existingImagesData = await existingImagesResponse.json();
          const existingFilenames = new Set(
            existingImagesData.images.map((img: any) => img.originalFilename.toLowerCase())
          );
          
          // Check which files are duplicates
          const duplicateCount = files.filter(f => 
            existingFilenames.has(f.name.toLowerCase())
          ).length;
          
          if (duplicateCount > 0) {
            toast({
              title: "Duplicate Files Detected",
              description: `${duplicateCount} file(s) already exist and will be skipped.`,
            });
          }
        }
      } catch (error) {
        // Silently fail - user will see duplicates during upload
        console.error('Failed to check for duplicates:', error);
      }
    }
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleClearFiles = () => {
    setSelectedFiles([]);
  };

  const handleFileUpload = async (files: FileList | File[]) => {
    // If no directory exists, create a default one first
    if (!currentDirectory) {
      if (!project?.id) {
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
          projectId: project.id,
          name: "root",
          path: "/root",
          parentId: null,
        });
        const newDir = await response.json() as Directory;

        // Invalidate directories to refresh the list
        await queryClient.invalidateQueries({ queryKey: [`/api/p/${projectSlug}/directories`] });

        // Wait a moment for the query to refresh
        await new Promise(resolve => setTimeout(resolve, 500));

        // For new directory, no duplicates to check - upload all files
        const formData = new FormData();
        Array.from(files).forEach((file) => {
          formData.append("images", file);
        });

        setUploading(true);
        const uploadResponse = await fetch(`/api/directories/${newDir.id}/upload`, {
          method: "POST",
          body: formData,
          credentials: "include",
        });

        if (!uploadResponse.ok) {
          throw new Error(`Upload failed: ${uploadResponse.statusText}`);
        }

        const uploadedImages = await uploadResponse.json();
        const imageCount = uploadedImages.length;

        // Invalidate all relevant caches
        queryClient.invalidateQueries({ queryKey: [`/api/directories/${newDir.id}/images`] });
        queryClient.invalidateQueries({ queryKey: [`/api/p/${projectSlug}/directories`] });
        queryClient.invalidateQueries({ queryKey: [`/api/p/${projectSlug}`] });
        queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
        
        toast({
          title: "Upload Successful",
          description: `Created directory and uploaded ${imageCount} image(s).`,
        });
        
        setSelectedFiles([]);
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

    try {
      // Fetch all existing images in the directory to check for duplicates
      const existingImagesResponse = await fetch(
        `/api/directories/${currentDirectory.id}/images?page=1&limit=10000`,
        { credentials: 'include' }
      );
      
      if (!existingImagesResponse.ok) {
        throw new Error('Failed to fetch existing images');
      }
      
      const existingImagesData = await existingImagesResponse.json();
      const existingFilenames = new Set(
        existingImagesData.images.map((img: any) => img.originalFilename.toLowerCase())
      );

      // Filter out files that already exist
      const filesToUpload: File[] = [];
      const skippedFiles: File[] = [];
      
      Array.from(files).forEach((file) => {
        if (existingFilenames.has(file.name.toLowerCase())) {
          skippedFiles.push(file);
        } else {
          filesToUpload.push(file);
        }
      });

      // If all files are duplicates, show message and return
      if (filesToUpload.length === 0) {
        toast({
          title: "No New Files",
          description: `All ${files.length} file(s) already exist in this directory.`,
        });
        setSelectedFiles([]);
        setUploadDialogOpen(false);
        setUploading(false);
        return;
      }

      // Upload only unique files
      const formData = new FormData();
      filesToUpload.forEach((file) => {
        formData.append("images", file);
      });

      const response = await fetch(`/api/directories/${currentDirectory.id}/upload`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const uploadedImages = await response.json();
      const imageCount = uploadedImages.length;

      // Invalidate all relevant caches
      queryClient.invalidateQueries({ queryKey: [`/api/directories/${currentDirectory.id}/images`] });
      queryClient.invalidateQueries({ queryKey: [`/api/p/${projectSlug}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      
      // Show detailed feedback about upload results
      const skippedCount = skippedFiles.length;
      let description = `${imageCount} image(s) uploaded and queued for processing.`;
      
      if (skippedCount > 0) {
        description += ` ${skippedCount} duplicate(s) skipped.`;
      }

      toast({
        title: "Upload Complete",
        description,
      });
      
      setSelectedFiles([]);
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
    if (!project?.id || !newDirName.trim()) return;

    try {
      // Find the selected parent directory to build the path
      const parentDir = newDirParentId ? directories?.find(d => d.id === newDirParentId) : null;
      
      // Check for duplicate names at the same level
      const duplicateAtSameLevel = directories?.find(
        d => d.name.toLowerCase() === newDirName.trim().toLowerCase() && 
             d.parentId === newDirParentId
      );
      
      if (duplicateAtSameLevel) {
        const parentName = parentDir ? parentDir.name : "root level";
        toast({
          variant: "destructive",
          title: "Duplicate Name",
          description: `A directory named "${newDirName.trim()}" already exists at ${parentName}`,
        });
        return;
      }
      
      const parentPath = parentDir ? parentDir.path : "";
      const newPath = `${parentPath}/${newDirName.trim()}`;
      
      await apiRequest("POST", "/api/directories", {
        projectId: project.id,
        name: newDirName.trim(),
        path: newPath,
        parentId: newDirParentId,
      });

      queryClient.invalidateQueries({ queryKey: [`/api/p/${projectSlug}/directories`] });
      
      const parentName = parentDir ? parentDir.name : "root";
      toast({
        title: "Directory Created",
        description: `Directory "${newDirName.trim()}" has been created in "${parentName}".`,
      });
      
      setCreateDirDialogOpen(false);
      setNewDirName("");
      setNewDirParentId(null);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Creation Failed",
        description: error.message || "Failed to create directory",
      });
    }
  };

  const handleProcessPending = async () => {
    if (!images || !Array.isArray(images)) return;

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

  const handleReprocessErrors = async () => {
    if (!currentDirectory) return;

    try {
      const response = await apiRequest("POST", `/api/directories/${currentDirectory.id}/reprocess-errors`) as { count: number; message: string; success: boolean };
      
      queryClient.invalidateQueries({ queryKey: [`/api/directories/${currentDirectory?.id}/images`] });
      
      toast({
        title: response.count === 0 ? "No Errors Found" : "Reprocessing Started",
        description: response.message,
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Reprocess Failed",
        description: error.message || "Failed to reprocess errors",
      });
    }
  };

  const handleCopyUploadLink = async () => {
    if (!currentDirectory) return;

    try {
      const res = await apiRequest("GET", `/api/directories/${currentDirectory.id}/upload-link`);
      const data = await res.json() as { uploadToken: string; uploadUrl: string };
      
      await navigator.clipboard.writeText(data.uploadUrl);
      
      toast({
        title: "Upload Link Copied",
        description: "Anyone with this link can upload files to this directory",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Failed to Copy Link",
        description: error.message || "Failed to generate upload link",
      });
    }
  };

  const handleRenameDirectory = async () => {
    if (!currentDirectory || !renameDirValue.trim()) return;
    // Don't allow renaming root directories (those with no parent)
    if (!currentDirectory.parentId) {
      toast({
        variant: "destructive",
        title: "Cannot Rename",
        description: "Root directories cannot be renamed.",
      });
      return;
    }

    try {
      // Check for duplicate names at the same level (excluding current directory)
      const duplicateAtSameLevel = directories?.find(
        d => d.id !== currentDirectory.id && 
             d.name.toLowerCase() === renameDirValue.trim().toLowerCase() && 
             d.parentId === currentDirectory.parentId
      );
      
      if (duplicateAtSameLevel) {
        const parentDir = directories?.find(d => d.id === currentDirectory.parentId);
        const parentName = parentDir ? parentDir.name : "root level";
        toast({
          variant: "destructive",
          title: "Duplicate Name",
          description: `A directory named "${renameDirValue.trim()}" already exists at ${parentName}`,
        });
        return;
      }
      
      // Build new path based on parent
      const parentDir = directories?.find(d => d.id === currentDirectory.parentId);
      const parentPath = parentDir ? parentDir.path : "";
      const newPath = `${parentPath}/${renameDirValue.trim()}`;
      
      const response = await apiRequest("PATCH", `/api/directories/${currentDirectory.id}`, {
        name: renameDirValue.trim(),
        path: newPath,
      });
      await response.json();

      queryClient.invalidateQueries({ queryKey: [`/api/p/${projectSlug}/directories`] });
      
      toast({
        title: "Directory Renamed",
        description: `Directory renamed to "${renameDirValue.trim()}".`,
      });
      
      setRenameDirDialogOpen(false);
      setRenameDirValue("");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Rename Failed",
        description: error.message || "Failed to rename directory",
      });
    }
  };

  const handleDeleteDirectory = async () => {
    if (!currentDirectory || !directories) return;
    // Don't allow deleting root directories (those with no parent)
    if (!currentDirectory.parentId) {
      toast({
        variant: "destructive",
        title: "Cannot Delete",
        description: "Root directories cannot be deleted.",
      });
      return;
    }

    try {
      await apiRequest("DELETE", `/api/directories/${currentDirectory.id}`);

      queryClient.invalidateQueries({ queryKey: [`/api/p/${projectSlug}/directories`] });
      
      toast({
        title: "Directory Deleted",
        description: `Directory "${currentDirectory.name}" and its contents have been deleted.`,
      });
      
      setDeleteDirDialogOpen(false);
      // Navigate to parent directory
      const parentDir = directories.find(d => d.id === currentDirectory.parentId);
      if (parentDir && projectSlug) {
        setLocation(`/p/${projectSlug}/${parentDir.slug}`)
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Delete Failed",
        description: error.message || "Failed to delete directory",
      });
    }
  };

  const handleRenameProject = async () => {
    if (!project || !renameProjectValue.trim()) return;

    try {
      const response = await apiRequest("PATCH", `/api/projects/${project.id}`, {
        name: renameProjectValue.trim(),
      });
      const updatedProject = await response.json();

      queryClient.invalidateQueries({ queryKey: [`/api/p/${projectSlug}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      
      toast({
        title: "Project Renamed",
        description: `Project renamed to "${renameProjectValue.trim()}".`,
      });
      
      setRenameProjectDialogOpen(false);
      // Navigate to new slug
      setLocation(`/p/${updatedProject.slug}`);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Rename Failed",
        description: error.message || "Failed to rename project",
      });
    }
  };

  const handleDeleteProject = async () => {
    if (!project) return;

    try {
      await apiRequest("DELETE", `/api/projects/${project.id}`);

      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      
      toast({
        title: "Project Deleted",
        description: `Project "${project.name}" and all its contents have been deleted.`,
      });
      
      setDeleteProjectDialogOpen(false);
      // Navigate to projects page
      setLocation("/projects");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Delete Failed",
        description: error.message || "Failed to delete project",
      });
    }
  };

  const completedCount = images?.filter(img => img.processingStatus === "completed").length || 0;
  const processingCount = images?.filter(img => img.processingStatus === "processing").length || 0;
  const pendingCount = images?.filter(img => img.processingStatus === "pending").length || 0;

  // 17 Bold double-line ASCII art variations for subdirectories
  const folderAsciiVariations = [
    `╔═══════╗
║▓▓▓▓▓▓▓║
║▓▓▓▓▓▓▓║
║▓▓▓▓▓▓▓║
╚═══════╝`,
    `╔═══════╗
║███████║
║███████║
║███████║
╚═══════╝`,
    `╔═══════╗
║▒▒▒▒▒▒▒║
║▒▒▒▒▒▒▒║
║▒▒▒▒▒▒▒║
╚═══════╝`,
    `╔═══════╗
║░░░░░░░║
║███████║
║███████║
╚═══════╝`,
    `╔═══════╗
║▓▓▓░░░░║
║▓▓▓░░░░║
║▓▓▓░░░░║
╚═══════╝`,
    `╔═══════╗
║█▓▒░▒▓█║
║███████║
║███████║
╚═══════╝`,
    `╔═══════╗
║▓▓▓▓▓▓▓║
║▒▒▒▒▒▒▒║
║░░░░░░░║
╚═══════╝`,
    `╔═══════╗
║░▒▓█▓▒░║
║░▒▓█▓▒░║
║░▒▓█▓▒░║
╚═══════╝`,
    `╔═══════╗
║█████░░║
║█████░░║
║█████░░║
╚═══════╝`,
    `╔═══════╗
║▓▓▓▓▓▓▓║
║░░░░░░░║
║▓▓▓▓▓▓▓║
╚═══════╝`,
    `╔═══════╗
║▒▒▒▒▒▒▒║
║▓▓▓▓▓▓▓║
║███████║
╚═══════╝`,
    `╔═══════╗
║█░█░█░█║
║░█░█░█░║
║█░█░█░█║
╚═══════╝`,
    `╔═══════╗
║▓▓▓▓███║
║▓▓▓▓███║
║▓▓▓▓███║
╚═══════╝`,
    `╔═══════╗
║███▓▓▓▓║
║███▓▓▓▓║
║███▓▓▓▓║
╚═══════╝`,
    `╔═══════╗
║▒▒▒███░║
║▒▒▒███░║
║▒▒▒███░║
╚═══════╝`,
    `╔═══════╗
║░░█████║
║░░█████║
║░░█████║
╚═══════╝`,
    `╔═══════╗
║█▒░░▒█▓║
║█▒░░▒█▓║
║█▒░░▒█▓║
╚═══════╝`,
  ];

  // Select ASCII art based on directory ID to ensure consistency
  const folderAscii = currentDirectory 
    ? folderAsciiVariations[currentDirectory.id % folderAsciiVariations.length]
    : folderAsciiVariations[0];

  return (
    <div className="space-y-6">
      <BreadcrumbNav
        items={[
          { label: "Dashboard", href: "/" },
          { label: project?.name || "Project", href: `/p/${project?.slug}` },
          ...directoryPath.map((dir, index) => ({
            label: dir.name,
            href: index < directoryPath.length - 1 ? `/p/${project?.slug}/${dir.slug}` : undefined
          })),
        ]}
        onNavigate={(href) => setLocation(href)}
      />

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex gap-8">
          <pre className="ascii-art text-xl hidden md:block">
{folderAscii}
          </pre>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-semibold tracking-tight">
                <span className="headline-highlight">
                  {project?.name} {directoryPath.length > 0 ? ` / ${directoryPath.map(d => d.name).join(' / ')}` : ""}
                </span>
              </h1>
              {currentDirectory && currentDirectory.parentId ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" data-testid="button-directory-menu">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={handleCopyUploadLink} data-testid="menu-item-copy-upload-link">
                      <Link2 className="h-4 w-4 mr-2" />
                      Copy Upload Link
                    </DropdownMenuItem>
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
              ) : currentDirectory && directoryPath.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" data-testid="button-directory-menu">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={handleCopyUploadLink} data-testid="menu-item-copy-upload-link">
                      <Link2 className="h-4 w-4 mr-2" />
                      Copy Upload Link
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) }
              {directoryPath.length === 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" data-testid="button-project-menu">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => {
                      setRenameProjectValue(project?.name || "");
                      setRenameProjectDialogOpen(true);
                    }} data-testid="menu-item-rename-project">
                      <Edit className="h-4 w-4 mr-2" />
                      Rename Project
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => setDeleteProjectDialogOpen(true)}
                      className="text-destructive"
                      data-testid="menu-item-delete-project"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Project
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
                  Create a new directory for organizing images
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="parent-dir">Parent Folder</Label>
                  <Select 
                    value={newDirParentId === null ? "root" : String(newDirParentId)} 
                    onValueChange={(value) => setNewDirParentId(value === "root" ? null : parseInt(value))}
                  >
                    <SelectTrigger id="parent-dir" data-testid="select-parent-directory">
                      <SelectValue placeholder="Select parent folder" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="root" data-testid="option-root">/ (Root Level)</SelectItem>
                      {directories?.map((dir) => (
                        <SelectItem key={dir.id} value={String(dir.id)} data-testid={`option-dir-${dir.id}`}>
                          {dir.path || dir.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
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
                <Button onClick={handleCreateDirectory} disabled={!newDirName.trim()} data-testid="button-create-directory-confirm">
                  Create
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={uploadDialogOpen} onOpenChange={(open) => {
            setUploadDialogOpen(open);
            if (!open) setSelectedFiles([]);
          }}>
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
                  Upload scanned images for OCR processing (max 20MB per file, up to 100 files)
                </DialogDescription>
              </DialogHeader>
              {uploading ? (
                <div className="text-center py-12 text-muted-foreground">
                  <pre className="ascii-art text-base inline-block">
{`╔═══╗
║↑↑↑║
║▓▒░║
╚═══╝`}
                  </pre>
                  <div className="mt-2">UPLOADING {selectedFiles.length} FILE{selectedFiles.length !== 1 ? 'S' : ''}...</div>
                </div>
              ) : selectedFiles.length > 0 ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">
                      {selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''} selected
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleClearFiles}
                      data-testid="button-clear-files"
                    >
                      Clear all
                    </Button>
                  </div>
                  
                  <div className="max-h-64 overflow-y-auto space-y-2 border rounded-md p-4">
                    {selectedFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between text-sm p-2 rounded hover-elevate">
                        <div className="flex-1 truncate">
                          <span className="font-mono">{file.name}</span>
                          <span className="text-muted-foreground ml-2">
                            ({(file.size / 1024 / 1024).toFixed(2)} MB)
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveFile(index)}
                          data-testid={`button-remove-file-${index}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={() => setSelectedFiles([])}
                      variant="outline"
                      className="flex-1"
                      data-testid="button-select-more"
                    >
                      Select more files
                    </Button>
                    <Button
                      onClick={() => handleFileUpload(selectedFiles)}
                      className="flex-1"
                      data-testid="button-confirm-upload"
                    >
                      Upload {selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''}
                    </Button>
                  </div>
                </div>
              ) : (
                <UploadZone
                  onFilesSelected={handleFilesSelected}
                />
              )}
            </DialogContent>
          </Dialog>

          <Button onClick={handleProcessPending} data-testid="button-process">
            <Play className="h-4 w-4 mr-2" />
            Process Pending
          </Button>

          <Button onClick={handleReprocessErrors} variant="outline" data-testid="button-reprocess-errors">
            <RotateCcw className="h-4 w-4 mr-2" />
            Reprocess Errors
          </Button>
        </div>
      </div>

      {imagesLoading ? (
        <div className="text-center py-12 space-y-4">
          <pre className="ascii-art text-base inline-block">
{`╔═══╗
║▓▒░║
║░▒▓║
╚═══╝`}
          </pre>
          <p className="text-muted-foreground animate-pulse">
            Loading images...
          </p>
        </div>
      ) : !images || images.length === 0 ? (
        <div className="text-center py-12 space-y-4">
          <pre className="ascii-art text-base text-muted-foreground inline-block">
{`╔═══╗
║ ∅ ║
║   ║
╚═══╝`}
          </pre>
          <p className="text-muted-foreground">
            No images yet. Upload some to get started!
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {images.map((image) => {
              let status: "completed" | "processing" | "pending" | "error" = "pending";
              if (image.processingStatus === "completed") status = "completed";
              else if (image.processingStatus === "processing") status = "processing";
              else if (image.processingStatus === "failed") status = "error";

              // Use the highest confidence between Tesseract and EasyOCR
              const tesseractConf = image.ocrResult?.pytesseractConfidence ?? 0;
              const easyocrConf = image.ocrResult?.easyocrConfidence ?? 0;
              const confidence = (tesseractConf > 0 || easyocrConf > 0) 
                ? Math.max(tesseractConf, easyocrConf) 
                : undefined;

              return (
                <ImageCard
                  key={image.id}
                  filename={image.originalFilename}
                  status={status}
                  confidence={confidence}
                  thumbnailUrl={`/api/images/${image.id}/file`}
                  onClick={() => setLocation(`/p/${project?.slug}/${currentDirectory?.slug}/img/${image.slug}`)}
                />
              );
            })}
          </div>

          {pagination && pagination.total > 0 && (
            <div className="mt-8 flex items-center justify-between border-t pt-6">
              <div className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground">
                  Showing {((pagination.page - 1) * pagination.limit) + 1}-{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} images
                </span>
                <Select value={pageSize.toString()} onValueChange={(value) => { setPageSize(parseInt(value)); setCurrentPage(1); }}>
                  <SelectTrigger className="w-32" data-testid="select-page-size">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="25">25 per page</SelectItem>
                    <SelectItem value="50">50 per page</SelectItem>
                    <SelectItem value="100">100 per page</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(page => Math.max(1, page - 1))}
                  disabled={currentPage === 1}
                  data-testid="button-prev-page"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground px-4">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(page => Math.min(pagination.totalPages, page + 1))}
                  disabled={currentPage === pagination.totalPages}
                  data-testid="button-next-page"
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </>
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

      <Dialog open={renameProjectDialogOpen} onOpenChange={setRenameProjectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Project</DialogTitle>
            <DialogDescription>
              Enter a new name for this project
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="rename-project-name">Project Name</Label>
              <Input
                id="rename-project-name"
                value={renameProjectValue}
                onChange={(e) => setRenameProjectValue(e.target.value)}
                placeholder="Enter new name"
                data-testid="input-rename-project"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameProjectDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRenameProject} disabled={!renameProjectValue.trim()} data-testid="button-confirm-rename-project">
              Rename
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteProjectDialogOpen} onOpenChange={setDeleteProjectDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the project "{project?.name}" and all its directories, images, and OCR results. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-project">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteProject} className="bg-destructive hover:bg-destructive/90" data-testid="button-confirm-delete-project">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
