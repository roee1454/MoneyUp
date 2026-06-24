import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { PremiumInput } from '@/components/ui/premium-input';
import { Button } from '@/components/ui/button';
import type { User } from '@/hooks/useUsers';

const unlockFormSchema = z.object({
  unlockKey: z.string().trim().min(1, 'חובה להזין קוד פתיחה'),
});

type UnlockFormValues = z.infer<typeof unlockFormSchema>;

interface UnlockProfileDialogProps {
  target: User | null;
  onClose: () => void;
  unlockError: string;
  onUnlock: (key: string) => void;
  isPending: boolean;
}

export function UnlockProfileDialog({
  target,
  onClose,
  unlockError,
  onUnlock,
  isPending,
}: UnlockProfileDialogProps) {
  const { control, handleSubmit, reset } = useForm<UnlockFormValues>({
    resolver: zodResolver(unlockFormSchema),
    defaultValues: {
      unlockKey: '',
    },
  });

  useEffect(() => {
    if (target) {
      reset({ unlockKey: '' });
    }
  }, [target, reset]);

  const onSubmit = (values: UnlockFormValues) => {
    onUnlock(values.unlockKey);
  };

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
          <DialogDescription className="text-xs font-semibold text-muted-foreground">
            הזן קוד פתיחה עבור {target?.username}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 pt-4">
          <Controller
            name="unlockKey"
            control={control}
            render={({ field }) => (
              <PremiumInput
                {...field}
                isPassword
                placeholder="קוד פתיחה כאן..."
                className="w-full h-12 bg-muted/50 border border-border rounded-none"
                disabled={isPending}
              />
            )}
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
              className="rounded-none font-bold text-xs h-10 border-border cursor-pointer"
              onClick={onClose}
            >
              ביטול
            </Button>
            <Button
              type="submit"
              className="rounded-none font-black text-xs h-10 bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer px-6"
              disabled={isPending}
            >
              {isPending ? 'משחרר...' : 'שחרר והתחבר'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
