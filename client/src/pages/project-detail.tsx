import { useState } from "react";
import { BreadcrumbNav } from "@/components/breadcrumb-nav";
import { Button } from "@/components/ui/button";
import { ImageCard } from "@/components/image-card";
import { UploadZone } from "@/components/upload-zone";
import { Upload, Play, Download } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function ProjectDetail() {
  const [images] = useState([
    {
      id: "1",
      filename: "document_001.jpg",
      status: "completed" as const,
      confidence: 94,
    },
    {
      id: "2",
      filename: "scan_042.png",
      status: "completed" as const,
      confidence: 89,
    },
    {
      id: "3",
      filename: "page_153.tiff",
      status: "processing" as const,
    },
    {
      id: "4",
      filename: "legacy_doc_007.jpg",
      status: "pending" as const,
    },
    {
      id: "5",
      filename: "archive_0234.png",
      status: "completed" as const,
      confidence: 97,
    },
    {
      id: "6",
      filename: "record_189.jpg",
      status: "error" as const,
    },
  ]);

  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);

  return (
    <div className="space-y-6">
      <BreadcrumbNav
        items={[
          { label: "Projects", href: "/projects" },
          { label: "Historical Documents", href: "/projects/1" },
          { label: "1920s" },
        ]}
        onNavigate={(href) => console.log("Navigate:", href)}
      />

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex gap-6">
          <pre className="ascii-art text-sm hidden md:block">
{`  ┌───────┐
  │ █████ │
  │ █████ │
  │ █████ │
  └───────┘
  [FOLDER]`}
          </pre>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              <span className="headline-highlight">Historical Documents / 1920s</span>
            </h1>
            <p className="text-sm text-muted-foreground mt-2">
              &gt; {images.length} images • 4 completed • 1 processing • 1 pending_
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" data-testid="button-upload">
                <Upload className="h-4 w-4 mr-2" />
                Upload
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Upload Images</DialogTitle>
              </DialogHeader>
              <UploadZone
                onFilesSelected={(files) => {
                  console.log("Files uploaded:", files);
                  setUploadDialogOpen(false);
                }}
              />
            </DialogContent>
          </Dialog>

          <Button data-testid="button-process">
            <Play className="h-4 w-4 mr-2" />
            Process Pending
          </Button>
          <Button variant="outline" data-testid="button-export">
            <Download className="h-4 w-4 mr-2" />
            Export Results
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {images.map((image) => (
          <ImageCard
            key={image.id}
            {...image}
            onClick={() => console.log("Open image:", image.id)}
          />
        ))}
      </div>
    </div>
  );
}
