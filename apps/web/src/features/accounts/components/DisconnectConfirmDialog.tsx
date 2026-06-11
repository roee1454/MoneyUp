import { CircleNotch } from '@phosphor-icons/react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { getBankName } from '@money-up/common';

interface DisconnectConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bankId: string | null;
  isDisconnecting: boolean;
  onConfirm: () => void;
}

export function DisconnectConfirmDialog({
  open,
  onOpenChange,
  bankId,
  isDisconnecting,
  onConfirm,
}: DisconnectConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-md bg-card border border-border rounded-none p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200"
        dir="rtl"
        showCloseButton={false}
      >
        <DialogHeader className="text-right space-y-1 pb-4 border-b border-border">
          <DialogTitle className="text-lg font-black text-foreground uppercase tracking-tight">
            ניתוק חיבור פיננסי
          </DialogTitle>
          <DialogDescription className="text-xs font-semibold text-muted-foreground leading-relaxed">
            האם אתה בטוח שברצונך לנתק את החיבור ל-{bankId ? getBankName(bankId) : ''}? כל הנתונים השמורים, החשבונות וכרטיסי האשראי המשויכים אליו יוסרו מהמערכת לצמיתות.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="pt-4 flex flex-row justify-end gap-3">
          <Button
            variant="outline"
            className="rounded-none font-bold text-xs h-10 border-border cursor-pointer uppercase tracking-widest"
            onClick={() => onOpenChange(false)}
            disabled={isDisconnecting}
          >
            ביטול
          </Button>
          <Button
            className="rounded-none font-black text-xs h-10 bg-destructive hover:bg-destructive/90 text-destructive-foreground cursor-pointer uppercase tracking-widest px-6 shadow-lg shadow-destructive/10"
            disabled={isDisconnecting}
            onClick={onConfirm}
          >
            {isDisconnecting ? (
              <CircleNotch className="h-4 w-4 animate-spin" />
            ) : (
              'נתק ומחק נתונים'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
