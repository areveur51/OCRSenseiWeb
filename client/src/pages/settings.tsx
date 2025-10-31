import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { 
  Settings as SettingsIcon, 
  Search, 
  Save,
  Check,
  ScanText
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Settings as SettingsType } from "@shared/schema";

export default function Settings() {
  const { toast } = useToast();
  const [fuzzyVariations, setFuzzyVariations] = useState<number | null>(null);
  const [ocrEngineMode, setOcrEngineMode] = useState<number | null>(null);
  const [ocrPsmConfig1, setOcrPsmConfig1] = useState<number | null>(null);
  const [ocrPsmConfig2, setOcrPsmConfig2] = useState<number | null>(null);
  const [ocrPreprocessing, setOcrPreprocessing] = useState<number | null>(null);
  const [ocrUpscale, setOcrUpscale] = useState<number | null>(null);
  const [ocrDenoise, setOcrDenoise] = useState<number | null>(null);
  const [ocrDeskew, setOcrDeskew] = useState<number | null>(null);

  const { data: settings, isLoading } = useQuery<SettingsType>({
    queryKey: ["/api/settings"],
  });

  useEffect(() => {
    if (settings && fuzzyVariations === null) {
      setFuzzyVariations(settings.fuzzySearchVariations);
      setOcrEngineMode(settings.ocrEngineMode);
      setOcrPsmConfig1(settings.ocrPsmConfig1);
      setOcrPsmConfig2(settings.ocrPsmConfig2);
      setOcrPreprocessing(settings.ocrPreprocessing);
      setOcrUpscale(settings.ocrUpscale);
      setOcrDenoise(settings.ocrDenoise);
      setOcrDeskew(settings.ocrDeskew);
    }
  }, [settings, fuzzyVariations]);

  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<SettingsType>) => {
      return apiRequest("PATCH", "/api/settings", updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({
        title: "Settings Saved",
        description: "Your preferences have been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Save Failed",
        description: error.message || "Failed to save settings",
      });
    },
  });

  const handleSave = () => {
    const updates: Partial<SettingsType> = {};
    if (fuzzyVariations !== null && fuzzyVariations !== settings?.fuzzySearchVariations) {
      updates.fuzzySearchVariations = fuzzyVariations;
    }
    if (ocrEngineMode !== null && ocrEngineMode !== settings?.ocrEngineMode) {
      updates.ocrEngineMode = ocrEngineMode;
    }
    if (ocrPsmConfig1 !== null && ocrPsmConfig1 !== settings?.ocrPsmConfig1) {
      updates.ocrPsmConfig1 = ocrPsmConfig1;
    }
    if (ocrPsmConfig2 !== null && ocrPsmConfig2 !== settings?.ocrPsmConfig2) {
      updates.ocrPsmConfig2 = ocrPsmConfig2;
    }
    if (ocrPreprocessing !== null && ocrPreprocessing !== settings?.ocrPreprocessing) {
      updates.ocrPreprocessing = ocrPreprocessing;
    }
    if (ocrUpscale !== null && ocrUpscale !== settings?.ocrUpscale) {
      updates.ocrUpscale = ocrUpscale;
    }
    if (ocrDenoise !== null && ocrDenoise !== settings?.ocrDenoise) {
      updates.ocrDenoise = ocrDenoise;
    }
    if (ocrDeskew !== null && ocrDeskew !== settings?.ocrDeskew) {
      updates.ocrDeskew = ocrDeskew;
    }
    
    if (Object.keys(updates).length > 0) {
      updateMutation.mutate(updates);
    }
  };

  const currentValue = fuzzyVariations ?? settings?.fuzzySearchVariations ?? 2;
  const hasChanges = settings && (
    (fuzzyVariations !== null && fuzzyVariations !== settings.fuzzySearchVariations) ||
    (ocrEngineMode !== null && ocrEngineMode !== settings.ocrEngineMode) ||
    (ocrPsmConfig1 !== null && ocrPsmConfig1 !== settings.ocrPsmConfig1) ||
    (ocrPsmConfig2 !== null && ocrPsmConfig2 !== settings.ocrPsmConfig2) ||
    (ocrPreprocessing !== null && ocrPreprocessing !== settings.ocrPreprocessing) ||
    (ocrUpscale !== null && ocrUpscale !== settings.ocrUpscale) ||
    (ocrDenoise !== null && ocrDenoise !== settings.ocrDenoise) ||
    (ocrDeskew !== null && ocrDeskew !== settings.ocrDeskew)
  );

  return (
    <div className="space-y-6">
      <div className="flex gap-8">
        <pre className="ascii-art text-xl hidden md:block">
{`╔═══════╗
║ ╔═══╗ ║
║ ║ ⚙ ║ ║
║ ╚═══╝ ║
╚═══════╝`}
        </pre>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            <span className="headline-highlight">SYSTEM SETTINGS</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            &gt; Configure search behavior and system parameters_
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Search Settings */}
        <Card className="p-6">
          <div className="flex items-start gap-3 mb-6">
            <pre className="ascii-art text-sm opacity-80">
{`╔═══╗
║ ? ║
╚═══╝`}
            </pre>
            <div>
              <h2 className="text-lg font-semibold">
                <span className="headline-highlight">FUZZY SEARCH</span>
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                Configure search matching tolerance
              </p>
            </div>
          </div>

          {isLoading ? (
            <div className="text-sm text-muted-foreground">Loading settings...</div>
          ) : (
            <div className="space-y-6">
              <div className="space-y-4">
                <Label className="text-sm font-medium">
                  Character Variation Tolerance
                </Label>
                <p className="text-xs text-muted-foreground">
                  Maximum number of character differences allowed in fuzzy search matches
                </p>

                <RadioGroup
                  value={currentValue.toString()}
                  onValueChange={(value) => setFuzzyVariations(parseInt(value))}
                  data-testid="radiogroup-fuzzy-variations"
                >
                  <div className="flex items-start space-x-3 p-3 rounded-md hover-elevate active-elevate-2">
                    <RadioGroupItem value="1" id="variation-1" data-testid="radio-variation-1" />
                    <div className="flex-1 space-y-1">
                      <Label htmlFor="variation-1" className="font-medium cursor-pointer">
                        1 Character Variation
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Strictest matching - only very similar words (e.g., "Troop" matches "Troo")
                      </p>
                      <div className="flex gap-2 flex-wrap mt-2">
                        <Badge variant="secondary" className="text-xs">
                          Precision: High
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3 p-3 rounded-md hover-elevate active-elevate-2">
                    <RadioGroupItem value="2" id="variation-2" data-testid="radio-variation-2" />
                    <div className="flex-1 space-y-1">
                      <Label htmlFor="variation-2" className="font-medium cursor-pointer">
                        2 Character Variations
                        {currentValue === 2 && (
                          <Badge variant="outline" className="ml-2">
                            <Check className="h-3 w-3 mr-1" />
                            Default
                          </Badge>
                        )}
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Balanced matching - moderate tolerance (e.g., "jack" matches "back", "hack", "Jace")
                      </p>
                      <div className="flex gap-2 flex-wrap mt-2">
                        <Badge variant="secondary" className="text-xs">
                          Precision: Medium
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          Recall: Medium
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3 p-3 rounded-md hover-elevate active-elevate-2">
                    <RadioGroupItem value="3" id="variation-3" data-testid="radio-variation-3" />
                    <div className="flex-1 space-y-1">
                      <Label htmlFor="variation-3" className="font-medium cursor-pointer">
                        3 Character Variations
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Loosest matching - high tolerance (e.g., "jack" matches "black", "smack")
                      </p>
                      <div className="flex gap-2 flex-wrap mt-2">
                        <Badge variant="secondary" className="text-xs">
                          Recall: High
                        </Badge>
                      </div>
                    </div>
                  </div>
                </RadioGroup>
              </div>

              <div className="pt-4 border-t">
                <div className="flex items-center gap-3">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-xs font-medium">Current Setting</p>
                    <p className="text-xs text-muted-foreground">
                      {currentValue === 1 && "Strict matching - 1 character variation"}
                      {currentValue === 2 && "Balanced matching - 2 character variations"}
                      {currentValue === 3 && "Loose matching - 3 character variations"}
                    </p>
                  </div>
                  {hasChanges && (
                    <Badge variant="outline" className="text-primary">
                      Unsaved
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* Info Card */}
        <Card className="p-6">
          <div className="flex items-start gap-3 mb-6">
            <pre className="ascii-art text-sm opacity-80">
{`╔═══╗
║ ℹ ║
╚═══╝`}
            </pre>
            <div>
              <h2 className="text-lg font-semibold">
                <span className="headline-highlight">ABOUT FUZZY SEARCH</span>
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                How fuzzy search works
              </p>
            </div>
          </div>

          <div className="space-y-4 text-sm">
            <div className="space-y-2">
              <h3 className="font-medium">What is Fuzzy Search?</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Fuzzy search finds words that are similar to your search term, even if they're not exact matches. 
                This is useful for OCR text which may contain errors or variations.
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="font-medium">Examples</h3>
              <div className="space-y-2">
                <div className="p-2 rounded bg-muted/30">
                  <p className="text-xs font-mono">
                    Search: <span className="text-primary">"Roster"</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    → Matches: "Roser", "Moster", "oster"
                  </p>
                </div>
                <div className="p-2 rounded bg-muted/30">
                  <p className="text-xs font-mono">
                    Search: <span className="text-primary">"Cavalry"</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    → Matches: "Cavalr", "Cavaley"
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="font-medium">How to Choose</h3>
              <ul className="text-xs text-muted-foreground space-y-1.5 list-disc list-inside">
                <li>Use <strong>1 variation</strong> for clean, high-quality scans</li>
                <li>Use <strong>2 variations</strong> for most documents (recommended)</li>
                <li>Use <strong>3 variations</strong> for poor quality or degraded scans</li>
              </ul>
            </div>
          </div>
        </Card>
      </div>

      {/* OCR Settings Section */}
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">
            <span className="headline-highlight">OCR ENGINE CONFIG</span>
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            &gt; Configure Tesseract OCR processing parameters_
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* OCR Engine Settings */}
          <Card className="p-6">
            <div className="flex items-start gap-3 mb-6">
              <pre className="ascii-art text-sm opacity-80">
{`╔═══╗
║OCR║
╚═══╝`}
              </pre>
              <div>
                <h3 className="text-lg font-semibold">
                  <span className="headline-highlight">ENGINE MODE</span>
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Tesseract OCR Engine Selection
                </p>
              </div>
            </div>

            {isLoading ? (
              <div className="text-sm text-muted-foreground">Loading settings...</div>
            ) : (
              <div className="space-y-4">
                <RadioGroup
                  value={(ocrEngineMode ?? settings?.ocrEngineMode ?? 1).toString()}
                  onValueChange={(value) => setOcrEngineMode(parseInt(value))}
                  data-testid="radiogroup-ocr-engine"
                >
                  <div className="flex items-start space-x-3 p-3 rounded-md hover-elevate active-elevate-2">
                    <RadioGroupItem value="1" id="oem-1" data-testid="radio-oem-1" />
                    <div className="flex-1 space-y-1">
                      <Label htmlFor="oem-1" className="font-medium cursor-pointer">
                        LSTM Neural Network Only
                        {(ocrEngineMode ?? settings?.ocrEngineMode) === 1 && (
                          <Badge variant="outline" className="ml-2">
                            <Check className="h-3 w-3 mr-1" />
                            Recommended
                          </Badge>
                        )}
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Best for scanned documents - Uses deep learning LSTM engine for highest accuracy
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3 p-3 rounded-md hover-elevate active-elevate-2">
                    <RadioGroupItem value="3" id="oem-3" data-testid="radio-oem-3" />
                    <div className="flex-1 space-y-1">
                      <Label htmlFor="oem-3" className="font-medium cursor-pointer">
                        Default (Auto-select)
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Let Tesseract choose between Legacy + LSTM based on available models
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3 p-3 rounded-md hover-elevate active-elevate-2">
                    <RadioGroupItem value="0" id="oem-0" data-testid="radio-oem-0" />
                    <div className="flex-1 space-y-1">
                      <Label htmlFor="oem-0" className="font-medium cursor-pointer">
                        Legacy Engine Only
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Classic character-by-character matching (not recommended for modern scans)
                      </p>
                    </div>
                  </div>
                </RadioGroup>
              </div>
            )}
          </Card>

          {/* Page Segmentation Modes */}
          <Card className="p-6">
            <div className="flex items-start gap-3 mb-6">
              <pre className="ascii-art text-sm opacity-80">
{`╔═══╗
║PSM║
╚═══╝`}
              </pre>
              <div>
                <h3 className="text-lg font-semibold">
                  <span className="headline-highlight">PAGE SEGMENTATION</span>
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Dual configuration for verification
                </p>
              </div>
            </div>

            {isLoading ? (
              <div className="text-sm text-muted-foreground">Loading settings...</div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Configuration 1 (PSM Mode)</Label>
                  <RadioGroup
                    value={(ocrPsmConfig1 ?? settings?.ocrPsmConfig1 ?? 6).toString()}
                    onValueChange={(value) => setOcrPsmConfig1(parseInt(value))}
                    data-testid="radiogroup-psm-config1"
                  >
                    <div className="flex items-center space-x-2 p-2 rounded hover-elevate">
                      <RadioGroupItem value="6" id="psm1-6" />
                      <Label htmlFor="psm1-6" className="text-xs cursor-pointer flex-1">
                        PSM 6: Single uniform text block (default, best for clean documents)
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2 p-2 rounded hover-elevate">
                      <RadioGroupItem value="3" id="psm1-3" />
                      <Label htmlFor="psm1-3" className="text-xs cursor-pointer flex-1">
                        PSM 3: Fully automatic page segmentation
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2 p-2 rounded hover-elevate">
                      <RadioGroupItem value="4" id="psm1-4" />
                      <Label htmlFor="psm1-4" className="text-xs cursor-pointer flex-1">
                        PSM 4: Single column of text
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Configuration 2 (PSM Mode)</Label>
                  <RadioGroup
                    value={(ocrPsmConfig2 ?? settings?.ocrPsmConfig2 ?? 3).toString()}
                    onValueChange={(value) => setOcrPsmConfig2(parseInt(value))}
                    data-testid="radiogroup-psm-config2"
                  >
                    <div className="flex items-center space-x-2 p-2 rounded hover-elevate">
                      <RadioGroupItem value="3" id="psm2-3" />
                      <Label htmlFor="psm2-3" className="text-xs cursor-pointer flex-1">
                        PSM 3: Fully automatic page segmentation (default)
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2 p-2 rounded hover-elevate">
                      <RadioGroupItem value="6" id="psm2-6" />
                      <Label htmlFor="psm2-6" className="text-xs cursor-pointer flex-1">
                        PSM 6: Single uniform text block
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2 p-2 rounded hover-elevate">
                      <RadioGroupItem value="1" id="psm2-1" />
                      <Label htmlFor="psm2-1" className="text-xs cursor-pointer flex-1">
                        PSM 1: Automatic with orientation/script detection
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
              </div>
            )}
          </Card>

          {/* Preprocessing Settings */}
          <Card className="p-6">
            <div className="flex items-start gap-3 mb-6">
              <pre className="ascii-art text-sm opacity-80">
{`╔═══╗
║IMG║
╚═══╝`}
              </pre>
              <div>
                <h3 className="text-lg font-semibold">
                  <span className="headline-highlight">IMAGE PREPROCESSING</span>
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  OpenCV-based image enhancement
                </p>
              </div>
            </div>

            {isLoading ? (
              <div className="text-sm text-muted-foreground">Loading settings...</div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded hover-elevate">
                  <div className="space-y-1">
                    <Label htmlFor="enable-preprocessing" className="font-medium cursor-pointer">
                      Enable Preprocessing
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Master switch for all image preprocessing
                    </p>
                  </div>
                  <Switch
                    id="enable-preprocessing"
                    checked={(ocrPreprocessing ?? settings?.ocrPreprocessing) === 1}
                    onCheckedChange={(checked) => setOcrPreprocessing(checked ? 1 : 0)}
                    data-testid="switch-preprocessing"
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded hover-elevate">
                  <div className="space-y-1">
                    <Label htmlFor="enable-upscale" className="font-medium cursor-pointer">
                      Upscale Images (1.5x)
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Improves recognition of small text
                    </p>
                  </div>
                  <Switch
                    id="enable-upscale"
                    checked={(ocrUpscale ?? settings?.ocrUpscale) === 1}
                    onCheckedChange={(checked) => setOcrUpscale(checked ? 1 : 0)}
                    disabled={(ocrPreprocessing ?? settings?.ocrPreprocessing) === 0}
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded hover-elevate">
                  <div className="space-y-1">
                    <Label htmlFor="enable-denoise" className="font-medium cursor-pointer">
                      Denoise Images
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Remove noise using median blur filter
                    </p>
                  </div>
                  <Switch
                    id="enable-denoise"
                    checked={(ocrDenoise ?? settings?.ocrDenoise) === 1}
                    onCheckedChange={(checked) => setOcrDenoise(checked ? 1 : 0)}
                    disabled={(ocrPreprocessing ?? settings?.ocrPreprocessing) === 0}
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded hover-elevate">
                  <div className="space-y-1">
                    <Label htmlFor="enable-deskew" className="font-medium cursor-pointer">
                      Auto-Deskew
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Automatically correct rotated/skewed images
                    </p>
                  </div>
                  <Switch
                    id="enable-deskew"
                    checked={(ocrDeskew ?? settings?.ocrDeskew) === 1}
                    onCheckedChange={(checked) => setOcrDeskew(checked ? 1 : 0)}
                    disabled={(ocrPreprocessing ?? settings?.ocrPreprocessing) === 0}
                  />
                </div>
              </div>
            )}
          </Card>

          {/* OCR Info Card */}
          <Card className="p-6">
            <div className="flex items-start gap-3 mb-6">
              <pre className="ascii-art text-sm opacity-80">
{`╔═══╗
║ ℹ ║
╚═══╝`}
              </pre>
              <div>
                <h3 className="text-lg font-semibold">
                  <span className="headline-highlight">ABOUT OCR ENGINE</span>
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Understanding Tesseract 5.x
                </p>
              </div>
            </div>

            <div className="space-y-4 text-sm">
              <div className="space-y-2">
                <h3 className="font-medium">Tesseract 5.3.4</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Your system uses <strong>Tesseract 5.3.4</strong> with LSTM (Long Short-Term Memory) neural networks for superior text recognition accuracy compared to legacy pattern matching.
                </p>
              </div>

              <div className="space-y-2">
                <h3 className="font-medium">Dual Verification</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  OCRSenseiWeb runs two OCR passes with different PSM modes and selects the result with higher confidence, ensuring maximum accuracy for diverse document types.
                </p>
              </div>

              <div className="space-y-2">
                <h3 className="font-medium">Preprocessing Benefits</h3>
                <ul className="text-xs text-muted-foreground space-y-1.5 list-disc list-inside">
                  <li><strong>Upscaling</strong> helps with small or low-DPI text</li>
                  <li><strong>Denoising</strong> removes scan artifacts and speckles</li>
                  <li><strong>Deskewing</strong> fixes rotated or tilted pages</li>
                  <li><strong>Binarization</strong> converts to high-contrast black/white</li>
                </ul>
              </div>

              <div className="p-3 rounded bg-primary/10 border border-primary/20">
                <p className="text-xs">
                  <strong className="text-primary">Recommendation:</strong> Use OEM 1 (LSTM) with preprocessing enabled for best results on scanned documents.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 pt-4">
        <pre className="ascii-art text-sm opacity-70 hidden md:block">
{`[TERMINAL] ${hasChanges ? "Unsaved changes detected" : "Configuration loaded successfully"}`}
        </pre>
        <Button 
          onClick={handleSave}
          disabled={!hasChanges || updateMutation.isPending}
          data-testid="button-save-settings"
        >
          <Save className="h-4 w-4 mr-2" />
          {updateMutation.isPending ? "Saving..." : "Save Configuration"}
        </Button>
      </div>
    </div>
  );
}
