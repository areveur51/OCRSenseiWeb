import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Home, FolderOpen, Search, Settings, ChevronRight, GripVertical, Edit3, Save } from "lucide-react";
import { useState, createContext, useContext } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Project, Directory } from "@shared/schema";

// Drag state context for cross-component communication
type DraggedItem = 
  | { type: 'project'; id: number; data: Project }
  | { type: 'directory'; id: number; data: Directory; projectSlug: string }
  | null;

type DropAction = 'reorder' | 'convert-to-directory' | 'convert-to-project' | 'change-parent';

interface DragContextType {
  draggedItem: DraggedItem;
  setDraggedItem: (item: DraggedItem) => void;
  dropTargetId: number | null;
  setDropTargetId: (id: number | null) => void;
  dropAction: DropAction | null;
  setDropAction: (action: DropAction | null) => void;
}

const DragContext = createContext<DragContextType>({
  draggedItem: null,
  setDraggedItem: () => {},
  dropTargetId: null,
  setDropTargetId: () => {},
  dropAction: null,
  setDropAction: () => {},
});

interface ProjectWithDirectories extends Project {
  directories?: Directory[];
}

export function AppSidebar() {
  const [, setLocation] = useLocation();
  const [expandedProjects, setExpandedProjects] = useState<Set<number>>(new Set());
  const [editMode, setEditMode] = useState(false);
  
  // Enhanced drag state
  const [draggedItem, setDraggedItem] = useState<DraggedItem>(null);
  const [dropTargetId, setDropTargetId] = useState<number | null>(null);
  const [dropAction, setDropAction] = useState<DropAction | null>(null);
  const { toast } = useToast();

  const { data: projects } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const toggleProject = (projectId: number) => {
    const newExpanded = new Set(expandedProjects);
    if (newExpanded.has(projectId)) {
      newExpanded.delete(projectId);
    } else {
      newExpanded.add(projectId);
    }
    setExpandedProjects(newExpanded);
  };

  const handleProjectDragStart = (e: React.DragEvent, project: Project) => {
    setDraggedItem({ type: 'project', id: project.id, data: project });
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleProjectDragOver = (e: React.DragEvent, targetProject: Project) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    if (!draggedItem || !editMode) return;

    // Only handle project-to-project operations
    if (draggedItem.type === 'project') {
      if (draggedItem.id === targetProject.id) return;
      
      // Check if dragging over expanded project's directory area
      const rect = e.currentTarget.getBoundingClientRect();
      const mouseY = e.clientY - rect.top;
      const elementHeight = rect.height;
      
      // More conservative: only trigger convert-to-directory if:
      // 1. Project is expanded
      // 2. Mouse is in bottom 40% of the project row (near the expand chevron)
      if (expandedProjects.has(targetProject.id) && mouseY > elementHeight * 0.6) {
        setDropAction('convert-to-directory');
        setDropTargetId(targetProject.id);
      } else {
        setDropAction('reorder');
        setDropTargetId(targetProject.id);
      }
    }
    // Directories should NOT be droppable on individual projects
  };

  const handleProjectDragLeave = () => {
    setDropTargetId(null);
    setDropAction(null);
  };

  const handleProjectDrop = async (e: React.DragEvent, targetProject: Project) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!draggedItem || !projects || !dropAction) return;

    try {
      if (draggedItem.type === 'project' && dropAction === 'reorder') {
        // Project reordering
        if (draggedItem.id === targetProject.id) return;

        const projectList = [...projects];
        const draggedIndex = projectList.findIndex(p => p.id === draggedItem.id);
        const targetIndex = projectList.findIndex(p => p.id === targetProject.id);
        
        const [movedProject] = projectList.splice(draggedIndex, 1);
        projectList.splice(targetIndex, 0, movedProject);
        
        const updates = projectList.map((project, index) => 
          apiRequest("POST", `/api/projects/${project.id}/reorder`, {
            sortOrder: index + 1,
          })
        );

        await Promise.all(updates);
        queryClient.invalidateQueries({ queryKey: ["/api/projects"] });

        toast({
          title: "Projects Reordered",
          description: "Project order updated successfully",
        });
      } else if (draggedItem.type === 'project' && dropAction === 'convert-to-directory') {
        // Convert project to directory under target project
        await apiRequest("POST", `/api/projects/${draggedItem.id}/convert-to-directory`, {
          targetProjectId: targetProject.id,
        });

        queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
        queryClient.invalidateQueries({ queryKey: [`/api/p/${targetProject.slug}/directories`] });

        toast({
          title: "Project Converted",
          description: `"${draggedItem.data.name}" is now a directory under "${targetProject.name}"`,
        });

        // Expand the target project to show the new directory
        setExpandedProjects(prev => new Set(prev).add(targetProject.id));
      }
      // Note: Directory drops on projects are NOT handled here - they should only drop in project list area
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Operation Failed",
        description: error.message || "Failed to complete operation",
      });
    }

    setDraggedItem(null);
    setDropTargetId(null);
    setDropAction(null);
  };

  // Project list drop zone for directory→project conversion
  const handleProjectListDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    
    if (!draggedItem || draggedItem.type !== 'directory' || !editMode) return;
    
    e.dataTransfer.dropEffect = 'move';
    setDropAction('convert-to-project');
    setDropTargetId(-1); // Special ID for project list
  };

  const handleProjectListDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!draggedItem || draggedItem.type !== 'directory' || dropAction !== 'convert-to-project') return;

    try {
      await apiRequest("POST", `/api/directories/${draggedItem.id}/convert-to-project`, {});

      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      queryClient.invalidateQueries({ queryKey: [`/api/p/${draggedItem.projectSlug}/directories`] });

      toast({
        title: "Directory Promoted",
        description: `"${draggedItem.data.name}" is now a top-level project`,
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Operation Failed",
        description: error.message || "Failed to promote directory to project",
      });
    }

    setDraggedItem(null);
    setDropTargetId(null);
    setDropAction(null);
  };

  const getProjectDropIndicator = (projectId: number) => {
    if (dropTargetId !== projectId || !dropAction) return null;
    
    if (dropAction === 'reorder') {
      return 'bg-primary/20 border-2 border-primary rounded';
    } else if (dropAction === 'convert-to-directory') {
      return 'bg-blue-500/20 border-2 border-blue-500 rounded';
    }
    return null;
  };

  return (
    <DragContext.Provider value={{
      draggedItem,
      setDraggedItem,
      dropTargetId,
      setDropTargetId,
      dropAction,
      setDropAction,
    }}>
      <Sidebar>
        <SidebarHeader className="p-4 border-b">
          <div className="flex items-center gap-3">
            <pre className="ascii-art text-sm">
{`╔═══╗
║OCR║
║███║
╚═══╝`}
            </pre>
            <h2 className="font-semibold text-base">
              <span className="headline-highlight">OCRSenseiWeb</span>
            </h2>
          </div>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>DIRECTORY TREE</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => setLocation("/")}
                    className="hover-elevate active-elevate-2"
                    data-testid="nav-dashboard"
                  >
                    <Home className="h-4 w-4" />
                    <span>Dashboard</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => setLocation("/search")}
                    className="hover-elevate active-elevate-2"
                    data-testid="nav-search"
                  >
                    <Search className="h-4 w-4" />
                    <span>Search</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => setLocation("/projects")}
                    className="hover-elevate active-elevate-2"
                    data-testid="nav-projects"
                  >
                    <FolderOpen className="h-4 w-4" />
                    <span>Projects</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarGroup>
            <div className="flex items-center justify-between px-3 py-2">
              <SidebarGroupLabel>Browse/</SidebarGroupLabel>
              <button
                onClick={() => setEditMode(!editMode)}
                className="text-xs px-2 py-1 rounded hover-elevate active-elevate-2 flex items-center gap-1 font-semibold"
                data-testid="button-toggle-edit-mode"
              >
                {editMode ? (
                  <>
                    <Save className="h-3 w-3" />
                    Done
                  </>
                ) : (
                  <>
                    <Edit3 className="h-3 w-3" />
                    Edit
                  </>
                )}
              </button>
            </div>
            <SidebarGroupContent
              onDragOver={editMode ? handleProjectListDragOver : undefined}
              onDrop={editMode ? handleProjectListDrop : undefined}
              onDragLeave={() => {
                if (dropTargetId === -1) {
                  setDropTargetId(null);
                  setDropAction(null);
                }
              }}
              className={`relative ${dropAction === 'convert-to-project' && dropTargetId === -1 ? 'bg-purple-500/10 border-2 border-purple-500 rounded-md mx-2 p-2' : ''}`}
            >
              {/* Visual indicator for directory→project conversion */}
              {dropAction === 'convert-to-project' && dropTargetId === -1 && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20 bg-purple-500/5 rounded-md">
                  <div className="text-xs font-semibold text-purple-500 bg-background/90 px-2 py-1 rounded border border-purple-500">
                    Drop here to promote to project
                  </div>
                </div>
              )}
              <SidebarMenu>
                {!projects || projects.length === 0 ? (
                  <div className="px-3 py-2 text-xs text-muted-foreground">
                    No projects yet
                  </div>
                ) : (
                  projects.map((project) => {
                    const isDragging = draggedItem?.type === 'project' && draggedItem.id === project.id;
                    const dropIndicator = getProjectDropIndicator(project.id);
                    
                    return (
                      <div key={project.id}>
                        <SidebarMenuItem>
                          <div
                            draggable={editMode}
                            onDragStart={(e) => handleProjectDragStart(e, project)}
                            onDragOver={(e) => handleProjectDragOver(e, project)}
                            onDragLeave={handleProjectDragLeave}
                            onDrop={(e) => handleProjectDrop(e, project)}
                            className={`relative ${isDragging ? 'opacity-50' : ''} ${editMode ? 'cursor-move' : ''} ${dropIndicator || ''}`}
                          >
                            {/* Visual hint for project→directory conversion */}
                            {dropAction === 'convert-to-directory' && dropTargetId === project.id && (
                              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                                <div className="text-[0.65rem] font-semibold text-blue-500 bg-background/95 px-2 py-0.5 rounded border border-blue-500 shadow-sm">
                                  Convert to subdirectory
                                </div>
                              </div>
                            )}
                            <SidebarMenuButton
                              onClick={() => !editMode && toggleProject(project.id)}
                              className="hover-elevate active-elevate-2"
                              data-testid={`nav-project-${project.id}`}
                            >
                              <div className="flex items-center gap-2 flex-1">
                                {editMode && <GripVertical className="h-3 w-3 text-muted-foreground" />}
                                <ChevronRight
                                  className={`h-4 w-4 transition-transform ${
                                    expandedProjects.has(project.id) ? "rotate-90" : ""
                                  }`}
                                />
                                <FolderOpen className="h-4 w-4" />
                                <span>{project.name}/</span>
                              </div>
                            </SidebarMenuButton>
                          </div>
                        </SidebarMenuItem>

                        {expandedProjects.has(project.id) && (
                          <ProjectDirectories 
                            projectId={project.id} 
                            projectSlug={project.slug} 
                            editMode={editMode} 
                          />
                        )}
                      </div>
                    );
                  })
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="p-4 border-t">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={() => setLocation("/settings")}
                className="hover-elevate active-elevate-2"
                data-testid="nav-settings"
              >
                <Settings className="h-4 w-4" />
                <span>Settings</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>

          <div className="mt-4 space-y-1">
            <div className="text-xs font-mono">
              <span className="text-primary">[OK]</span>
            </div>
            <div className="text-xs text-muted-foreground">
              Online
            </div>
            <div className="text-xs text-muted-foreground">
              Up: 99.9%
            </div>
            <div className="text-xs text-muted-foreground">
              Active
            </div>
          </div>
        </SidebarFooter>
      </Sidebar>
    </DragContext.Provider>
  );
}

