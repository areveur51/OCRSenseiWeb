import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FolderEdit } from "lucide-react";

interface EditDirectoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  directoryName: string;
  projectName: string;
  onSave: (newName: string) => void;
}

export function EditDirectoryDialog({
  open,
  onOpenChange,
  directoryName,
  projectName,
  onSave,
}: EditDirectoryDialogProps) {
  const [newName, setNewName] = useState(directoryName);

  const handleSave = () => {
    if (newName.trim() && newName !== directoryName) {
      onSave(newName.trim());
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderEdit className="h-5 w-5 text-primary" />
            <span className="headline-highlight">EDIT DIRECTORY</span>
          </DialogTitle>
          <DialogDescription>
            &gt; Rename subdirectory in {projectName}_
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="current-name" className="text-sm">
              Current Name
            </Label>
            <Input
              id="current-name"
              value={directoryName}
              disabled
              className="font-mono text-muted-foreground"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-name" className="text-sm">
              New Name
            </Label>
            <Input
              id="new-name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Enter new directory name"
              className="font-mono"
              data-testid="input-new-directory-name"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSave();
                }
              }}
            />
          </div>

          <pre className="ascii-art text-xs opacity-60 bg-muted p-3 rounded-md">
{`┌─ ${projectName}
│  ├── ${directoryName}  →  ${newName}
│  └── ...`}
          </pre>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            data-testid="button-cancel-edit"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!newName.trim() || newName === directoryName}
            data-testid="button-save-directory"
          >
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
