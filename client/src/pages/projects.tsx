import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pencil, Trash2, Plus, AlertTriangle } from "lucide-react";
import { CreateProjectDialog } from "@/components/create-project-dialog";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Project } from "@shared/schema";

interface ProjectWithStats extends Project {
  totalImages: number;
  processedImages: number;
  totalDirectories: number;
}

export default function Projects() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<ProjectWithStats | null>(null);
  const [newProjectName, setNewProjectName] = useState("");

  const { data: projects, isLoading } = useQuery<ProjectWithStats[]>({
    queryKey: ["/api/projects"],
  });

  const handleEditClick = (project: ProjectWithStats) => {
    setSelectedProject(project);
    setNewProjectName(project.name);
    setEditDialogOpen(true);
  };

  const handleDeleteClick = (project: ProjectWithStats) => {
    setSelectedProject(project);
    setDeleteDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (selectedProject && newProjectName.trim()) {
      try {
        await apiRequest("PATCH", `/api/projects/${selectedProject.id}`, {
          name: newProjectName.trim(),
        });

        queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
        
        toast({
          title: "Project Renamed",
          description: `Project renamed to "${newProjectName.trim()}"`,
        });

        setEditDialogOpen(false);
        setSelectedProject(null);
      } catch (error: any) {
        toast({
          variant: "destructive",
          title: "Error",
          description: error.message || "Failed to rename project",
        });
      }
    }
  };

  const handleConfirmDelete = async () => {
    if (selectedProject) {
      try {
        await apiRequest("DELETE", `/api/projects/${selectedProject.id}`);

        queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
        
        toast({
          title: "Project Deleted",
          description: `Project "${selectedProject.name}" has been deleted.`,
        });

        setDeleteDialogOpen(false);
        setSelectedProject(null);
      } catch (error: any) {
        toast({
          variant: "destructive",
          title: "Error",
          description: error.message || "Failed to delete project",
        });
      }
    }
  };

  const handleCreateProject = async (data: { name: string; description: string }) => {
    try {
      await apiRequest("POST", "/api/projects", data);

      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      
      toast({
        title: "Project Created",
        description: `Project "${data.name}" has been created successfully.`,
      });
      
      setCreateDialogOpen(false);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to create project",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-6 flex-wrap">
        <div className="flex gap-8">
          <pre className="ascii-art text-xl hidden lg:block">
{`╔═══════╗
║ ╔═══╗ ║
║ ║▓▓▓║ ║
║ ╚═══╝ ║
╚═══════╝`}
          </pre>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">
              <span className="headline-highlight">PROJECT MANAGEMENT</span>
            </h1>
            <p className="text-sm text-muted-foreground mt-2">
              &gt; Manage your OCR projects, rename, or remove them_
            </p>
          </div>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)} data-testid="button-create-project">
          <Plus className="h-4 w-4 mr-2" />
          New Project
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">
          <pre className="ascii-art text-base inline-block">
{`╔═══╗
║▓▒░║
║░▒▓║
╚═══╝`}
          </pre>
          <div className="mt-2">LOADING...</div>
        </div>
      ) : !projects || projects.length === 0 ? (
        <div className="text-center py-12 space-y-4">
          <pre className="ascii-art text-base text-muted-foreground inline-block">
{`╔═══╗
║ ∅ ║
║   ║
╚═══╝`}
          </pre>
          <p className="text-muted-foreground">
            No projects yet. Create one to get started!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => {
            const progress =
              project.totalImages > 0
                ? Math.min((project.processedImages / project.totalImages) * 100, 100)
                : 0;

            return (
              <Card 
                key={project.id} 
                className="p-6 cursor-pointer hover-elevate active-elevate-2" 
                data-testid={`card-project-${project.id}`}
                onClick={() => setLocation(`/project/${project.id}`)}
              >
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <pre className="ascii-art text-base opacity-90 flex-shrink-0">
{`╔═══╗
║▓▓▓║
║▓▓▓║
╚═══╝`}
                    </pre>
                    <div className="flex-1 min-w-0">
                      <h3
                        className="font-semibold text-base break-words"
                        data-testid={`text-project-name-${project.id}`}
                      >
                        {project.name}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1 truncate">
                        {project.totalDirectories}{" "}
                        {project.totalDirectories === 1 ? "directory" : "directories"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 mb-4">
                  <div className="flex items-center justify-between text-sm gap-2">
                    <span className="text-muted-foreground flex-shrink-0">Images</span>
                    <span className="font-medium font-mono truncate">
                      {project.processedImages} / {project.totalImages}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs gap-2">
                      <span className="text-muted-foreground flex-shrink-0">Progress</span>
                      <span className="font-medium font-mono">{Math.round(progress)}%</span>
                    </div>

                    <div className="w-full bg-secondary rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all"
                        style={{ width: `${Math.min(progress, 100)}%` }}
                      />
                    </div>
                  </div>

                  <div className="pt-1 text-xs text-muted-foreground border-t">
                    <div className="flex items-center justify-between">
                      <span>Last updated</span>
                      <span>{new Date(project.updatedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditClick(project);
                    }}
                    data-testid={`button-rename-${project.id}`}
                  >
                    <Pencil className="h-3.5 w-3.5 mr-1.5" />
                    Rename
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteClick(project);
                    }}
                    data-testid={`button-delete-${project.id}`}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                    Delete
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Dialog */}
      <CreateProjectDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onCreateProject={handleCreateProject}
      />

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              <span className="headline-highlight">RENAME PROJECT</span>
            </DialogTitle>
            <DialogDescription>
              Update the project name. The directory structure will be preserved.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="current-name">Current Name</Label>
              <Input
                id="current-name"
                value={selectedProject?.name || ""}
                disabled
                className="bg-muted"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-name">New Name</Label>
              <Input
                id="new-name"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="Enter new project name..."
                data-testid="input-new-project-name"
              />
            </div>

            <div className="rounded border p-3 bg-muted/30 space-y-2">
              <p className="text-sm font-medium">Preview:</p>
              <pre className="text-xs font-mono">
{`├── ${selectedProject?.name || "..."}   →   ├── ${newProjectName || "..."}`}
              </pre>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={!newProjectName.trim() || newProjectName === selectedProject?.name}
              data-testid="button-save-rename"
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <span className="headline-highlight">DELETE PROJECT</span>
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3 pt-2">
              <p>
                Are you absolutely sure you want to delete "
                <strong className="text-foreground">{selectedProject?.name}</strong>"?
              </p>
              <div className="rounded border border-destructive/30 bg-destructive/5 p-3 space-y-2">
                <p className="text-sm font-medium text-destructive">
                  This action cannot be undone. This will permanently delete:
                </p>
                <ul className="text-sm space-y-1 ml-4 list-disc text-muted-foreground">
                  <li>{selectedProject?.totalImages || 0} scanned images</li>
                  <li>{selectedProject?.totalDirectories || 0} subdirectories</li>
                  <li>All OCR results and metadata</li>
                </ul>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover-elevate active-elevate-2"
              data-testid="button-confirm-delete"
            >
              Delete Project
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
