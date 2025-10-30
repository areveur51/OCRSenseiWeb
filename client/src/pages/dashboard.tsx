import { useState } from "react";
import { useLocation } from "wouter";
import { FolderOpen, FileText, CheckCircle2, TrendingUp, Plus } from "lucide-react";
import { StatsCard } from "@/components/stats-card";
import { ProjectCard } from "@/components/project-card";
import { CreateProjectDialog } from "@/components/create-project-dialog";
import { SearchBar } from "@/components/search-bar";

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const [projects] = useState([
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
    {
      id: "4",
      name: "Business Correspondence",
      totalImages: 320,
      processedImages: 120,
      subdirectoryCount: 6,
      lastUpdated: "5 days ago",
    },
  ]);

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
          onCreateProject={(data) => console.log("New project:", data)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Total Projects"
          value={projects.length}
          icon={FolderOpen}
          trend={{ value: "2 this week", isPositive: true }}
        />
        <StatsCard
          title="Images Processed"
          value="3,247"
          icon={FileText}
          description="Last 30 days"
        />
        <StatsCard
          title="Completed"
          value="2,891"
          icon={CheckCircle2}
        />
        <StatsCard
          title="Avg. Confidence"
          value="94.2%"
          icon={TrendingUp}
          trend={{ value: "3.1% from last month", isPositive: true }}
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
              onSearch={(q) => console.log("Search projects:", q)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              {...project}
              onClick={() => setLocation(`/project/${project.id}/overview`)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
