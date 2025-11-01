import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { FolderOpen, FileText, CheckCircle2, TrendingUp, ChevronLeft, ChevronRight } from "lucide-react";
import { StatsCard } from "@/components/stats-card";
import { ProjectCard } from "@/components/project-card";
import { CreateProjectDialog } from "@/components/create-project-dialog";
import { SearchBar } from "@/components/search-bar";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useState, useEffect } from "react";
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
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(9);
  const { toast } = useToast();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const { data: allProjects, isLoading: isLoadingAll } = useQuery<ProjectWithStats[]>({
    queryKey: ["/api/projects"],
    queryFn: async () => {
      const response = await fetch("/api/projects", {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to fetch projects");
      }
      return response.json();
    },
  });

  // Client-side pagination and filtering
  const filteredProjects = allProjects?.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];
  
  const totalProjects = filteredProjects.length;
  const totalPages = Math.max(1, Math.ceil(totalProjects / pageSize));
  
  // Sync currentPage to valid range when totalPages changes
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);
  
  const paginatedProjects = filteredProjects.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const isLoading = isLoadingAll;

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

  const handlePageSizeChange = (newSize: string) => {
    setPageSize(parseInt(newSize));
    setCurrentPage(1); // Reset to page 1 when page size changes
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1); // Reset to page 1 when search changes
  };

  const totalImages = allProjects?.reduce((sum, p) => sum + p.totalImages, 0) || 0;
  const processedImages = allProjects?.reduce((sum, p) => sum + p.processedImages, 0) || 0;
  const avgProgress = totalImages > 0 ? Math.round((processedImages / totalImages) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-6 flex-wrap">
        <div className="flex gap-8">
          <pre className="ascii-art text-xl hidden md:block">
{`╔═══════╗
║ ╔═══╗ ║
║ ║▓█▓║ ║
║ ╚═══╝ ║
╚═══════╝`}
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
          value={allProjects?.length || 0}
          icon={FolderOpen}
          trend={{ value: `${allProjects?.length || 0} active`, isPositive: true }}
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
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold">
              <span className="headline-highlight">ACTIVE PROJECTS</span>
            </h2>
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <Select value={pageSize.toString()} onValueChange={handlePageSizeChange}>
                  <SelectTrigger className="w-24" data-testid="select-projects-page-size">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="9">9</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
                <span className="text-sm text-muted-foreground">per page</span>
              </div>
            )}
          </div>
          <div className="w-full md:w-96">
            <SearchBar
              placeholder="Search projects..."
              onSearch={handleSearchChange}
            />
          </div>
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
        ) : filteredProjects.length === 0 ? (
          <div className="text-center py-12 space-y-4">
            <pre className="ascii-art text-base text-muted-foreground inline-block">
{`╔═══╗
║ - ║
║   ║
╚═══╝`}
            </pre>
            <p className="text-muted-foreground">
              {searchQuery ? "No projects match your search" : "No projects yet. Create one to get started!"}
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {paginatedProjects.map((project) => {
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
                  projectId={project.id}
                  name={project.name}
                  totalImages={project.totalImages}
                  processedImages={project.processedImages}
                  subdirectoryCount={project.totalDirectories}
                  lastUpdated={lastUpdated}
                  onClick={() => setLocation(`/p/${project.slug}`)}
                />
              );
            })}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t pt-4">
                <p className="text-sm text-muted-foreground">
                  Showing {((currentPage - 1) * pageSize) + 1}-{Math.min(currentPage * pageSize, totalProjects)} of {totalProjects} projects
                  {totalPages > 1 && ` • Page ${currentPage} of ${totalPages}`}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    data-testid="button-projects-prev-page"
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    data-testid="button-projects-next-page"
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
