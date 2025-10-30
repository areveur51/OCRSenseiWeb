import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface OCRResult {
  method: string;
  text: string;
  confidence: number;
}

interface OCRComparisonProps {
  pytesseractResult: OCRResult;
  easyOcrResult: OCRResult;
  consensus: string;
}

export function OCRComparison({
  pytesseractResult,
  easyOcrResult,
  consensus,
}: OCRComparisonProps) {
  return (
    <Card className="p-6">
      <div className="mb-4">
        <h3 className="font-semibold text-lg mb-2">OCR Results</h3>
        <p className="text-sm text-muted-foreground">
          Dual verification comparison
        </p>
      </div>

      <Tabs defaultValue="consensus" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="consensus" data-testid="tab-consensus">
            Consensus
          </TabsTrigger>
          <TabsTrigger value="pytesseract" data-testid="tab-pytesseract">
            Pytesseract
          </TabsTrigger>
          <TabsTrigger value="easyocr" data-testid="tab-easyocr">
            EasyOCR
          </TabsTrigger>
        </TabsList>

        <TabsContent value="consensus" className="space-y-4 mt-4">
          <div className="p-4 bg-muted rounded-md">
            <div className="flex items-center justify-between mb-3">
              <Badge variant="outline">Final Result</Badge>
              <span className="text-xs font-mono text-muted-foreground">
                Merged from both methods
              </span>
            </div>
            <p className="text-sm font-mono leading-relaxed whitespace-pre-wrap">
              {consensus}
            </p>
          </div>
        </TabsContent>

        <TabsContent value="pytesseract" className="space-y-4 mt-4">
          <div className="p-4 bg-muted rounded-md">
            <div className="flex items-center justify-between mb-3">
              <Badge variant="secondary">{pytesseractResult.method}</Badge>
              <span className="text-xs font-mono font-medium">
                {pytesseractResult.confidence}% confidence
              </span>
            </div>
            <p className="text-sm font-mono leading-relaxed whitespace-pre-wrap">
              {pytesseractResult.text}
            </p>
          </div>
        </TabsContent>

        <TabsContent value="easyocr" className="space-y-4 mt-4">
          <div className="p-4 bg-muted rounded-md">
            <div className="flex items-center justify-between mb-3">
              <Badge variant="secondary">{easyOcrResult.method}</Badge>
              <span className="text-xs font-mono font-medium">
                {easyOcrResult.confidence}% confidence
              </span>
            </div>
            <p className="text-sm font-mono leading-relaxed whitespace-pre-wrap">
              {easyOcrResult.text}
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </Card>
  );
}
