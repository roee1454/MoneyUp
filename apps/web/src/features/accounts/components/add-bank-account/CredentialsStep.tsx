import { useForm, Controller } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import {
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { PremiumInput } from '@/components/ui/premium-input';
import { BankIcon } from '../BankIcon';
import { LOGIN_FIELD_LABELS } from './constants';
import type { ScraperListItem } from './types';

interface CredentialsStepProps {
  selectedBank: ScraperListItem;
  onSubmit: (values: Record<string, string>) => void;
  onBack: () => void;
  errorMsg: string | null;
  isConnecting: boolean;
}

/** Login credentials form for the selected bank scraper using react-hook-form. */
export function CredentialsStep({
  selectedBank,
  onSubmit,
  onBack,
  errorMsg,
  isConnecting,
}: CredentialsStepProps) {
  const { control, handleSubmit } = useForm<Record<string, string>>({
    defaultValues: selectedBank.loginFields.reduce((acc, field) => ({ ...acc, [field]: '' }), {}),
  });

  return (
    <div className="animate-in fade-in-50 duration-200 slide-in-from-bottom-2 space-y-4">
      <DialogHeader className="text-right space-y-1 pb-4 border-b border-border">
        <div className="flex items-center gap-3">
          <BankIcon bankId={selectedBank.id} size="md" />
          <div>
            <DialogTitle className="text-lg font-black text-foreground">
              התחברות ל{selectedBank.name}
            </DialogTitle>
            <DialogDescription className="text-xs font-semibold text-muted-foreground">
              יש להזין את פרטי ההזדהות של חשבונך
            </DialogDescription>
          </div>
        </div>
      </DialogHeader>

      <div className="bg-muted/40 border border-border p-3 text-xs leading-relaxed text-muted-foreground rounded-none animate-in fade-in-50 duration-150">
        <span>
          פרטי ההתחברות אינם מועברים לשום צד שלישי. הם מוצפן באופן מקומי
          על המחשב שלך בלבד!
        </span>
      </div>
      

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-4">
        {selectedBank.loginFields.map((field: string) => {
          const meta = LOGIN_FIELD_LABELS[field];
          const label = meta?.label ?? field;
          const type = meta?.type ?? 'text';

          return (
            <div key={field} className="space-y-1.5 text-right">
              <Label
                htmlFor={field}
                className="text-sm font-bold text-muted-foreground block"
              >
                {label}
              </Label>
              <Controller
                name={field}
                control={control}
                rules={{ required: true }}
                render={({ field: inputField }) => (
                  <PremiumInput
                    {...inputField}
                    id={field}
                    isPassword={type === 'password'}
                    required
                    dir="rtl"
                  />
                )}
              />
            </div>
          );
        })}
        
        {errorMsg && (
          <p className="text-[11px] font-bold text-destructive mt-2 bg-destructive/10 p-2.5 border border-destructive/20 text-right">
            {errorMsg}
          </p>
        )}

        <div className="flex items-center gap-3 pt-4 justify-end">
          <Button
            type="button"
            variant="outline"
            className="rounded-none font-bold text-xs h-10 border-border cursor-pointer"
            onClick={onBack}
          >
            חזרה לרשימה
          </Button>
          <Button
            type="submit"
            className="rounded-none font-bold text-xs h-10 bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer"
            disabled={isConnecting}
          >
            סנכרן חשבון
          </Button>
        </div>
      </form>
    </div>
  );
}
