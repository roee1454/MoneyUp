import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { PremiumInput } from '@/components/ui/premium-input';
import { Button } from '@/components/ui/button';
import type { User } from '@/hooks/useUsers';

interface DeleteProfileDialogProps {
  target: User | null;
  onClose: () => void;
  deleteConfirmation: string;
  setDeleteConfirmation: (v: string) => void;
  deleteSuccess: boolean;
  setDeleteSuccess: (v: boolean) => void;
  onDelete: () => void;
  isPending: boolean;
}

export function DeleteProfileDialog({
  target,
  onClose,
  deleteConfirmation,
  setDeleteConfirmation,
  deleteSuccess,
  setDeleteSuccess,
  onDelete,
  isPending,
}: DeleteProfileDialogProps) {
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
        {deleteSuccess ? (
          <div className="min-h-[220px] flex flex-col items-center justify-center text-center gap-4">
            <div className="h-11 w-11 rounded-none border border-emerald-600 bg-emerald-600/10 text-emerald-600 flex items-center justify-center text-2xl font-black shadow-lg shadow-emerald-500/20">
              ✓
            </div>
            <p className="text-sm font-black text-foreground uppercase tracking-tight">
              הפרופיל נמחק בהצלחה
            </p>
            <Button
              className="rounded-none font-black text-xs h-10 bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer px-10"
              onClick={() => {
                onClose();
                setDeleteSuccess(false);
              }}
            >
              סגור
            </Button>
          </div>
        ) : (
          <>
            <DialogHeader className="text-right space-y-1 pb-4 border-b border-border">
              <DialogTitle className="text-lg font-black text-foreground uppercase tracking-tight">
                מחיקת פרופיל
              </DialogTitle>
              <DialogDescription className="text-xs font-semibold text-muted-foreground">
                כדי למחוק את הפרופיל, הקלד את מזהה הפרופיל שלו בדיוק.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 pt-4 text-right">
              <p className="text-xs font-semibold text-muted-foreground tracking-tight">
                הקלד:{' '}
                <span className="font-black text-foreground underline underline-offset-4 decoration-destructive/40 normal-case select-all">
                  {target?.id}
                </span>
              </p>
              <PremiumInput
                value={deleteConfirmation}
                onChange={(e) => setDeleteConfirmation(e.target.value)}
                placeholder="מזהה פרופיל..."
                className="w-full h-12 bg-muted/50 border border-border rounded-none"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && deleteConfirmation === target?.id) {
                    void onDelete();
                  }
                }}
              />
              <div className="flex items-center gap-3 pt-2 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-none font-bold text-xs h-10 border-border cursor-pointer"
                  onClick={onClose}
                >
                  ביטול
                </Button>
                <Button
                  type="button"
                  className="rounded-none font-black text-xs h-10 bg-destructive hover:bg-destructive/90 text-destructive-foreground cursor-pointer px-6"
                  disabled={deleteConfirmation !== target?.id || isPending}
                  onClick={() => void onDelete()}
                >
                  {isPending ? 'מוחק...' : 'מחק פרופיל'}
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
