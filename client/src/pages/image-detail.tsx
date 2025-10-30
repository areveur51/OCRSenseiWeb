import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { BreadcrumbNav } from "@/components/breadcrumb-nav";
import { ImageViewer } from "@/components/image-viewer";
import { OCRComparison } from "@/components/ocr-comparison";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Play, Trash2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Image, OcrResult } from "@shared/schema";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface ImageWithOcr extends Image {
  ocrResult?: OcrResult;
  processingStatus: string;
}

export default function ImageDetail() {
  const params = useParams();
  const imageId = params.id ? parseInt(params.id) : null;
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);

  const { data: image } = useQuery<ImageWithOcr>({
    queryKey: [`/api/images/${imageId}`],
    enabled: !!imageId,
  });

  const handleReprocess = async () => {
    if (!imageId) return;

    try {
      await apiRequest("POST", `/api/images/${imageId}/process`);
      queryClient.invalidateQueries({ queryKey: [`/api/images/${imageId}`] });
      
      toast({
        title: "Reprocessing Started",
        description: "Image queued for OCR processing.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to queue image for processing",
      });
    }
  };

  const handleDelete = async () => {
    if (!imageId || !image) return;

    try {
      await apiRequest("DELETE", `/api/images/${imageId}`);
      
      // Invalidate directory images cache to refresh the list
      if (image.directoryId) {
        queryClient.invalidateQueries({ 
          queryKey: [`/api/directories/${image.directoryId}/images`] 
        });
      }
      
      toast({
        title: "Image Deleted",
        description: "Image and associated OCR data removed.",
      });
      
      // Navigate back to dashboard
      setLocation("/");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to delete image",
      });
    }
  };

  const textRegions = image?.ocrResult?.boundingBoxes 
    ? (image.ocrResult.boundingBoxes as any[]).map((box: any, idx: number) => ({
        id: String(idx),
        text: box.text,
        x: (box.x / (image.width || 1000)) * 100,
        y: (box.y / (image.height || 1000)) * 100,
        width: (box.width / (image.width || 1000)) * 100,
        height: (box.height / (image.height || 1000)) * 100,
      }))
    : [];

  return (
    <div className="space-y-6">
      <BreadcrumbNav
        items={[
          { label: "Dashboard", href: "/" },
          { label: "Back", href: "/" },
          { label: image?.originalFilename || "Image" },
        ]}
        onNavigate={(href) => setLocation(href)}
      />

      <div className="flex items-start justify-between gap-6 flex-wrap">
        <div className="flex gap-8">
          <pre className="ascii-art text-xl hidden md:block">
{`╔════════════════╗
║      SCAN      ║
║  ████████████  ║
║  ████████████  ║
║  ████████████  ║
╚════════════════╝
    [OCR]`}
          </pre>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">
              <span className="headline-highlight">{image?.originalFilename}</span>
            </h1>
            <p className="text-sm text-muted-foreground mt-2">
              &gt; {image?.ocrResult 
                ? "Dual OCR verification complete" 
                : image?.processingStatus === "processing" 
                  ? "Processing..." 
                  : "Not processed"}_
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          {!image?.ocrResult && (
            <Button onClick={handleReprocess} data-testid="button-process">
              <Play className="h-4 w-4 mr-2" />
              Process Now
            </Button>
          )}
          {image?.ocrResult && (
            <Button variant="outline" data-testid="button-download">
              <Download className="h-4 w-4 mr-2" />
              Export Text
            </Button>
          )}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" data-testid="button-delete-image">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Image?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete the image file and all associated OCR data. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete}>
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {!image ? (
        <div className="text-center py-12 text-muted-foreground">
          <div className="ascii-art">LOADING...</div>
        </div>
      ) : !image.ocrResult ? (
        <div className="text-center py-12 space-y-4">
          <pre className="ascii-art text-sm text-muted-foreground inline-block">
{`╔════════════╗
║  PENDING   ║
║    ⏸️⏸️    ║
╚════════════╝`}
          </pre>
          <p className="text-muted-foreground">
            {image.processingStatus === "processing" 
              ? "OCR processing in progress..." 
              : "This image has not been processed yet. Click 'Process Now' to start OCR extraction."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3">
            <ImageViewer
              textRegions={textRegions}
              onRegionHover={setHoveredRegion}
              imageUrl={`/api/images/${imageId}/file`}
            />
          </div>

          <div className="lg:col-span-2 space-y-6">
            <OCRComparison
              pytesseractResult={{
                method: "Pytesseract",
                text: image.ocrResult.pytesseractText || "",
                confidence: image.ocrResult.pytesseractConfidence || 0,
              }}
              easyOcrResult={{
                method: "EasyOCR (Config 2)",
                text: image.ocrResult.easyocrText || "",
                confidence: image.ocrResult.easyocrConfidence || 0,
              }}
              consensus={image.ocrResult.consensusText || ""}
            />

            <Card className="p-6">
              <h3 className="font-semibold text-base mb-4">
                <span className="headline-highlight">TEXT REGIONS</span>
              </h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {textRegions.map((region) => (
                  <div
                    key={region.id}
                    className={`p-2 rounded text-sm hover-elevate cursor-pointer ${
                      hoveredRegion === region.id ? "bg-primary/20" : ""
                    }`}
                    onMouseEnter={() => setHoveredRegion(region.id)}
                    onMouseLeave={() => setHoveredRegion(null)}
                  >
                    {region.text}
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
