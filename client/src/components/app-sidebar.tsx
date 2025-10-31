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
import { Home, FolderOpen, Search, Settings, ChevronRight } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import type { Project, Directory } from "@shared/schema";

interface ProjectWithDirectories extends Project {
  directories?: Directory[];
}

export function AppSidebar() {
  const [, setLocation] = useLocation();
  const [expandedProjects, setExpandedProjects] = useState<Set<number>>(
    new Set()
  );

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
          <SidebarGroupLabel>Browse/</SidebarGroupLabel>
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
                      <ProjectDirectories projectId={project.id} />
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

function ProjectDirectories({ projectId }: { projectId: number }) {
  const [, setLocation] = useLocation();

  const { data: directories } = useQuery<Directory[]>({
    queryKey: [`/api/projects/${projectId}/directories`],
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
  
  const renderDirectory = (dir: DirectoryNode, level: number, index: number): JSX.Element => {
    const indent = level * 16; // 16px per level
    return (
      <div key={dir.id}>
        <SidebarMenuItem>
          <SidebarMenuButton
            onClick={() => setLocation(`/project/${projectId}/dir/${dir.id}`)}
            className="hover-elevate active-elevate-2 text-xs"
            data-testid={`nav-directory-${dir.id}`}
            style={{ paddingLeft: `${indent + 32}px` }}
          >
            <div className="flex items-center gap-2 flex-1">
              <pre className="ascii-art text-[0.5rem] leading-tight opacity-80 flex-shrink-0">
{directoryAsciiArt[index % directoryAsciiArt.length]}
              </pre>
              <span className="truncate">{dir.name}/</span>
            </div>
          </SidebarMenuButton>
        </SidebarMenuItem>
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
