import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

const pathSchema = z.object({
  path: z.string().trim().regex(/^\/|^[a-zA-Z]:\\/, 'נתיב הדפדפן חייב להיות נתיב מוחלט תקין במערכת'),
});

type PathFormValues = z.infer<typeof pathSchema>;

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
  const { control, handleSubmit, reset, formState: { errors } } = useForm<PathFormValues>({
    resolver: zodResolver(pathSchema),
    defaultValues: {
      path: '',
    },
  });

  useEffect(() => {
    if (open) {
      reset({ path: currentPath });
    }
  }, [open, currentPath, reset]);

  const onSubmit = (values: PathFormValues) => {
    onSave(values.path);
    onOpenChange(false);
  };

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
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="py-2 space-y-1.5 text-right">
            <Controller
              name="path"
              control={control}
              render={({ field }) => (
                <input
                  type="text"
                  {...field}
                  className={`h-10 w-full border bg-muted/30 px-3 text-xs font-mono font-bold focus:bg-card focus:outline-none transition-all rounded-none text-foreground ${
                    errors.path ? 'border-destructive focus:border-destructive' : 'border-border'
                  }`}
                  placeholder="/path/to/chrome-or-chromium"
                />
              )}
            />
            {errors.path && (
              <p className="text-[10px] font-bold text-destructive">
                {errors.path.message}
              </p>
            )}
          </div>
          <DialogFooter className="pt-2 flex flex-row justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              className="rounded-none font-bold text-xs h-10 border-border cursor-pointer"
              onClick={() => onOpenChange(false)}
            >
              ביטול
            </Button>
            <Button
              type="submit"
              className="rounded-none font-black text-xs h-10 bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer px-6 shadow-lg shadow-primary/10"
            >
              עדכן
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
