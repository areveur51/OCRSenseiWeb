import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FolderOpen, FileText, CheckCircle2, Clock } from "lucide-react";

interface ProjectCardProps {
  name: string;
  totalImages: number;
  processedImages: number;
  subdirectoryCount: number;
  lastUpdated: string;
  onClick?: () => void;
}

export function ProjectCard({
  name,
  totalImages,
  processedImages,
  subdirectoryCount,
  lastUpdated,
  onClick,
}: ProjectCardProps) {
  const progress = totalImages > 0 ? (processedImages / totalImages) * 100 : 0;

  return (
    <Card
      className="p-6 hover-elevate active-elevate-2 cursor-pointer"
      onClick={onClick}
      data-testid={`card-project-${name.toLowerCase().replace(/\s+/g, '-')}`}
    >
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-start gap-3">
          <pre className="ascii-art text-base leading-tight opacity-90">
{`┌─────┐
│ ▓▓▓ │
│ ▓▓▓ │
└─────┘`}
          </pre>
          <div className="flex-1">
            <h3 className="font-semibold text-base" data-testid={`text-project-name-${name.toLowerCase().replace(/\s+/g, '-')}`}>
              {name}
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              {subdirectoryCount} {subdirectoryCount === 1 ? 'directory' : 'directories'}
            </p>
          </div>
        </div>
        <Badge variant="secondary" className="text-xs">
          {progress === 100 ? (
            <CheckCircle2 className="h-3 w-3 mr-1" />
          ) : (
            <Clock className="h-3 w-3 mr-1" />
          )}
          {Math.round(progress)}%
        </Badge>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground flex items-center gap-1">
            <FileText className="h-3.5 w-3.5" />
            Images
          </span>
          <span className="font-medium">
            {processedImages} / {totalImages}
          </span>
        </div>

        <div className="w-full bg-secondary rounded-full h-2">
          <div
            className="bg-primary h-2 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>

        <p className="text-xs text-muted-foreground pt-1">
          Updated {lastUpdated}
        </p>
      </div>
    </Card>
  );
}
