import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch as ToggleSwitch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { 
  Settings as SettingsIcon, 
  Database, 
  Cpu, 
  HardDrive,
  Gauge,
  Save
} from "lucide-react";

export default function Settings() {
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
            &gt; Configure OCR processing and system parameters_
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* OCR Processing Settings */}
        <Card className="p-6">
          <div className="flex items-start gap-3 mb-6">
            <pre className="ascii-art text-sm opacity-80">
{`┌─────┐
│ CPU │
└─────┘`}
            </pre>
            <div>
              <h2 className="text-lg font-semibold">
                <span className="headline-highlight">OCR PROCESSING</span>
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                Configure text extraction engines
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <Label htmlFor="pytesseract-enabled" className="text-sm font-medium">
                  Pytesseract Engine
                </Label>
                <p className="text-xs text-muted-foreground">
                  Enable Tesseract OCR processing
                </p>
              </div>
              <ToggleSwitch 
                id="pytesseract-enabled" 
                defaultChecked 
                data-testid="switch-pytesseract"
              />
            </div>

            <div className="flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <Label htmlFor="easyocr-enabled" className="text-sm font-medium">
                  EasyOCR Engine
                </Label>
                <p className="text-xs text-muted-foreground">
                  Enable deep learning OCR processing
                </p>
              </div>
              <ToggleSwitch 
                id="easyocr-enabled" 
                defaultChecked 
                data-testid="switch-easyocr"
              />
            </div>

            <div className="space-y-2 pt-2">
              <Label htmlFor="confidence-threshold" className="text-sm font-medium">
                Minimum Confidence Threshold
              </Label>
              <div className="flex items-center gap-3">
                <Input
                  id="confidence-threshold"
                  type="number"
                  min="0"
                  max="100"
                  defaultValue="80"
                  className="w-24"
                  data-testid="input-confidence"
                />
                <span className="text-sm text-muted-foreground">%</span>
                <Badge variant="secondary" className="ml-auto">
                  <Gauge className="h-3 w-3 mr-1" />
                  Default: 80%
                </Badge>
              </div>
            </div>
          </div>
        </Card>

        {/* Database Settings */}
        <Card className="p-6">
          <div className="flex items-start gap-3 mb-6">
            <pre className="ascii-art text-sm opacity-80">
{`┌──────┐
│  DB  │
└──────┘`}
            </pre>
            <div>
              <h2 className="text-lg font-semibold">
                <span className="headline-highlight">DATABASE</span>
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                PostgreSQL connection settings
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="db-host" className="text-sm font-medium">
                Database Host
              </Label>
              <Input
                id="db-host"
                type="text"
                placeholder="localhost"
                defaultValue="localhost"
                data-testid="input-db-host"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="db-port" className="text-sm font-medium">
                Port
              </Label>
              <Input
                id="db-port"
                type="number"
                placeholder="5432"
                defaultValue="5432"
                data-testid="input-db-port"
              />
            </div>

            <div className="flex items-center justify-between gap-4 pt-2">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Connection Status</Label>
                <p className="text-xs text-muted-foreground">
                  Database connectivity
                </p>
              </div>
              <Badge variant="outline" className="text-primary">
                <Database className="h-3 w-3 mr-1" />
                Connected
              </Badge>
            </div>
          </div>
        </Card>

        {/* Storage Settings */}
        <Card className="p-6">
          <div className="flex items-start gap-3 mb-6">
            <pre className="ascii-art text-sm opacity-80">
{`┌───────┐
│  HDD  │
└───────┘`}
            </pre>
            <div>
              <h2 className="text-lg font-semibold">
                <span className="headline-highlight">STORAGE</span>
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                File storage and cache settings
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="storage-path" className="text-sm font-medium">
                Image Storage Path
              </Label>
              <Input
                id="storage-path"
                type="text"
                placeholder="/data/images"
                defaultValue="/data/images"
                data-testid="input-storage-path"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cache-size" className="text-sm font-medium">
                Cache Size Limit (MB)
              </Label>
              <Input
                id="cache-size"
                type="number"
                placeholder="1024"
                defaultValue="1024"
                data-testid="input-cache-size"
              />
            </div>

            <div className="flex items-center justify-between gap-4 pt-2">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Disk Usage</Label>
                <p className="text-xs text-muted-foreground">
                  Current storage utilization
                </p>
              </div>
              <Badge variant="secondary">
                <HardDrive className="h-3 w-3 mr-1" />
                2.4 GB / 10 GB
              </Badge>
            </div>
          </div>
        </Card>

        {/* Performance Settings */}
        <Card className="p-6">
          <div className="flex items-start gap-3 mb-6">
            <pre className="ascii-art text-sm opacity-80">
{`┌─────────┐
│  PERF   │
└─────────┘`}
            </pre>
            <div>
              <h2 className="text-lg font-semibold">
                <span className="headline-highlight">PERFORMANCE</span>
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                Processing and concurrency settings
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="worker-threads" className="text-sm font-medium">
                Worker Threads
              </Label>
              <Input
                id="worker-threads"
                type="number"
                min="1"
                max="16"
                placeholder="4"
                defaultValue="4"
                data-testid="input-worker-threads"
              />
              <p className="text-xs text-muted-foreground">
                Number of concurrent processing threads
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="batch-size" className="text-sm font-medium">
                Batch Size
              </Label>
              <Input
                id="batch-size"
                type="number"
                min="1"
                max="100"
                placeholder="10"
                defaultValue="10"
                data-testid="input-batch-size"
              />
              <p className="text-xs text-muted-foreground">
                Images processed per batch
              </p>
            </div>

            <div className="flex items-center justify-between gap-4 pt-2">
              <div className="space-y-0.5">
                <Label htmlFor="auto-process" className="text-sm font-medium">
                  Auto-process on Upload
                </Label>
                <p className="text-xs text-muted-foreground">
                  Start OCR immediately after upload
                </p>
              </div>
              <ToggleSwitch 
                id="auto-process" 
                data-testid="switch-auto-process"
              />
            </div>
          </div>
        </Card>
      </div>

      <div className="flex items-center justify-between gap-4 pt-4">
        <pre className="ascii-art text-sm opacity-70 hidden md:block">
{`[TERMINAL] Configuration loaded successfully`}
        </pre>
        <Button data-testid="button-save-settings">
          <Save className="h-4 w-4 mr-2" />
          Save Configuration
        </Button>
      </div>
    </div>
  );
}
