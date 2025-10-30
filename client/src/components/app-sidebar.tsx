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
        <h2 className="font-semibold text-lg">OCR Extractor</h2>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => {
                    onNavigate?.("/");
                    console.log("Navigate to dashboard");
                  }}
                  data-testid="nav-dashboard"
                >
                  <Home className="h-4 w-4" />
                  <span>Dashboard</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => {
                    onNavigate?.("/search");
                    console.log("Navigate to search");
                  }}
                  data-testid="nav-search"
                >
                  <Search className="h-4 w-4" />
                  <span>Search</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Projects</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {projects.map((project) => (
                <div key={project.id}>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      onClick={() => toggleProject(project.id)}
                      data-testid={`nav-project-${project.id}`}
                    >
                      <ChevronRight
                        className={`h-4 w-4 transition-transform ${
                          expandedProjects.has(project.id) ? "rotate-90" : ""
                        }`}
                      />
                      <FolderOpen className="h-4 w-4" />
                      <span>{project.name}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  {expandedProjects.has(project.id) &&
                    project.subdirectories.map((subdir) => (
                      <SidebarMenuItem key={subdir} className="pl-4">
                        <SidebarMenuButton
                          onClick={() => {
                            onNavigate?.(`/project/${project.id}/${subdir}`);
                            console.log(
                              `Navigate to ${project.name}/${subdir}`
                            );
                          }}
                          data-testid={`nav-subdir-${subdir}`}
                        >
                          <span className="text-sm">{subdir}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                </div>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => {
                onNavigate?.("/settings");
                console.log("Navigate to settings");
              }}
              data-testid="nav-settings"
            >
              <Settings className="h-4 w-4" />
              <span>Settings</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