function ProjectDirectories({ projectId, projectSlug, editMode }: { projectId: number; projectSlug: string; editMode: boolean }) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const dragContext = useContext(DragContext);
  const [dropTargetDir, setDropTargetDir] = useState<number | null>(null);
  const [dropPosition, setDropPosition] = useState<'before' | 'after' | 'inside' | null>(null);

  const { data: directories } = useQuery<Directory[]>({
    queryKey: [`/api/p/${projectSlug}/directories`],
  });

  if (!directories || directories.length === 0) {
    return (
      <div className="pl-12 py-1 text-xs text-muted-foreground">
        No directories
      </div>
    );
  }

  // Build a tree structure for nested directories
  type DirectoryNode = Directory & { children: DirectoryNode[] };
  
  const buildTree = (parentId: number | null = null, level = 0): DirectoryNode[] => {
    return directories
      .filter(dir => dir.parentId === parentId)
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
      .map(dir => ({
        ...dir,
        children: buildTree(dir.id, level + 1)
      }));
  };

  const handleDragStart = (e: React.DragEvent, dir: Directory) => {
    dragContext.setDraggedItem({ 
      type: 'directory', 
      id: dir.id, 
      data: dir, 
      projectSlug 
    });
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, targetDir: Directory) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    if (!dragContext.draggedItem || !editMode) return;

    // Only handle directory-to-directory drops
    if (dragContext.draggedItem.type !== 'directory') return;
    if (dragContext.draggedItem.id === targetDir.id) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const mouseY = e.clientY - rect.top;
    const elementHeight = rect.height;
    
    // Determine drop position based on mouse Y position
    // Top 25%: before, Middle 50%: inside, Bottom 25%: after
    if (mouseY < elementHeight * 0.25) {
      setDropPosition('before');
      setDropTargetDir(targetDir.id);
      dragContext.setDropAction('reorder');
    } else if (mouseY > elementHeight * 0.75) {
      setDropPosition('after');
      setDropTargetDir(targetDir.id);
      dragContext.setDropAction('reorder');
    } else {
      setDropPosition('inside');
      setDropTargetDir(targetDir.id);
      dragContext.setDropAction('change-parent');
    }
    
    dragContext.setDropTargetId(targetDir.id);
  };

  const handleDragLeave = () => {
    setDropTargetDir(null);
    setDropPosition(null);
  };

  const handleDrop = async (e: React.DragEvent, targetDir: Directory) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!dragContext.draggedItem || dragContext.draggedItem.type !== 'directory') return;
    if (dragContext.draggedItem.id === targetDir.id || !directories) return;

    const draggedDirectory = directories.find(d => d.id === dragContext.draggedItem!.id);
    const targetDirectory = targetDir;

    if (!draggedDirectory) return;

    const currentPosition = dropPosition || 'inside';

    try {
      if (currentPosition === 'inside') {
        // Change parent: move directory into target directory
        // Prevent moving a directory into itself or its descendants
        const isDescendant = (parentId: number | null, ancestorId: number): boolean => {
          if (!parentId) return false;
          if (parentId === ancestorId) return true;
          const parent = directories.find(d => d.id === parentId);
          return parent ? isDescendant(parent.parentId, ancestorId) : false;
        };

        if (isDescendant(targetDirectory.id, draggedDirectory.id)) {
          toast({
            variant: "destructive",
            title: "Invalid Move",
            description: "Cannot move a directory into itself or its descendants",
          });
          dragContext.setDraggedItem(null);
          setDropTargetDir(null);
          setDropPosition(null);
          dragContext.setDropAction(null);
          return;
        }

        // Build new path
        const newPath = `${targetDirectory.path}/${draggedDirectory.name}`;
        
        await apiRequest("POST", `/api/directories/${draggedDirectory.id}/change-parent`, {
          newParentId: targetDirectory.id,
          newPath,
        });

        queryClient.invalidateQueries({ queryKey: [`/api/p/${projectSlug}/directories`] });

        toast({
          title: "Directory Moved",
          description: `Moved "${draggedDirectory.name}" into "${targetDirectory.name}"`,
        });
      } else {
        // Reorder: swap positions within same parent
        if (draggedDirectory.parentId !== targetDirectory.parentId) {
          toast({
            variant: "destructive",
            title: "Cannot Reorder",
            description: "Can only reorder directories at the same level",
          });
          dragContext.setDraggedItem(null);
          setDropTargetDir(null);
          setDropPosition(null);
          dragContext.setDropAction(null);
          return;
        }

        // Swap sortOrder values
        const draggedOrder = draggedDirectory.sortOrder ?? 0;
        const targetOrder = targetDirectory.sortOrder ?? 0;

        await Promise.all([
          apiRequest("POST", `/api/directories/${draggedDirectory.id}/reorder`, {
            sortOrder: targetOrder,
          }),
          apiRequest("POST", `/api/directories/${targetDirectory.id}/reorder`, {
            sortOrder: draggedOrder,
          }),
        ]);

        queryClient.invalidateQueries({ queryKey: [`/api/p/${projectSlug}/directories`] });

        toast({
          title: "Directories Reordered",
          description: "Directory order updated successfully",
        });
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Operation Failed",
        description: error.message || "Failed to update directories",
      });
    }

    dragContext.setDraggedItem(null);
    setDropTargetDir(null);
    setDropPosition(null);
    dragContext.setDropAction(null);
  };
  
  const renderDirectory = (dir: DirectoryNode, level: number, index: number): JSX.Element => {
    const indent = level * 16; // 16px per level
    const isDragging = dragContext.draggedItem?.type === 'directory' && dragContext.draggedItem.id === dir.id;
    const isDropTarget = dropTargetDir === dir.id;
    const showDropIndicator = isDropTarget && dropPosition;

    return (
      <div key={dir.id} className="relative">
        {/* Drop indicator line - shown before item */}
        {showDropIndicator && dropPosition === 'before' && (
          <div 
            className="absolute left-0 right-0 h-0.5 bg-primary -top-px z-10" 
            style={{ marginLeft: `${indent + 32}px` }}
          />
        )}

        <SidebarMenuItem>
          <div
            draggable={editMode}
            onDragStart={(e) => handleDragStart(e, dir)}
            onDragOver={(e) => handleDragOver(e, dir)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, dir)}
            className={`${isDragging ? 'opacity-50' : ''} ${editMode ? 'cursor-move' : ''} ${
              showDropIndicator && dropPosition === 'inside' ? 'bg-primary/10 rounded' : ''
            }`}
          >
            <SidebarMenuButton
              onClick={() => !editMode && setLocation(`/p/${projectSlug}/${dir.slug}`)}
              className="hover-elevate active-elevate-2 text-xs"
              data-testid={`nav-directory-${dir.id}`}
              style={{ paddingLeft: `${indent + 32}px` }}
            >
              <div className="flex items-center gap-2 flex-1">
                {editMode && <GripVertical className="h-3 w-3 text-muted-foreground" />}
                <FolderOpen className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">{dir.name}/</span>
              </div>
            </SidebarMenuButton>
          </div>
        </SidebarMenuItem>

        {/* Drop indicator line - shown after item */}
        {showDropIndicator && dropPosition === 'after' && (
          <div 
            className="absolute left-0 right-0 h-0.5 bg-primary -bottom-px z-10" 
            style={{ marginLeft: `${indent + 32}px` }}
          />
        )}

        {dir.children.map((child, childIndex) => renderDirectory(child, level + 1, childIndex))}
      </div>
    );
  };

  const rootDirectories = buildTree();
  
  return (
    <div className="pl-8">
      {rootDirectories.map((dir, index) => renderDirectory(dir, 0, index))}
    </div>
  );
}
