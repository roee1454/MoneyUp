import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface BrowserPathDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentPath: string;
  onSave: (path: string) => void;
}

export function BrowserPathDialog({
  open,
  onOpenChange,
  currentPath,
  onSave,
}: BrowserPathDialogProps) {
  const [tempPath, setTempPath] = useState(currentPath);

  useEffect(() => {
    if (open) {
      setTempPath(currentPath);
    }
  }, [open, currentPath]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-md bg-card border border-border rounded-none p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200"
        dir="rtl"
      >
        <DialogHeader className="text-right space-y-1 pb-4 border-b border-border">
          <DialogTitle className="text-lg font-black text-foreground uppercase tracking-tight">
            עדכון נתיב דפדפן
          </DialogTitle>
          <DialogDescription className="text-xs font-semibold text-muted-foreground leading-relaxed">
            הזן את נתיב ההרצה המלא של דפדפן Chromium במערכת שלך.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <input
            type="text"
            value={tempPath}
            onChange={(e) => setTempPath(e.target.value)}
            className="h-10 w-full border border-border bg-muted/30 px-3 text-xs font-mono font-bold focus:bg-card focus:outline-none transition-all rounded-none text-foreground"
            placeholder="/path/to/chrome-or-chromium"
          />
        </div>
        <DialogFooter className="pt-4 flex flex-row justify-end gap-3">
          <Button
            variant="outline"
            className="rounded-none font-bold text-xs h-10 border-border cursor-pointer"
            onClick={() => onOpenChange(false)}
          >
            ביטול
          </Button>
          <Button
            className="rounded-none font-black text-xs h-10 bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer px-6 shadow-lg shadow-primary/10"
            onClick={() => {
              onSave(tempPath);
              onOpenChange(false);
            }}
          >
            עדכן
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
