import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { FolderOpen, FileText, CheckCircle2, TrendingUp } from "lucide-react";
import { StatsCard } from "@/components/stats-card";
import { ProjectCard } from "@/components/project-card";
import { CreateProjectDialog } from "@/components/create-project-dialog";
import { SearchBar } from "@/components/search-bar";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import type { Project } from "@shared/schema";

interface ProjectWithStats extends Project {
  totalImages: number;
  processedImages: number;
  totalDirectories: number;
}

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const { data: projects, isLoading } = useQuery<ProjectWithStats[]>({
    queryKey: ["/api/projects"],
  });

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

  const filteredProjects = projects?.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const totalProjects = projects?.length || 0;
  const totalImages = projects?.reduce((sum, p) => sum + p.totalImages, 0) || 0;
  const processedImages = projects?.reduce((sum, p) => sum + p.processedImages, 0) || 0;
  const avgProgress = totalImages > 0 ? Math.round((processedImages / totalImages) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-6 flex-wrap">
        <div className="flex gap-8">
          <pre className="ascii-art text-xl hidden lg:block">
{`╔════════════════╗
║  ████████████  ║
║  ████████████  ║
║  ████████████  ║
║  ████████████  ║
║  ████████████  ║
╚════════════════╝
  [MAIN SERVER]`}
          </pre>
          <pre className="ascii-art text-base hidden md:block lg:hidden">
{`╔══════════════╗
║  ██████████  ║
║  ██████████  ║
║  ██████████  ║
╚══════════════╝
  [SERVER]`}
          </pre>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">
              <span className="headline-highlight">SYSTEM DASHBOARD</span>
            </h1>
            <p className="text-sm text-muted-foreground mt-2">
              &gt; Manage OCR projects and track processing status_
            </p>
          </div>
        </div>
        <CreateProjectDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          onCreateProject={handleCreateProject}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Total Projects"
          value={totalProjects}
          icon={FolderOpen}
          trend={{ value: `${totalProjects} active`, isPositive: true }}
        />
        <StatsCard
          title="Total Images"
          value={totalImages.toLocaleString()}
          icon={FileText}
          description="All projects"
        />
        <StatsCard
          title="Processed"
          value={processedImages.toLocaleString()}
          icon={CheckCircle2}
        />
        <StatsCard
          title="Progress"
          value={`${avgProgress}%`}
          icon={TrendingUp}
          trend={{ value: `${processedImages}/${totalImages} complete`, isPositive: avgProgress > 50 }}
        />
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <h2 className="text-lg font-semibold">
            <span className="headline-highlight">ACTIVE PROJECTS</span>
          </h2>
          <div className="w-full md:w-96">
            <SearchBar
              placeholder="Search projects..."
              onSearch={setSearchQuery}
            />
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">
            <div className="ascii-art">LOADING...</div>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="text-center py-12 space-y-4">
            <pre className="ascii-art text-sm text-muted-foreground inline-block">
{`╔════════════╗
║    ∅∅∅∅    ║
║  NO DATA   ║
╚════════════╝`}
            </pre>
            <p className="text-muted-foreground">
              {searchQuery ? "No projects match your search" : "No projects yet. Create one to get started!"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map((project) => {
              const progress = project.totalImages > 0 
                ? Math.round((project.processedImages / project.totalImages) * 100) 
                : 0;
              
              const updatedDate = new Date(project.updatedAt);
              const now = new Date();
              const diffMs = now.getTime() - updatedDate.getTime();
              const diffMins = Math.floor(diffMs / 60000);
              const diffHours = Math.floor(diffMs / 3600000);
              const diffDays = Math.floor(diffMs / 86400000);
              
              let lastUpdated = "just now";
              if (diffMins < 60 && diffMins > 0) {
                lastUpdated = `${diffMins} min${diffMins !== 1 ? 's' : ''} ago`;
              } else if (diffHours < 24) {
                lastUpdated = `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
              } else if (diffDays > 0) {
                lastUpdated = `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
              }
              
              return (
                <ProjectCard
                  key={project.id}
                  name={project.name}
                  totalImages={project.totalImages}
                  processedImages={project.processedImages}
                  subdirectoryCount={project.totalDirectories}
                  lastUpdated={lastUpdated}
                  onClick={() => setLocation(`/project/${project.id}/root`)}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
