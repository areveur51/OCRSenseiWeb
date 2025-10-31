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
import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Project, Directory } from "@shared/schema";

interface ProjectWithDirectories extends Project {
  directories?: Directory[];
}

export function AppSidebar() {
  const [, setLocation] = useLocation();
  const [expandedProjects, setExpandedProjects] = useState<Set<number>>(
    new Set()
  );
  const [editMode, setEditMode] = useState(false);

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

  return (
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
          <SidebarGroupContent>
            <SidebarMenu>
              {!projects || projects.length === 0 ? (
                <div className="px-3 py-2 text-xs text-muted-foreground">
                  No projects yet
                </div>
              ) : (
                projects.map((project) => (
                  <div key={project.id}>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        onClick={() => toggleProject(project.id)}
                        className="hover-elevate active-elevate-2"
                        data-testid={`nav-project-${project.id}`}
                      >
                        <ChevronRight
                          className={`h-4 w-4 transition-transform ${
                            expandedProjects.has(project.id) ? "rotate-90" : ""
                          }`}
                        />
                        <FolderOpen className="h-4 w-4" />
                        <span>{project.name}/</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>

                    {expandedProjects.has(project.id) && (
                      <ProjectDirectories projectId={project.id} projectSlug={project.slug} editMode={editMode} />
                    )}
                  </div>
                ))
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
  );
}

function ProjectDirectories({ projectId, projectSlug, editMode }: { projectId: number; projectSlug: string; editMode: boolean }) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [draggedDir, setDraggedDir] = useState<number | null>(null);
  const [dropTargetDir, setDropTargetDir] = useState<number | null>(null);
  const [dropPosition, setDropPosition] = useState<'before' | 'after' | 'inside' | null>(null);

  const { data: directories } = useQuery<Directory[]>({
    queryKey: [`/api/p/${projectSlug}/directories`],
  });

  // ASCII art variations for subdirectories
  const directoryAsciiArt = [
    `╔═╗
║▓║
╚═╝`,
    `╔═╗
║█║
╚═╝`,
    `╔═╗
║▒║
╚═╝`,
  ];

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
      .map(dir => ({
        ...dir,
        children: buildTree(dir.id, level + 1)
      }));
  };

  const handleDragStart = (e: React.DragEvent, dirId: number) => {
    setDraggedDir(dirId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, targetDirId: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    if (!draggedDir || draggedDir === targetDirId) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const mouseY = e.clientY - rect.top;
    const elementHeight = rect.height;
    
    // Determine drop position based on mouse Y position
    // Top 25%: before, Middle 50%: inside, Bottom 25%: after
    if (mouseY < elementHeight * 0.25) {
      setDropPosition('before');
      setDropTargetDir(targetDirId);
    } else if (mouseY > elementHeight * 0.75) {
      setDropPosition('after');
      setDropTargetDir(targetDirId);
    } else {
      setDropPosition('inside');
      setDropTargetDir(targetDirId);
    }
  };

  const handleDragLeave = () => {
    setDropTargetDir(null);
    setDropPosition(null);
  };

  const handleDrop = async (e: React.DragEvent, targetDirId: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (!draggedDir || draggedDir === targetDirId || !directories) return;

    const draggedDirectory = directories.find(d => d.id === draggedDir);
    const targetDirectory = directories.find(d => d.id === targetDirId);

    if (!draggedDirectory || !targetDirectory) return;

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

        if (isDescendant(targetDirId, draggedDir)) {
          toast({
            variant: "destructive",
            title: "Invalid Move",
            description: "Cannot move a directory into itself or its descendants",
          });
          setDraggedDir(null);
          setDropTargetDir(null);
          setDropPosition(null);
          return;
        }

        // Build new path
        const newPath = `${targetDirectory.path}/${draggedDirectory.name}`;
        
        await apiRequest("POST", `/api/directories/${draggedDir}/change-parent`, {
          newParentId: targetDirId,
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
          setDraggedDir(null);
          setDropTargetDir(null);
          setDropPosition(null);
          return;
        }

        // Swap sortOrder values
        const draggedOrder = draggedDirectory.sortOrder ?? 0;
        const targetOrder = targetDirectory.sortOrder ?? 0;

        await Promise.all([
          apiRequest("POST", `/api/directories/${draggedDir}/reorder`, {
            sortOrder: targetOrder,
          }),
          apiRequest("POST", `/api/directories/${targetDirId}/reorder`, {
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

    setDraggedDir(null);
    setDropTargetDir(null);
    setDropPosition(null);
  };
  
  const renderDirectory = (dir: DirectoryNode, level: number, index: number): JSX.Element => {
    const indent = level * 16; // 16px per level
    const isDragging = draggedDir === dir.id;
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
            onDragStart={(e) => handleDragStart(e, dir.id)}
            onDragOver={(e) => handleDragOver(e, dir.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, dir.id)}
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
                <pre className="ascii-art text-[0.5rem] leading-tight opacity-80 flex-shrink-0">
{directoryAsciiArt[index % directoryAsciiArt.length]}
                </pre>
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
