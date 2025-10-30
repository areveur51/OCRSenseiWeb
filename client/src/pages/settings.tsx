import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { 
  Settings as SettingsIcon, 
  Search, 
  Save,
  Check
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Settings as SettingsType } from "@shared/schema";

export default function Settings() {
  const { toast } = useToast();
  const [fuzzyVariations, setFuzzyVariations] = useState<number | null>(null);

  const { data: settings, isLoading } = useQuery<SettingsType>({
    queryKey: ["/api/settings"],
  });

  useEffect(() => {
    if (settings && fuzzyVariations === null) {
      setFuzzyVariations(settings.fuzzySearchVariations);
    }
  }, [settings, fuzzyVariations]);

  const updateMutation = useMutation({
    mutationFn: async (updates: { fuzzySearchVariations: number }) => {
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
    if (fuzzyVariations !== null) {
      updateMutation.mutate({ fuzzySearchVariations: fuzzyVariations });
    }
  };

  const currentValue = fuzzyVariations ?? settings?.fuzzySearchVariations ?? 2;
  const hasChanges = settings && fuzzyVariations !== null && fuzzyVariations !== settings.fuzzySearchVariations;

  return (
    <div className="space-y-6">
      <div className="flex gap-8">
        <pre className="ascii-art text-xl hidden md:block">
{`╔════════════════╗
║   [CONFIG]     ║
║  ████████████  ║
║  ════════════  ║
║  ░░░░░░░░░░░░  ║
╚════════════════╝
   [SETTINGS]`}
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
{`┌────────┐
│ SEARCH │
└────────┘`}
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
{`┌──────┐
│ INFO │
└──────┘`}
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
