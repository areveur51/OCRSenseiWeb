import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, AlertCircle, FileImage } from "lucide-react";

type ProcessingStatus = "pending" | "processing" | "completed" | "error";

interface ImageCardProps {
  filename: string;
  status: ProcessingStatus;
  confidence?: number;
  thumbnailUrl?: string;
  onClick?: () => void;
}

const statusConfig = {
  pending: {
    icon: Clock,
    label: "Pending",
    variant: "secondary" as const,
  },
  processing: {
    icon: Clock,
    label: "Processing",
    variant: "default" as const,
  },
  completed: {
    icon: CheckCircle2,
    label: "Completed",
    variant: "outline" as const,
  },
  error: {
    icon: AlertCircle,
    label: "Error",
    variant: "destructive" as const,
  },
};

export function ImageCard({
  filename,
  status,
  confidence,
  thumbnailUrl,
  onClick,
}: ImageCardProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <Card
      className={`overflow-hidden hover-elevate active-elevate-2 cursor-pointer ${status === 'processing' ? 'loading-cursor' : ''}`}
      onClick={onClick}
      data-testid={`card-image-${filename}`}
    >
      <div className="aspect-[4/3] bg-muted relative flex items-center justify-center">
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={filename}
            className="w-full h-full object-cover"
          />
        ) : (
          <FileImage className="h-12 w-12 text-muted-foreground" />
        )}
        <div className="absolute top-2 right-2">
          <Badge variant={config.variant} className="text-xs shadow-md">
            <Icon className="h-3 w-3 mr-1" />
            {config.label}
            {status === 'processing' && <span className="cursor-blink ml-1">|</span>}
          </Badge>
        </div>
      </div>

      <div className="p-4">
        <p
          className="text-sm font-medium truncate mb-2"
          title={filename}
          data-testid={`text-filename-${filename}`}
        >
          {filename}
        </p>

        {confidence !== undefined && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Confidence</span>
            <span className="text-xs font-mono font-medium">
              {confidence}%
            </span>
          </div>
        )}
      </div>
    </Card>
  );
}
