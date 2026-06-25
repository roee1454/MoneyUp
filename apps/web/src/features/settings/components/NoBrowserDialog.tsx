import { useNavigate } from '@tanstack/react-router';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { PremiumButton } from '@/components/ui/premium-button';
import { Warning, ArrowLeft } from '@phosphor-icons/react';

interface NoBrowserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Modal shown when no Chromium browser is detected on the system.
 * Guides the user to the scraper settings page to install one.
 */
export function NoBrowserDialog({ open, onOpenChange }: NoBrowserDialogProps) {
  const navigate = useNavigate();

  const handleGoToSettings = () => {
    onOpenChange(false);
    navigate({ to: '/settings/scrapers' });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="rounded-none border border-border bg-card text-foreground max-w-sm shadow-2xl p-6 text-right"
        dir="rtl"
      >
        <DialogHeader className="text-right space-y-1 pb-4 border-b border-border/40">
          <div className="flex items-center gap-3 pb-1">
            <div className="h-10 w-10 rounded-none bg-destructive/10 border border-destructive/20 flex items-center justify-center shrink-0">
              <Warning className="h-5 w-5 text-destructive" weight="fill" />
            </div>
            <DialogTitle className="text-base font-black tracking-tight text-foreground">
              נדרש דפדפן Chromium
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
            המערכת לא מצאה דפדפן Chromium מותקן על המחשב שלך. דפדפן זה נדרש
            כדי לגשת ולסנכרן נתוני חשבון בנק ואשראי.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-3">
          <p className="text-xs font-semibold text-foreground leading-relaxed">
            ניתן להתקין את הדפדפן באופן אוטומטי ישירות מהגדרות הסורק, ללא צורך
            בהתקנה ידנית.
          </p>
          <p className="text-[11px] text-muted-foreground">
            אם אתה מעדיף להתקין ידנית, ניתן{' '}
            <a
              href="https://www.chromium.org/getting-involved/download-chromium/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 text-primary hover:text-primary/80 transition-colors"
            >
              להוריד Chromium כאן
            </a>
            .
          </p>
        </div>

        <div className="flex items-center justify-end gap-2.5 border-t border-border/40 pt-4">
          <PremiumButton
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="h-9 px-4 rounded-none text-xs font-black"
          >
            ביטול
          </PremiumButton>
          <PremiumButton
            type="button"
            onClick={handleGoToSettings}
            className="h-9 px-5 rounded-none text-xs font-black gap-1.5"
          >
            <span>עבור להגדרות הסורק</span>
            <ArrowLeft className="h-3.5 w-3.5" weight="bold" />
          </PremiumButton>
        </div>
      </DialogContent>
    </Dialog>
  );
}
