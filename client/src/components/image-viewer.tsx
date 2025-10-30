import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut, Maximize, RotateCw } from "lucide-react";
import { useState } from "react";

interface TextRegion {
  id: string;
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ImageViewerProps {
  imageUrl?: string;
  textRegions?: TextRegion[];
  onRegionHover?: (regionId: string | null) => void;
}

export function ImageViewer({
  imageUrl,
  textRegions = [],
  onRegionHover,
}: ImageViewerProps) {
  const [zoom, setZoom] = useState(100);
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 25, 200));
    console.log("Zoom in");
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 25, 50));
    console.log("Zoom out");
  };

  const handleRegionHover = (regionId: string | null) => {
    setHoveredRegion(regionId);
    onRegionHover?.(regionId);
  };

  return (
    <Card className="overflow-hidden">
      <div className="border-b p-2 flex items-center gap-2 bg-muted/30">
        <Button
          size="icon"
          variant="ghost"
          onClick={handleZoomIn}
          data-testid="button-zoom-in"
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          onClick={handleZoomOut}
          data-testid="button-zoom-out"
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
        <div className="px-2 text-xs font-mono text-muted-foreground">
          {zoom}%
        </div>
        <div className="flex-1" />
        <Button
          size="icon"
          variant="ghost"
          onClick={() => console.log("Rotate")}
          data-testid="button-rotate"
        >
          <RotateCw className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          onClick={() => console.log("Fullscreen")}
          data-testid="button-fullscreen"
        >
          <Maximize className="h-4 w-4" />
        </Button>
      </div>

      <div className="relative bg-muted/20 overflow-auto flex items-center justify-center" style={{ height: "600px" }}>
        <div
          className="relative"
          style={{
            transform: `scale(${zoom / 100})`,
            transformOrigin: "center center",
            transition: "transform 0.2s ease-out",
          }}
        >
          {imageUrl ? (
            <div className="relative inline-block">
              <img
                src={imageUrl}
                alt="Scanned document"
                className="max-h-[580px] w-auto object-contain"
              />
              {textRegions.map((region) => (
                <div
                  key={region.id}
                  className={`
                    absolute border-2 transition-all cursor-pointer
                    ${
                      hoveredRegion === region.id
                        ? "bg-primary/20 border-primary"
                        : "bg-transparent border-transparent hover:bg-primary/10 hover:border-primary/50"
                    }
                  `}
                  style={{
                    left: `${region.x}%`,
                    top: `${region.y}%`,
                    width: `${region.width}%`,
                    height: `${region.height}%`,
                  }}
                  onMouseEnter={() => handleRegionHover(region.id)}
                  onMouseLeave={() => handleRegionHover(null)}
                  data-testid={`region-${region.id}`}
                />
              ))}
            </div>
          ) : (
            <div className="text-center text-muted-foreground p-8">
              No image selected
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
