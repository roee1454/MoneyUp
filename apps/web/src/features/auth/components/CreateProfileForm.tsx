import { Label } from '@/components/ui/label';
import { PremiumInput } from '@/components/ui/premium-input';
import { PremiumButton } from '@/components/ui/premium-button';
import { PremiumCard } from '@/components/ui/premium-card';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, CircleNotch } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';

interface CreateProfileFormProps {
  username: string;
  setUsername: (v: string) => void;
  lockProfile: boolean;
  setLockProfile: (v: boolean) => void;
  unlockKey: string;
  setUnlockKey: (v: string) => void;
  fieldErrors: Record<string, string>;
  onSave: () => void;
  onCancel: () => void;
  showCancelButton: boolean;
  isPending?: boolean;
}

export function CreateProfileForm({
  username,
  setUsername,
  lockProfile,
  setLockProfile,
  unlockKey,
  setUnlockKey,
  fieldErrors,
  onSave,
  onCancel,
  showCancelButton,
  isPending = false,
}: CreateProfileFormProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className="mx-auto flex max-w-md items-center justify-center w-full">
      <PremiumCard className="w-full border-border bg-card shadow-md rounded-none overflow-hidden">
        {/* Form Container: Staggered entrance via hardware-accelerated CSS animation */}
        <div className="space-y-6 w-full animate-in fade-in duration-300">
          
          {/* Header (Delay 0ms) */}
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
            {/* Username Field with Shake Error (Delay 75ms) */}
            <motion.div
              animate={fieldErrors.username ? { x: [-6, 6, -6, 6, -3, 3, 0] } : {}}
              transition={{ duration: 0.4 }}
              className="space-y-2 text-right animate-in fade-in slide-in-from-bottom-3 duration-300 delay-75"
            >
              <Label
                htmlFor="username"
                className="text-xs font-black uppercase tracking-widest text-muted-foreground"
              >
                שם משתמש
              </Label>
              <PremiumInput
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="הכנס שם משתמש..."
                disabled={isPending}
                className={cn(
                  fieldErrors.username &&
                    'border-destructive focus-visible:ring-destructive',
                  'transition-all duration-200 focus-visible:scale-[1.01]'
                )}
              />
              {fieldErrors.username && (
                <p className="text-[10px] font-bold text-destructive mt-1 uppercase">
                  {fieldErrors.username}
                </p>
              )}
            </motion.div>



            {/* Switch Section for Locking Profile (Delay 150ms) */}
            <div className="space-y-2 border border-border/60 p-4 bg-muted/10 transition-colors duration-250 hover:bg-muted/15 animate-in fade-in slide-in-from-bottom-3 duration-300 delay-150">
              <div className="flex items-center justify-between cursor-pointer select-none">
                <span className="text-[11px] font-black uppercase tracking-widest text-foreground/80">
                  לנעול את הפרופיל?
                </span>
                
                {/* Regular shadcn Switch */}
                <Switch
                  checked={lockProfile}
                  onCheckedChange={(checked) => {
                    if (isPending) return;
                    setLockProfile(checked);
                    if (!checked) setUnlockKey('');
                  }}
                  className="scale-90"
                />
              </div>

              {/* Collapsible Key Fields (No-snap padding-isolated container) */}
              <AnimatePresence initial={false}>
                {lockProfile && (
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
                        className="text-[10px] font-black uppercase tracking-widest text-muted-foreground"
                      >
                        קוד פתיחה זמני
                      </Label>
                      <PremiumInput
                        id="unlockKey"
                        isPassword
                        value={unlockKey}
                        onChange={(e) => setUnlockKey(e.target.value)}
                        placeholder="הזן קוד פתיחה"
                        disabled={isPending}
                        className={cn(
                          fieldErrors.unlockKey &&
                            'border-destructive focus-visible:ring-destructive',
                        )}
                      />
                      {fieldErrors.unlockKey && (
                        <p className="text-[10px] font-bold text-destructive mt-1 uppercase">
                          {fieldErrors.unlockKey}
                        </p>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Save Button (Delay 200ms) */}
            <div className="pt-2 animate-in fade-in slide-in-from-bottom-3 duration-300 delay-200">
              <PremiumButton
                variant="default"
                size="default"
                className="w-full h-12 font-black text-xs uppercase tracking-widest shadow-lg flex items-center justify-center gap-2"
                onClick={onSave}
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

            {/* Cancel Button (Delay 250ms) */}
            {showCancelButton ? (
              <div className="space-y-3 animate-in fade-in slide-in-from-bottom-3 duration-300 delay-250">
                <Separator className="my-1 bg-border/40" />
                <PremiumButton
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
        </div>
      </PremiumCard>
    </div>
  );
}
