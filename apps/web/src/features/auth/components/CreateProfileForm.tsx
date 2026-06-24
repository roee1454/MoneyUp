import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Label } from '@/components/ui/label';
import { PremiumInput } from '@/components/ui/premium-input';
import { PremiumButton } from '@/components/ui/premium-button';
import { PremiumCard } from '@/components/ui/premium-card';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, CircleNotch } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { profileCreationSchema, type ProfileCreationInput } from '@money-up/types';

interface CreateProfileFormProps {
  onSave: (data: ProfileCreationInput) => void;
  onCancel: () => void;
  showCancelButton: boolean;
  isPending?: boolean;
}

export function CreateProfileForm({
  onSave,
  onCancel,
  showCancelButton,
  isPending = false,
}: CreateProfileFormProps) {
  const shouldReduceMotion = useReducedMotion();

  const { control, handleSubmit, watch, setValue, formState: { errors } } = useForm<ProfileCreationInput>({
    resolver: zodResolver(profileCreationSchema),
    defaultValues: {
      username: '',
      lockProfile: false,
      unlockKey: '',
    },
  });

  const lockProfile = watch('lockProfile');

  // Clear unlockKey if lockProfile is unchecked
  useEffect(() => {
    if (!lockProfile) {
      setValue('unlockKey', '');
    }
  }, [lockProfile, setValue]);

  const onSubmit = (data: ProfileCreationInput) => {
    onSave(data);
  };

  return (
    <div className="mx-auto flex max-w-md items-center justify-center w-full">
      <PremiumCard className="w-full border-border bg-card shadow-md rounded-none overflow-hidden">
        {/* Form Container */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 w-full animate-in fade-in duration-300">
          
          {/* Header */}
          <div className="space-y-1 text-right w-full animate-in fade-in slide-in-from-bottom-3 duration-300">
            <h2 className="text-2xl font-black tracking-tight text-foreground uppercase">
              הוסף פרופיל חדש
            </h2>
            <p className="text-muted-foreground font-semibold text-xs uppercase tracking-widest">
              השתמש בפרופילים מקומיים לניתוח מהיר
            </p>
          </div>

          <Separator className="bg-border/50 animate-in fade-in duration-300 delay-75" />

          {/* Form Fields */}
          <div className="space-y-5 w-full">
            {/* Username Field with Shake Error */}
            <motion.div
              animate={errors.username ? { x: [-6, 6, -6, 6, -3, 3, 0] } : {}}
              transition={{ duration: 0.4 }}
              className="space-y-2 text-right animate-in fade-in slide-in-from-bottom-3 duration-300 delay-75"
            >
              <Label
                htmlFor="username"
                className="text-xs font-black uppercase tracking-widest text-muted-foreground block"
              >
                שם משתמש
              </Label>
              <Controller
                name="username"
                control={control}
                render={({ field }) => (
                  <PremiumInput
                    {...field}
                    id="username"
                    placeholder="הכנס שם משתמש..."
                    disabled={isPending}
                    className={cn(
                      errors.username && 'border-destructive focus-visible:ring-destructive',
                      'transition-all duration-200 focus-visible:scale-[1.01]'
                    )}
                  />
                )}
              />
              {errors.username && (
                <p className="text-[10px] font-bold text-destructive mt-1 uppercase">
                  {errors.username.message}
                </p>
              )}
            </motion.div>

            {/* Switch Section for Locking Profile */}
            <div className="space-y-2 border border-border/60 p-4 bg-muted/10 transition-colors duration-250 hover:bg-muted/15 animate-in fade-in slide-in-from-bottom-3 duration-300 delay-150">
              <div className="flex items-center justify-between cursor-pointer select-none">
                <span className="text-[11px] font-black uppercase tracking-widest text-foreground/80">
                  לנעול את הפרופיל?
                </span>
                
                <Controller
                  name="lockProfile"
                  control={control}
                  render={({ field: { value, onChange } }) => (
                    <Switch
                      checked={!!value}
                      onCheckedChange={(checked) => {
                        if (isPending) return;
                        onChange(checked);
                      }}
                      className="scale-90"
                    />
                  )}
                />
              </div>

              {/* Collapsible Key Fields */}
              <AnimatePresence initial={false}>
                {!!lockProfile && (
                  <motion.div
                    initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
                    transition={{ duration: 0.25, ease: 'easeInOut' }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-1.5 pt-3 border-t border-border/40 mt-3 text-right">
                      <Label
                        htmlFor="unlockKey"
                        className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block"
                      >
                        קוד פתיחה זמני
                      </Label>
                      <Controller
                        name="unlockKey"
                        control={control}
                        render={({ field }) => (
                          <PremiumInput
                            {...field}
                            id="unlockKey"
                            isPassword
                            placeholder="הזן קוד פתיחה"
                            disabled={isPending}
                            className={cn(
                              errors.unlockKey && 'border-destructive focus-visible:ring-destructive',
                            )}
                          />
                        )}
                      />
                      {errors.unlockKey && (
                        <p className="text-[10px] font-bold text-destructive mt-1 uppercase">
                          {errors.unlockKey.message}
                        </p>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Save Button */}
            <div className="pt-2 animate-in fade-in slide-in-from-bottom-3 duration-300 delay-200">
              <PremiumButton
                type="submit"
                variant="default"
                size="default"
                className="w-full h-12 font-black text-xs uppercase tracking-widest shadow-lg flex items-center justify-center gap-2"
                disabled={isPending}
              >
                {isPending ? (
                  <>
                    <CircleNotch className="h-4 w-4 animate-spin" weight="bold" />
                    <span>שומר פרופיל...</span>
                  </>
                ) : (
                  <span>שמור פרופיל</span>
                )}
              </PremiumButton>
            </div>

            {/* Cancel Button */}
            {showCancelButton ? (
              <div className="space-y-3 animate-in fade-in slide-in-from-bottom-3 duration-300 delay-250">
                <Separator className="my-1 bg-border/40" />
                <PremiumButton
                  type="button"
                  variant="ghost"
                  size="default"
                  className="w-full h-12 font-black text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground flex items-center justify-center gap-2"
                  onClick={onCancel}
                  disabled={isPending}
                >
                  <ArrowLeft className="h-4 w-4" weight="bold" />
                  חזור לבחירת פרופיל
                </PremiumButton>
              </div>
            ) : null}
          </div>
        </form>
      </PremiumCard>
    </div>
  );
}
