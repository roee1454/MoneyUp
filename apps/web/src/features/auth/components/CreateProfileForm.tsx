import { Label } from '@/components/ui/label';
import { PremiumInput } from '@/components/ui/premium-input';
import { Button } from '@/components/ui/button';
import { PremiumCard } from '@/components/ui/premium-card';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

interface CreateProfileFormProps {
  username: string;
  setUsername: (v: string) => void;
  email: string;
  setEmail: (v: string) => void;
  lockProfile: boolean;
  setLockProfile: (v: boolean) => void;
  unlockKey: string;
  setUnlockKey: (v: string) => void;
  fieldErrors: Record<string, string>;
  onSave: () => void;
  onCancel: () => void;
  showCancelButton: boolean;
}

export function CreateProfileForm({
  username,
  setUsername,
  email,
  setEmail,
  lockProfile,
  setLockProfile,
  unlockKey,
  setUnlockKey,
  fieldErrors,
  onSave,
  onCancel,
  showCancelButton,
}: CreateProfileFormProps) {
  return (
    <div className="mx-auto flex max-w-md items-center justify-center">
      <PremiumCard className="w-full border-border bg-card shadow-md rounded-none">
        <div className="space-y-1 mb-6 text-right">
          <h2 className="text-2xl font-black tracking-tight text-foreground uppercase">
            הוסף פרופיל חדש
          </h2>
          <p className="text-muted-foreground font-semibold text-xs uppercase tracking-widest">
            השתמש בפרופילים מקומיים לניתוח מהיר
          </p>
        </div>

        <div className="space-y-5">
          <div className="space-y-2">
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
              className={cn(
                fieldErrors.username &&
                  'border-destructive focus-visible:ring-destructive',
              )}
            />
            {fieldErrors.username && (
              <p className="text-[10px] font-bold text-destructive mt-1 uppercase">
                {fieldErrors.username}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label
              htmlFor="email"
              className="text-xs font-black uppercase tracking-widest text-muted-foreground"
            >
              אימייל
            </Label>
            <PremiumInput
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@mail.com"
              className={cn(
                fieldErrors.email &&
                  'border-destructive focus-visible:ring-destructive',
              )}
            />
            {fieldErrors.email && (
              <p className="text-[10px] font-bold text-destructive mt-1 uppercase">
                {fieldErrors.email}
              </p>
            )}
          </div>

          <div className="space-y-2 border border-border p-4 bg-muted/10">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-[11px] font-black uppercase tracking-widest text-foreground/80">
                לנעול את הפרופיל?
              </span>
              <input
                type="checkbox"
                checked={lockProfile}
                onChange={(e) => {
                  setLockProfile(e.target.checked);
                  if (!e.target.checked) setUnlockKey('');
                }}
                className="h-4 w-4 accent-primary"
              />
            </label>

            {lockProfile && (
              <div className="space-y-1.5 pt-2 border-t border-border mt-2">
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
            )}
          </div>

          <Button
            className="w-full h-12 rounded-none font-black text-xs uppercase tracking-widest bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 mt-2"
            onClick={onSave}
          >
            שמור פרופיל
          </Button>

          {showCancelButton ? (
            <>
              <Separator className="my-2 bg-border/50" />
              <Button
                variant="ghost"
                className="w-full h-12 rounded-none font-black text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground flex items-center gap-2"
                onClick={onCancel}
              >
                <ArrowLeft className="h-4 w-4" weight="bold" />
                חזור לבחירת פרופיל
              </Button>
            </>
          ) : null}
        </div>
      </PremiumCard>
    </div>
  );
}
