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

interface Project {
  id: string;
  name: string;
  subdirectories: string[];
}

interface AppSidebarProps {
  projects?: Project[];
  onNavigate?: (path: string) => void;
}

export function AppSidebar({ projects = [], onNavigate }: AppSidebarProps) {
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(
    new Set()
  );

  const toggleProject = (projectId: string) => {
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
        <pre className="ascii-art text-base mb-3 leading-tight">
{`╔═══════════════╗
║  OCR SYSTEM   ║
║ ████████████  ║
║ ════════════  ║
╚═══════════════╝`}
        </pre>
        <h2 className="font-semibold text-base">
          <span className="headline-highlight">OCR EXTRACTOR</span>
        </h2>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>
            <span className="headline-highlight">DIRECTORY TREE</span>
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <div className="font-mono text-sm space-y-0.5 px-2">
              {/* Root navigation items */}
              <div
                className="flex items-center gap-2 py-1.5 px-2 hover-elevate active-elevate-2 cursor-pointer rounded"
                onClick={() => {
                  onNavigate?.("/");
                  console.log("Navigate to dashboard");
                }}
                data-testid="nav-dashboard"
              >
                <span className="text-primary">├──</span>
                <Home className="h-3.5 w-3.5 text-primary" />
                <span>Dashboard</span>
              </div>
              
              <div
                className="flex items-center gap-2 py-1.5 px-2 hover-elevate active-elevate-2 cursor-pointer rounded"
                onClick={() => {
                  onNavigate?.("/search");
                  console.log("Navigate to search");
                }}
                data-testid="nav-search"
              >
                <span className="text-primary">├──</span>
                <Search className="h-3.5 w-3.5 text-primary" />
                <span>Search</span>
              </div>

              {/* Projects tree */}
              <div className="py-1.5 px-2">
                <span className="text-primary">└──</span>
                <span className="ml-2 text-muted-foreground">Projects/</span>
              </div>

              {projects.map((project, projectIndex) => {
                const isLastProject = projectIndex === projects.length - 1;
                const isExpanded = expandedProjects.has(project.id);
                
                return (
                  <div key={project.id}>
                    <div
                      className="flex items-center gap-2 py-1.5 px-2 hover-elevate active-elevate-2 cursor-pointer rounded"
                      onClick={() => toggleProject(project.id)}
                      data-testid={`nav-project-${project.id}`}
                    >
                      <span className="text-primary ml-4">
                        {isLastProject ? "    └──" : "    ├──"}
                      </span>
                      <span className="text-primary">{isExpanded ? "📂" : "📁"}</span>
                      <span>{project.name}/</span>
                    </div>

                    {isExpanded &&
                      project.subdirectories.map((subdir, subdirIndex) => {
                        const isLastSubdir = subdirIndex === project.subdirectories.length - 1;
                        
                        return (
                          <div
                            key={subdir}
                            className="flex items-center gap-2 py-1.5 px-2 hover-elevate active-elevate-2 cursor-pointer rounded"
                            onClick={() => {
                              onNavigate?.(`/project/${project.id}/${subdir}`);
                              console.log(`Navigate to ${project.name}/${subdir}`);
                            }}
                            data-testid={`nav-subdir-${subdir}`}
                          >
                            <span className="text-primary ml-8">
                              {isLastProject ? "        " : "    │   "}
                              {isLastSubdir ? "└──" : "├──"}
                            </span>
                            <span className="text-sm">{subdir}</span>
                          </div>
                        );
                      })}
                  </div>
                );
              })}
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t">
        <div className="font-mono text-sm px-2">
          <div
            className="flex items-center gap-2 py-1.5 px-2 hover-elevate active-elevate-2 cursor-pointer rounded"
            onClick={() => {
              onNavigate?.("/settings");
              console.log("Navigate to settings");
            }}
            data-testid="nav-settings"
          >
            <span className="text-primary">└──</span>
            <Settings className="h-3.5 w-3.5 text-primary" />
            <span>Settings</span>
          </div>
        </div>
        
        <div className="mt-3 pt-3 border-t">
          <pre className="ascii-art text-sm opacity-90 leading-tight">
{`┌── SYSTEM ────┐
│  ████  ✓     │
│ Online       │
│ Up: 99.9%    │
│ Active_      │
└──────────────┘`}
          </pre>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
