import { useState } from "react";
import { BreadcrumbNav } from "@/components/breadcrumb-nav";
import { ImageViewer } from "@/components/image-viewer";
import { OCRComparison } from "@/components/ocr-comparison";
import { Card } from "@/components/ui/card";

export default function ImageDetail() {
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);

  const textRegions = [
    {
      id: "1",
      text: "HISTORICAL DOCUMENT",
      x: 15,
      y: 10,
      width: 35,
      height: 4,
    },
    {
      id: "2",
      text: "This is a sample text extracted from the scanned document.",
      x: 15,
      y: 18,
      width: 70,
      height: 6,
    },
    {
      id: "3",
      text: "Date: March 15, 1995",
      x: 15,
      y: 28,
      width: 25,
      height: 4,
    },
    {
      id: "4",
      text: "Location: City Archives, Building 4",
      x: 15,
      y: 35,
      width: 40,
      height: 4,
    },
  ];

  return (
    <div className="space-y-6">
      <BreadcrumbNav
        items={[
          { label: "Projects", href: "/projects" },
          { label: "Historical Documents", href: "/projects/1" },
          { label: "1920s", href: "/projects/1/1920s" },
          { label: "document_001.jpg" },
        ]}
        onNavigate={(href) => console.log("Navigate:", href)}
      />

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
            <span className="headline-highlight">document_001.jpg</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            &gt; Dual OCR verification complete_
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3">
          <ImageViewer
            textRegions={textRegions}
            onRegionHover={setHoveredRegion}
          />
        </div>

        <div className="lg:col-span-2 space-y-6">
          <OCRComparison
            pytesseractResult={{
              method: "Pytesseract",
              text: "HISTORICAL DOCUMENT\n\nThis is a sample text extracted from the scanned document.\n\nDate: March 15, 1995\nLocation: City Archives, Building 4",
              confidence: 92,
            }}
            easyOcrResult={{
              method: "EasyOCR",
              text: "HISTORICAL DOCUMENT\n\nThis is a sample text extracted from the scanned document.\n\nDate: March 15, 1995\nLocation: City Archives, Building 4",
              confidence: 96,
            }}
            consensus="HISTORICAL DOCUMENT\n\nThis is a sample text extracted from the scanned document.\n\nDate: March 15, 1995\nLocation: City Archives, Building 4"
          />

          <Card className="p-6">
            <h3 className="font-semibold text-base mb-4">Text Regions</h3>
            <div className="space-y-2">
              {textRegions.map((region) => (
                <div
                  key={region.id}
                  className={`
                    p-3 rounded-md text-sm cursor-pointer transition-colors
                    ${
                      hoveredRegion === region.id
                        ? "bg-primary/10 border border-primary"
                        : "bg-muted hover:bg-muted/70"
                    }
                  `}
                  onMouseEnter={() => setHoveredRegion(region.id)}
                  onMouseLeave={() => setHoveredRegion(null)}
                  data-testid={`text-region-${region.id}`}
                >
                  {region.text}
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
