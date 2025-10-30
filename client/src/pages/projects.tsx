import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { FolderOpen, Pencil, Trash2, Plus, AlertTriangle } from "lucide-react";
import { CreateProjectDialog } from "@/components/create-project-dialog";

interface Project {
  id: string;
  name: string;
  totalImages: number;
  processedImages: number;
  subdirectoryCount: number;
  lastUpdated: string;
}

export default function Projects() {
  const [projects, setProjects] = useState<Project[]>([
    {
      id: "1",
      name: "Historical Documents",
      totalImages: 450,
      processedImages: 320,
      subdirectoryCount: 12,
      lastUpdated: "2 hours ago",
    },
    {
      id: "2",
      name: "Legal Archives",
      totalImages: 890,
      processedImages: 890,
      subdirectoryCount: 8,
      lastUpdated: "1 day ago",
    },
    {
      id: "3",
      name: "Medical Records",
      totalImages: 1250,
      processedImages: 425,
      subdirectoryCount: 15,
      lastUpdated: "3 hours ago",
    },
  ]);

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [newProjectName, setNewProjectName] = useState("");

  const handleEditClick = (project: Project) => {
    setSelectedProject(project);
    setNewProjectName(project.name);
    setEditDialogOpen(true);
  };

  const handleDeleteClick = (project: Project) => {
    setSelectedProject(project);
    setDeleteDialogOpen(true);
  };

  const handleSaveEdit = () => {
    if (selectedProject && newProjectName.trim()) {
      setProjects(
        projects.map((p) =>
          p.id === selectedProject.id ? { ...p, name: newProjectName.trim() } : p
        )
      );
      console.log("Renamed project:", selectedProject.id, "to:", newProjectName);
      setEditDialogOpen(false);
      setSelectedProject(null);
    }
  };

  const handleConfirmDelete = () => {
    if (selectedProject) {
      setProjects(projects.filter((p) => p.id !== selectedProject.id));
      console.log("Deleted project:", selectedProject.id);
      setDeleteDialogOpen(false);
      setSelectedProject(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-6 flex-wrap">
        <div className="flex gap-8">
          <pre className="ascii-art text-xl hidden lg:block">
{`╔════════════════╗
║  ████████████  ║
║  ════════════  ║
║  ░░░░░░░░░░░░  ║
║  ▓▓▓▓▓▓▓▓▓▓▓▓  ║
╚════════════════╝
  [PROJECTS]`}
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map((project) => {
          const progress =
            project.totalImages > 0
              ? (project.processedImages / project.totalImages) * 100
              : 0;

          return (
            <Card key={project.id} className="p-6" data-testid={`card-project-${project.id}`}>
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex items-start gap-3 flex-1">
                  <pre className="ascii-art text-base opacity-90">
{`┌───────┐
│  ▓▓▓  │
│  ▓▓▓  │
└───────┘`}
                  </pre>
                  <div className="flex-1 min-w-0">
                    <h3
                      className="font-semibold text-base truncate"
                      data-testid={`text-project-name-${project.id}`}
                    >
                      {project.name}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {project.subdirectoryCount}{" "}
                      {project.subdirectoryCount === 1 ? "directory" : "directories"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3 mb-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Images</span>
                  <span className="font-medium">
                    {project.processedImages} / {project.totalImages}
                  </span>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-medium">{Math.round(progress)}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                <div className="text-xs text-muted-foreground">
                  Updated {project.lastUpdated}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-3 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => handleEditClick(project)}
                  data-testid={`button-edit-project-${project.id}`}
                >
                  <Pencil className="h-3.5 w-3.5 mr-1.5" />
                  Rename
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => handleDeleteClick(project)}
                  data-testid={`button-delete-project-${project.id}`}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                  Delete
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      {projects.length === 0 && (
        <Card className="p-12 text-center">
          <pre className="ascii-art text-2xl opacity-50 mb-4">
{`╔════════════╗
║            ║
║   EMPTY    ║
║            ║
╚════════════╝`}
          </pre>
          <p className="text-muted-foreground mb-4">
            &gt; No projects found. Create your first project to get started_
          </p>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Project
          </Button>
        </Card>
      )}

      {/* Edit Project Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5 text-primary" />
              <span className="headline-highlight">RENAME PROJECT</span>
            </DialogTitle>
            <DialogDescription>
              &gt; Update the project name_
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="current-project-name" className="text-sm">
                Current Name
              </Label>
              <Input
                id="current-project-name"
                value={selectedProject?.name || ""}
                disabled
                className="font-mono text-muted-foreground"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-project-name" className="text-sm">
                New Name
              </Label>
              <Input
                id="new-project-name"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="Enter new project name"
                className="font-mono"
                data-testid="input-new-project-name"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleSaveEdit();
                  }
                }}
              />
            </div>

            <pre className="ascii-art text-xs opacity-60 bg-muted p-3 rounded-md">
{`┌─ Projects
│  ├── ${selectedProject?.name || "..."}  →  ${newProjectName || "..."}
│  └── ...`}
            </pre>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
              data-testid="button-cancel-edit"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={!newProjectName.trim() || newProjectName === selectedProject?.name}
              data-testid="button-save-project-name"
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Project Alert Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <span className="headline-highlight bg-destructive text-destructive-foreground">
                DELETE PROJECT
              </span>
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                &gt; WARNING: This action cannot be undone_
              </p>
              <p>
                Are you sure you want to delete the project{" "}
                <span className="font-semibold text-foreground">
                  "{selectedProject?.name}"
                </span>
                ?
              </p>
              <p className="text-destructive">
                This will permanently delete:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>{selectedProject?.totalImages || 0} scanned images</li>
                <li>{selectedProject?.subdirectoryCount || 0} subdirectories</li>
                <li>All OCR extraction results</li>
                <li>All associated metadata</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Project
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create Project Dialog */}
      <CreateProjectDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onCreateProject={(data) => {
          console.log("New project:", data);
          setCreateDialogOpen(false);
        }}
      />
    </div>
  );
}
