import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { PremiumInput } from '@/components/ui/premium-input';
import { Button } from '@/components/ui/button';
import type { User } from '@/hooks/useUsers';

interface UnlockProfileDialogProps {
  target: User | null;
  onClose: () => void;
  unlockInput: string;
  setUnlockInput: (v: string) => void;
  unlockError: string;
  onUnlock: () => void;
  isPending: boolean;
}

export function UnlockProfileDialog({
  target,
  onClose,
  unlockInput,
  setUnlockInput,
  unlockError,
  onUnlock,
  isPending,
}: UnlockProfileDialogProps) {
  return (
    <Dialog
      open={!!target}
      onOpenChange={(open) => !open && onClose()}
    >
      <DialogContent
        showCloseButton={false}
        className="max-w-md bg-card border border-border rounded-none p-6 shadow-2xl"
        dir="rtl"
      >
        <DialogHeader className="text-right space-y-1 pb-4 border-b border-border">
          <DialogTitle className="text-lg font-black text-foreground uppercase tracking-tight">
            פרופיל נעול
          </DialogTitle>
          <DialogDescription className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
            הזן קוד פתיחה עבור {target?.username}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 pt-4">
          <PremiumInput
            isPassword
            value={unlockInput}
            onChange={(e) => setUnlockInput(e.target.value)}
            placeholder="קוד פתיחה כאן..."
            className="w-full h-12 bg-muted/50 border border-border rounded-none"
            onKeyDown={(e) => {
              if (e.key === 'Enter') void onUnlock();
            }}
          />
          {unlockError ? (
            <p className="text-[11px] font-bold text-destructive bg-destructive/10 p-2 border border-destructive/20 text-right uppercase">
              {unlockError}
            </p>
          ) : null}
          <div className="flex items-center gap-3 pt-2 justify-end">
            <Button
              type="button"
              variant="outline"
              className="rounded-none font-bold text-xs h-10 border-border cursor-pointer uppercase tracking-widest"
              onClick={onClose}
            >
              ביטול
            </Button>
            <Button
              type="button"
              className="rounded-none font-black text-xs h-10 bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer uppercase tracking-widest px-6"
              onClick={() => void onUnlock()}
              disabled={isPending}
            >
              {isPending ? 'משחרר...' : 'שחרר והתחבר'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
