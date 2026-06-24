import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { PremiumInput } from '@/components/ui/premium-input';
import { BankIcon } from '../BankIcon';
import { OTP_MIN_LENGTH, OTP_MAX_LENGTH } from './constants';
import type { ScraperListItem } from './types';

const otpSchema = z.object({
  otpCode: z.string().trim().min(OTP_MIN_LENGTH, `קוד האימות חייב להיות לפחות ${OTP_MIN_LENGTH} תווים`),
});

type OtpFormValues = z.infer<typeof otpSchema>;

interface OtpChallengeStepProps {
  selectedBank: ScraperListItem;
  onSubmit: (code: string) => void;
  onBack: () => void;
  challengeMsg: string;
  errorMsg: string | null;
  isConnecting: boolean;
}

/** OTP / 2FA challenge entry screen with provider-agnostic length validation using react-hook-form. */
export function OtpChallengeStep({
  selectedBank,
  onSubmit,
  onBack,
  challengeMsg,
  errorMsg,
  isConnecting,
}: OtpChallengeStepProps) {
  const { control, handleSubmit, watch } = useForm<OtpFormValues>({
    resolver: zodResolver(otpSchema),
    defaultValues: {
      otpCode: '',
    },
  });

  const otpCode = watch('otpCode') || '';
  const isOtpValid = otpCode.length >= OTP_MIN_LENGTH;

  const handleFormSubmit = (values: OtpFormValues) => {
    onSubmit(values.otpCode);
  };

  return (
    <div className="animate-in fade-in-50 duration-200 slide-in-from-bottom-2 space-y-4">
      <DialogHeader className="text-right space-y-1 pb-4 border-b border-border">
        <div className="flex items-center gap-3">
          <BankIcon bankId={selectedBank.id} size="md" />
          <div>
            <DialogTitle className="text-lg font-black text-foreground">
              אימות דו-שלבי
            </DialogTitle>
            <DialogDescription className="text-xs font-semibold text-muted-foreground">
              {selectedBank.name} דורש קוד אימות נוסף
            </DialogDescription>
          </div>
        </div>
      </DialogHeader>

      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4 pt-4">
        <div className="space-y-2 text-right">
          <p className="text-xs font-semibold text-muted-foreground leading-relaxed">
            {challengeMsg}
          </p>
          <div className="pt-2 pb-2 flex justify-center" dir="ltr">
            <Controller
              name="otpCode"
              control={control}
              render={({ field: { value, onChange, ...fieldProps } }) => (
                <PremiumInput
                  {...fieldProps}
                  value={value}
                  onChange={(e) =>
                    onChange(e.target.value.replace(/\D/g, '').slice(0, OTP_MAX_LENGTH))
                  }
                  type="text"
                  inputMode="numeric"
                  autoFocus
                  className="text-center tracking-[0.35em] font-bold text-lg"
                />
              )}
            />
          </div>
          {errorMsg && (
            <p className="text-[11px] font-bold text-destructive mt-2 bg-destructive/10 p-2.5 border border-destructive/20 text-center">
              {errorMsg}
            </p>
          )}
          {selectedBank.id === 'max' && (
            <p className="text-[10px] font-semibold text-muted-foreground text-center pt-2">
              לצורך הבדיקה, הזן את הקוד:{' '}
              <span className="font-bold text-foreground">123456</span>
            </p>
          )}
        </div>

        <div className="flex items-center gap-3 pt-4 justify-end">
          <Button
            type="button"
            variant="outline"
            className="rounded-none font-bold text-xs h-10 border-border cursor-pointer"
            onClick={onBack}
            disabled={isConnecting}
          >
            חזרה
          </Button>
          <Button
            type="submit"
            className="rounded-none font-bold text-xs h-10 bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer"
            disabled={isConnecting || !isOtpValid}
          >
            {isConnecting ? 'מאמת...' : 'אשר קוד'}
          </Button>
        </div>
      </form>
    </div>
  );
}
