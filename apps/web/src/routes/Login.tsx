import { Plus, Trash, Lock, ArrowLeft } from '@phosphor-icons/react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { PremiumCard } from '@/components/ui/premium-card';
import { PremiumInput } from '@/components/ui/premium-input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { profileCreationSchema } from '@money-up/types';
import { cn } from '@/lib/utils';
import {
  useCreateUser,
  useDeleteUserConfirmed,
  useUsers,
  type User,
} from '@/hooks/useUsers';
import { useLogin, useUnlockProfile } from '@/hooks/useAuth';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const avatarGrays = [
  'bg-primary text-primary-foreground border-border',
  'bg-muted text-foreground border-border',
  'bg-accent text-accent-foreground border-border',
  'bg-secondary text-secondary-foreground border-border',
  'bg-zinc-200 text-zinc-900 border-zinc-400',
];

export default function Login() {
  const [selectedId, setSelectedId] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [lockProfile, setLockProfile] = useState(false);
  const [unlockKey, setUnlockKey] = useState('');

  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deleteSuccess, setDeleteSuccess] = useState(false);

  const [unlockTarget, setUnlockTarget] = useState<User | null>(null);
  const [unlockInput, setUnlockInput] = useState('');
  const [unlockError, setUnlockError] = useState('');

  const loginMutation = useLogin();
  const unlockMutation = useUnlockProfile();
  const createUserMutation = useCreateUser();
  const deleteUserMutation = useDeleteUserConfirmed();

  const usersQuery = useUsers();
  const profiles = usersQuery.data ?? [];
  const shouldShowForm = showForm || profiles.length === 0;

  async function createProfile() {
    setError('');
    setFieldErrors({});
    const normalizedUsername = username.trim();
    const normalizedEmail = email.trim().toLowerCase();

    const validation = profileCreationSchema.safeParse({
      username: normalizedUsername,
      email: normalizedEmail,
      lockProfile,
      unlockKey: lockProfile ? unlockKey : undefined,
    });
    if (!validation.success) {
      const errors: Record<string, string> = {};
      validation.error.errors.forEach((err: any) => {
        if (err.path[0]) {
          errors[err.path[0].toString()] = err.message;
        }
      });
      setFieldErrors(errors);
      return;
    }

    try {
      await createUserMutation.mutateAsync({
        username: normalizedUsername,
        email: normalizedEmail,
        lockProfile,
        unlockKey: lockProfile ? unlockKey : undefined,
      });
      setUsername('');
      setEmail('');
      setUnlockKey('');
      setLockProfile(false);
      setShowForm(false);
    } catch (err: any) {
      setError(err.message || 'יצירת פרופיל נכשלה');
    }
  }

  async function login(profileId?: string) {
    const effectiveId = profileId ?? selectedId;
    const user = profiles.find((u) => u.id === effectiveId);
    if (!user) {
      setError('בחר פרופיל');
      return;
    }

    setError('');
    if (user.isLocked) {
      setUnlockTarget(user);
      setUnlockInput('');
      setUnlockError('');
      return;
    }

    try {
      await loginMutation.mutateAsync({
        userId: user.id,
        username: user.username,
      });
    } catch (err: any) {
      setError(err.message || 'התחברות נכשלה');
    }
  }

  async function unlockAndLogin() {
    if (!unlockTarget) return;
    setUnlockError('');
    try {
      const data = await unlockMutation.mutateAsync({
        userId: unlockTarget.id,
        unlockKey: unlockInput,
      });
      await loginMutation.mutateAsync({
        userId: unlockTarget.id,
        username: unlockTarget.username,
        unlockTicket: data.unlockTicket,
      });
      setUnlockTarget(null);
      setUnlockInput('');
    } catch (err: any) {
      setUnlockError(err.message || 'קוד פתיחה שגוי');
    }
  }

  async function deleteProfile() {
    if (!deleteTarget) return;
    try {
      await deleteUserMutation.mutateAsync({
        userId: deleteTarget.id,
        confirmationEmail: deleteConfirmation,
      });
      setDeleteSuccess(true);
      if (selectedId === deleteTarget.id) setSelectedId('');
    } catch (err: any) {
      setError(err.message || 'מחיקת הפרופיל נכשלה');
    }
  }

  if (usersQuery.isLoading) {
    return (
      <div
        className="flex min-h-[calc(100vh-140px)] items-center justify-center px-4"
        dir="rtl"
      >
        <PremiumCard className="w-full max-w-md border-border bg-card shadow-sm rounded-none">
          <div className="py-12 text-center text-sm font-semibold text-muted-foreground">
            טוען פרופילים במערכת...
          </div>
        </PremiumCard>
      </div>
    );
  }

  return (
    <section
      className="flex min-h-[calc(100vh-140px)] items-center justify-center px-4"
      dir="rtl"
    >
      <div className="w-full max-w-5xl py-8">
        {error ? (
          <div className="mx-auto mb-6 max-w-md rounded-none border border-border bg-muted/50 p-4 text-center text-sm font-bold text-foreground">
            {error}
          </div>
        ) : null}

        {shouldShowForm ? (
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
                  onClick={() => void createProfile()}
                >
                  שמור פרופיל
                </Button>

                {profiles.length > 0 ? (
                  <>
                    <Separator className="my-2 bg-border/50" />
                    <Button
                      variant="ghost"
                      className="w-full h-12 rounded-none font-black text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground flex items-center gap-2"
                      onClick={() => setShowForm(false)}
                    >
                      <ArrowLeft className="h-4 w-4" weight="bold" />
                      חזור לבחירת פרופיל
                    </Button>
                  </>
                ) : null}
              </div>
            </PremiumCard>
          </div>
        ) : (
          <div className="mx-auto flex flex-col items-center justify-center space-y-12 max-w-4xl">
            <div className="text-center space-y-3">
              <h1 className="text-5xl font-black tracking-tight text-foreground uppercase">
                מי מתחבר?
              </h1>
              <p className="text-muted-foreground font-black text-xs uppercase tracking-[0.2em]">
                בחר פרופיל על מנת להיכנס לדשבורד
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 w-full">
              {profiles.map((user, index) => (
                <div key={user.id} className="group relative">
                  <button
                    onClick={() => {
                      setDeleteTarget(user);
                      setDeleteSuccess(false);
                      setDeleteConfirmation('');
                    }}
                    className="absolute -top-2 -left-2 z-20 h-8 w-8 rounded-none border border-destructive/20 bg-background text-destructive opacity-0 group-hover:opacity-100 transition-all hover:bg-destructive hover:text-white flex items-center justify-center cursor-pointer shadow-sm"
                    aria-label={`Delete ${user.username}`}
                  >
                    <Trash className="h-4 w-4" weight="bold" />
                  </button>

                  <button
                    className={cn(
                      'w-full text-right transition-all duration-300 cursor-pointer outline-none border border-border bg-card p-5 flex flex-col justify-between h-44 hover:border-foreground/20 hover:shadow-xl active:scale-95',
                      selectedId === user.id &&
                        'border-primary ring-1 ring-primary/20 bg-primary/5 shadow-lg shadow-primary/5',
                    )}
                    onClick={() => {
                      setSelectedId(user.id);
                      void login(user.id);
                    }}
                  >
                    <div className="flex justify-between items-start">
                      <div
                        className={cn(
                          'h-12 w-12 border border-border flex items-center justify-center text-xl font-black shadow-sm',
                          avatarGrays[index % avatarGrays.length],
                        )}
                      >
                        {user.username.slice(0, 1).toUpperCase()}
                      </div>
                      {user.isLocked && (
                        <div className="bg-muted p-1.5 border border-border shadow-xs">
                          <Lock
                            className="h-3.5 w-3.5 text-muted-foreground"
                            weight="bold"
                          />
                        </div>
                      )}
                    </div>

                    <div className="space-y-1">
                      <p className="text-lg font-black text-foreground uppercase truncate">
                        {user.username}
                      </p>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none">
                        פרופיל מקומי
                      </p>
                    </div>
                  </button>
                </div>
              ))}

              <button
                onClick={() => setShowForm(true)}
                className="group w-full text-center transition-all duration-300 cursor-pointer outline-none border border-dashed border-border bg-muted/5 p-5 flex flex-col items-center justify-center gap-4 h-44 hover:bg-muted/10 hover:border-foreground/40 active:scale-95"
              >
                <div className="h-12 w-12 rounded-none bg-background border border-border flex items-center justify-center transition-all group-hover:scale-110 group-hover:shadow-md">
                  <Plus
                    className="h-6 w-6 text-muted-foreground transition-colors group-hover:text-primary"
                    weight="bold"
                  />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-black text-muted-foreground group-hover:text-foreground transition-colors uppercase tracking-tight">
                    הוסף פרופיל
                  </p>
                </div>
              </button>
            </div>
          </div>
        )}
      </div>

      <Dialog
        open={!!unlockTarget}
        onOpenChange={(open) => !open && setUnlockTarget(null)}
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
              הזן קוד פתיחה עבור {unlockTarget?.username}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-4">
            <PremiumInput
              isPassword
              value={unlockInput}
              onChange={(e) => setUnlockInput(e.target.value)}
              placeholder="קוד פתיחה כאן..."
              className="w-full h-12 bg-muted/50 border border-border rounded-none"
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
                onClick={() => setUnlockTarget(null)}
              >
                ביטול
              </Button>
              <Button
                type="button"
                className="rounded-none font-black text-xs h-10 bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer uppercase tracking-widest px-6"
                onClick={() => void unlockAndLogin()}
              >
                שחרר והתחבר
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
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
                className="rounded-none font-black text-xs h-10 bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer px-10 uppercase tracking-widest"
                onClick={() => {
                  setDeleteTarget(null);
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
                <DialogDescription className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                  כדי למחוק את הפרופיל, הקלד את האימייל שלו בדיוק.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 pt-4 text-right">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-tight">
                  הקלד:{' '}
                  <span className="font-black text-foreground underline underline-offset-4 decoration-destructive/40">
                    {deleteTarget?.email}
                  </span>
                </p>
                <PremiumInput
                  value={deleteConfirmation}
                  onChange={(e) => setDeleteConfirmation(e.target.value)}
                  placeholder="profile@email.com"
                  className="w-full h-12 bg-muted/50 border border-border rounded-none"
                />
                <div className="flex items-center gap-3 pt-2 justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-none font-bold text-xs h-10 border-border cursor-pointer uppercase tracking-widest"
                    onClick={() => setDeleteTarget(null)}
                  >
                    ביטול
                  </Button>
                  <Button
                    type="button"
                    className="rounded-none font-black text-xs h-10 bg-destructive hover:bg-destructive/90 text-destructive-foreground cursor-pointer uppercase tracking-widest px-6"
                    disabled={deleteConfirmation !== deleteTarget?.email}
                    onClick={() => void deleteProfile()}
                  >
                    מחק פרופיל
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
