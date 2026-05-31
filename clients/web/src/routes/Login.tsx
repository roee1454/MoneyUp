import { Plus, Trash, Lock } from '@phosphor-icons/react';
import { useState } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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
    } catch {
      setError('יצירת פרופיל נכשלה');
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
    } catch {
      setError('התחברות נכשלה');
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
    } catch {
      setUnlockError('קוד פתיחה שגוי');
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
    } catch {
      setError('מחיקת הפרופיל נכשלה');
    }
  }

  if (usersQuery.isLoading) {
    return (
      <div
        className="flex min-h-[calc(100vh-140px)] items-center justify-center px-4"
        dir="rtl"
      >
        <Card className="w-full max-w-md border-border bg-card shadow-sm rounded-xl">
          <CardContent className="py-12 text-center text-sm font-semibold text-muted-foreground">
            טוען פרופילים במערכת...
          </CardContent>
        </Card>
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
          <div className="mx-auto mb-6 max-w-md rounded-lg border border-border bg-muted/50 p-4 text-center text-sm font-bold text-foreground">
            {error}
          </div>
        ) : null}

        {shouldShowForm ? (
          <div className="mx-auto flex max-w-md items-center justify-center">
            <Card className="w-full border-border bg-card shadow-md rounded-xl">
              <CardHeader className="space-y-1">
                <CardTitle className="text-center text-2xl font-black tracking-tight text-foreground">
                  הוסף פרופיל חדש
                </CardTitle>
                <CardDescription className="text-center text-muted-foreground font-semibold">
                  השתמש בפרופילים מקומיים לניתוח מהיר
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username" className="font-semibold">
                    שם משתמש
                  </Label>
                  <Input
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="הכנס שם משתמש..."
                    className={cn(
                      'rounded-lg border-border focus-visible:ring-ring',
                      fieldErrors.username &&
                        'border-destructive focus-visible:ring-destructive',
                    )}
                  />
                  {fieldErrors.username && (
                    <p className="text-xs font-bold text-destructive mt-1">
                      {fieldErrors.username}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="font-semibold">
                    אימייל
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="example@mail.com"
                    className={cn(
                      'rounded-lg border-border focus-visible:ring-ring',
                      fieldErrors.email &&
                        'border-destructive focus-visible:ring-destructive',
                    )}
                  />
                  {fieldErrors.email && (
                    <p className="text-xs font-bold text-destructive mt-1">
                      {fieldErrors.email}
                    </p>
                  )}
                </div>

                <div className="space-y-2 rounded-lg border border-border p-3">
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-sm font-bold text-foreground/80">
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
                    <div className="space-y-1.5">
                      <Label htmlFor="unlockKey" className="font-semibold">
                        קוד פתיחה זמני
                      </Label>
                      <Input
                        id="unlockKey"
                        type="password"
                        value={unlockKey}
                        onChange={(e) => setUnlockKey(e.target.value)}
                        placeholder="הזן קוד פתיחה"
                        className={cn(
                          'rounded-lg border-border focus-visible:ring-ring',
                          fieldErrors.unlockKey &&
                            'border-destructive focus-visible:ring-destructive',
                        )}
                      />
                      {fieldErrors.unlockKey && (
                        <p className="text-xs font-bold text-destructive mt-1">
                          {fieldErrors.unlockKey}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <Button
                  className="w-full h-11 rounded-lg font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm mt-2"
                  onClick={() => void createProfile()}
                >
                  שמור פרופיל
                </Button>

                {profiles.length > 0 ? (
                  <>
                    <Separator className="my-2 bg-border" />
                    <Button
                      variant="ghost"
                      className="w-full h-11 rounded-lg font-bold text-muted-foreground hover:text-foreground"
                      onClick={() => setShowForm(false)}
                    >
                      חזור לבחירת פרופיל
                    </Button>
                  </>
                ) : null}
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="mx-auto flex flex-col items-center justify-center space-y-12">
            <div className="text-center space-y-3">
              <h1 className="text-5xl font-black tracking-tight text-foreground">
                מי מתחבר?
              </h1>
              <p className="text-muted-foreground font-semibold">
                בחר פרופיל על מנת להיכנס לדשבורד
              </p>
            </div>

            <div className="flex flex-wrap items-start justify-center gap-8 md:gap-12">
              {profiles.map((user, index) => (
                <div
                  key={user.id}
                  className="space-y-4 text-center group relative"
                >
                  <button
                    onClick={() => {
                      setDeleteTarget(user);
                      setDeleteSuccess(false);
                      setDeleteConfirmation('');
                    }}
                    className="absolute -top-2 -left-2 z-20 h-7 w-7 rounded-full border border-destructive/20 bg-background text-destructive hover:bg-destructive/10 transition-colors flex items-center justify-center cursor-pointer"
                    aria-label={`Delete ${user.username}`}
                  >
                    <Trash className="h-3.5 w-3.5" weight="duotone" />
                  </button>

                  <Button
                    variant="ghost"
                    className="h-auto p-0 rounded-xl hover:bg-transparent transition-all duration-300 group-hover:scale-105"
                    onClick={() => {
                      setSelectedId(user.id);
                      void login(user.id);
                    }}
                  >
                    <Avatar
                      className={cn(
                        'h-28 w-28 rounded-xl border-2 transition-all duration-300 shadow-md',
                        avatarGrays[index % avatarGrays.length],
                        selectedId === user.id
                          ? 'ring-4 ring-primary scale-105'
                          : 'group-hover:border-primary/50',
                      )}
                    >
                      <AvatarFallback className="rounded-xl bg-transparent text-3xl font-black">
                        {user.username.slice(0, 1).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                  <p
                    className={cn(
                      'text-base transition-colors duration-200 flex items-center justify-center gap-1',
                      selectedId === user.id
                        ? 'font-black text-foreground'
                        : 'font-semibold text-muted-foreground group-hover:text-foreground',
                    )}
                  >
                    {user.username}
                    {user.isLocked ? (
                      <Lock className="h-3.5 w-3.5" weight="duotone" />
                    ) : null}
                  </p>
                </div>
              ))}

              <div className="space-y-4 text-center group">
                <Button
                  variant="ghost"
                  className="h-auto p-0 rounded-xl hover:bg-transparent transition-all duration-300 group-hover:scale-105"
                  onClick={() => setShowForm(true)}
                >
                  <Avatar className="h-28 w-28 rounded-xl bg-muted/30 border-2 border-dashed border-border transition-colors group-hover:border-muted-foreground flex items-center justify-center">
                    <AvatarFallback className="rounded-xl bg-transparent text-muted-foreground group-hover:text-foreground">
                      <Plus className="h-10 w-10" weight="bold" />
                    </AvatarFallback>
                  </Avatar>
                </Button>
                <p className="text-base font-semibold text-muted-foreground group-hover:text-foreground transition-colors">
                  הוסף פרופיל
                </p>
              </div>
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
            <DialogTitle className="text-lg font-black text-foreground">
              פרופיל נעול
            </DialogTitle>
            <DialogDescription className="text-xs font-semibold text-muted-foreground">
              הזן קוד פתיחה עבור {unlockTarget?.username}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-4">
            <Input
              type="password"
              value={unlockInput}
              onChange={(e) => setUnlockInput(e.target.value)}
              placeholder="קוד פתיחה כאן..."
              className="w-full h-12 bg-muted/50 border border-border rounded-none"
            />
            {unlockError ? (
              <p className="text-[11px] font-bold text-destructive bg-destructive/10 p-2 border border-destructive/20">
                {unlockError}
              </p>
            ) : null}
            <div className="flex items-center gap-3 pt-2 justify-end">
              <Button
                type="button"
                variant="outline"
                className="rounded-none font-bold text-xs h-10 border-border cursor-pointer"
                onClick={() => setUnlockTarget(null)}
              >
                ביטול
              </Button>
              <Button
                type="button"
                className="rounded-none font-bold text-xs h-10 bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer"
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
              <div className="h-11 w-11 rounded-full bg-emerald-600 text-white flex items-center justify-center text-2xl font-black">
                ✓
              </div>
              <p className="text-sm font-black text-foreground">
                הפרופיל נמחק בהצלחה
              </p>
              <Button
                className="rounded-none font-bold text-xs h-10 bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer px-8"
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
                <DialogTitle className="text-lg font-black text-foreground">
                  מחיקת פרופיל
                </DialogTitle>
                <DialogDescription className="text-xs font-semibold text-muted-foreground">
                  כדי למחוק את הפרופיל, הקלד את האימייל שלו בדיוק.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 pt-4">
                <p className="text-xs font-semibold text-muted-foreground">
                  הקלד:{' '}
                  <span className="font-black text-foreground">
                    {deleteTarget?.email}
                  </span>
                </p>
                <Input
                  value={deleteConfirmation}
                  onChange={(e) => setDeleteConfirmation(e.target.value)}
                  placeholder="profile@email.com"
                  className="w-full h-12 bg-muted/50 border border-border rounded-none"
                />
                <div className="flex items-center gap-3 pt-2 justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-none font-bold text-xs h-10 border-border cursor-pointer"
                    onClick={() => setDeleteTarget(null)}
                  >
                    ביטול
                  </Button>
                  <Button
                    type="button"
                    className="rounded-none font-bold text-xs h-10 bg-destructive hover:bg-destructive/90 text-destructive-foreground cursor-pointer"
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
