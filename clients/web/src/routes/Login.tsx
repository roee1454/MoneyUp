import { Plus, Trash2, Lock } from 'lucide-react';
import { useState } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { profileCreationSchema } from '@moneyup/types';
import { cn } from '@/lib/utils';
import { useCreateUser, useDeleteUserConfirmed, useUsers, type User } from '@/hooks/useUsers';
import { useLogin, useUnlockProfile } from '@/hooks/useAuth';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const avatarGrays = ['bg-zinc-950 dark:bg-white text-white dark:text-black border-zinc-800 dark:border-zinc-200', 'bg-zinc-800 text-zinc-100 border-zinc-700', 'bg-zinc-600 text-zinc-100 border-zinc-500', 'bg-zinc-400 text-zinc-900 border-zinc-300', 'bg-zinc-200 text-zinc-900 border-zinc-400'];

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
      await loginMutation.mutateAsync({ userId: user.id, username: user.username });
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
      <div className="flex min-h-[calc(100vh-140px)] items-center justify-center px-4" dir="rtl">
        <Card className="w-full max-w-md border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-sm rounded-xl">
          <CardContent className="py-12 text-center text-sm font-semibold text-zinc-500">
            טוען פרופילים במערכת...
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <section className="flex min-h-[calc(100vh-140px)] items-center justify-center px-4" dir="rtl">
      <div className="w-full max-w-5xl py-8">
        {error ? (
          <div className="mx-auto mb-6 max-w-md rounded-lg border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 p-4 text-center text-sm font-bold text-zinc-800 dark:text-zinc-200">
            {error}
          </div>
        ) : null}

        {shouldShowForm ? (
          <div className="mx-auto flex max-w-md items-center justify-center">
            <Card className="w-full border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-md rounded-xl">
              <CardHeader className="space-y-1">
                <CardTitle className="text-center text-2xl font-black tracking-tight text-zinc-950 dark:text-white">הוסף פרופיל חדש</CardTitle>
                <CardDescription className="text-center text-zinc-500 font-semibold">השתמש בפרופילים מקומיים לניתוח מהיר</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username" className="font-semibold">שם משתמש</Label>
                  <Input
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="הכנס שם משתמש..."
                    className={cn('rounded-lg border-zinc-200 focus-visible:ring-zinc-950 dark:border-zinc-800 dark:focus-visible:ring-white', fieldErrors.username && 'border-red-500 focus-visible:ring-red-500')}
                  />
                  {fieldErrors.username && (
                    <p className="text-xs font-bold text-red-500 mt-1">{fieldErrors.username}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="font-semibold">אימייל</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="example@mail.com"
                    className={cn('rounded-lg border-zinc-200 focus-visible:ring-zinc-950 dark:border-zinc-800 dark:focus-visible:ring-white', fieldErrors.email && 'border-red-500 focus-visible:ring-red-500')}
                  />
                  {fieldErrors.email && (
                    <p className="text-xs font-bold text-red-500 mt-1">{fieldErrors.email}</p>
                  )}
                </div>

                <div className="space-y-2 rounded-lg border border-zinc-200 dark:border-zinc-800 p-3">
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-sm font-bold text-zinc-700 dark:text-zinc-200">לנעול את הפרופיל?</span>
                    <input
                      type="checkbox"
                      checked={lockProfile}
                      onChange={(e) => {
                        setLockProfile(e.target.checked);
                        if (!e.target.checked) setUnlockKey('');
                      }}
                      className="h-4 w-4 accent-zinc-900"
                    />
                  </label>

                  {lockProfile && (
                    <div className="space-y-1.5">
                      <Label htmlFor="unlockKey" className="font-semibold">קוד פתיחה זמני</Label>
                      <Input
                        id="unlockKey"
                        type="password"
                        value={unlockKey}
                        onChange={(e) => setUnlockKey(e.target.value)}
                        placeholder="הזן קוד פתיחה"
                        className={cn('rounded-lg border-zinc-200 focus-visible:ring-zinc-950 dark:border-zinc-800 dark:focus-visible:ring-white', fieldErrors.unlockKey && 'border-red-500 focus-visible:ring-red-500')}
                      />
                      {fieldErrors.unlockKey && (
                        <p className="text-xs font-bold text-red-500 mt-1">{fieldErrors.unlockKey}</p>
                      )}
                    </div>
                  )}
                </div>

                <Button className="w-full h-11 rounded-lg font-bold bg-zinc-950 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-200 dark:text-black shadow-sm mt-2" onClick={() => void createProfile()}>
                  שמור פרופיל
                </Button>

                {profiles.length > 0 ? (
                  <>
                    <Separator className="my-2 bg-zinc-200 dark:bg-zinc-800" />
                    <Button variant="ghost" className="w-full h-11 rounded-lg font-bold text-zinc-500 hover:text-zinc-900 dark:hover:text-white" onClick={() => setShowForm(false)}>
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
              <h1 className="text-5xl font-black tracking-tight text-zinc-950 dark:text-white">מי מתחבר?</h1>
              <p className="text-zinc-500 font-semibold">בחר פרופיל על מנת להיכנס לדשבורד</p>
            </div>

            <div className="flex flex-wrap items-start justify-center gap-8 md:gap-12">
              {profiles.map((user, index) => (
                <div key={user.id} className="space-y-4 text-center group relative">
                  <button
                    onClick={() => {
                      setDeleteTarget(user);
                      setDeleteSuccess(false);
                      setDeleteConfirmation('');
                    }}
                    className="absolute -top-2 -left-2 z-20 h-7 w-7 rounded-full border border-red-200 bg-white text-red-500 hover:bg-red-50 dark:bg-zinc-900 dark:border-red-900/50 dark:hover:bg-red-950/30 flex items-center justify-center cursor-pointer"
                    aria-label={`Delete ${user.username}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>

                  <Button
                    variant="ghost"
                    className="h-auto p-0 rounded-xl hover:bg-transparent transition-all duration-300 group-hover:scale-105"
                    onClick={() => {
                      setSelectedId(user.id);
                      void login(user.id);
                    }}
                  >
                    <Avatar className={cn('h-28 w-28 rounded-xl border-2 transition-all duration-300 shadow-md', avatarGrays[index % avatarGrays.length], selectedId === user.id ? 'ring-4 ring-zinc-950 dark:ring-white scale-105' : 'group-hover:border-zinc-800 dark:group-hover:border-zinc-200')}>
                      <AvatarFallback className="rounded-xl bg-transparent text-3xl font-black">
                        {user.username.slice(0, 1).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                  <p className={cn('text-base transition-colors duration-200 flex items-center justify-center gap-1', selectedId === user.id ? 'font-black text-zinc-950 dark:text-white' : 'font-semibold text-zinc-500 group-hover:text-zinc-800 dark:group-hover:text-zinc-300')}>
                    {user.username}
                    {user.isLocked ? <Lock className="h-3.5 w-3.5" /> : null}
                  </p>
                </div>
              ))}

              <div className="space-y-4 text-center group">
                <Button variant="ghost" className="h-auto p-0 rounded-xl hover:bg-transparent transition-all duration-300 group-hover:scale-105" onClick={() => setShowForm(true)}>
                  <Avatar className="h-28 w-28 rounded-xl bg-zinc-50 dark:bg-zinc-900 border-2 border-dashed border-zinc-300 dark:border-zinc-800 transition-colors group-hover:border-zinc-500 dark:group-hover:border-zinc-650 flex items-center justify-center">
                    <AvatarFallback className="rounded-xl bg-transparent text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300">
                      <Plus className="h-10 w-10 stroke-[2.5]" />
                    </AvatarFallback>
                  </Avatar>
                </Button>
                <p className="text-base font-semibold text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-colors">הוסף פרופיל</p>
              </div>
            </div>
          </div>
        )}
      </div>

      <Dialog open={!!unlockTarget} onOpenChange={(open) => !open && setUnlockTarget(null)}>
        <DialogContent showCloseButton={false} className="max-w-md bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-none p-6 shadow-2xl" dir="rtl">
          <DialogHeader className="text-right space-y-1 pb-4 border-b border-zinc-100 dark:border-zinc-900">
            <DialogTitle className="text-lg font-black text-zinc-950 dark:text-white">פרופיל נעול</DialogTitle>
            <DialogDescription className="text-xs font-semibold text-zinc-400">
              הזן קוד פתיחה עבור {unlockTarget?.username}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-4">
            <Input
              type="password"
              value={unlockInput}
              onChange={(e) => setUnlockInput(e.target.value)}
              placeholder="קוד פתיחה כאן..."
              className="w-full h-12 bg-zinc-50/50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded-none"
            />
            {unlockError ? (
              <p className="text-[11px] font-bold text-red-500 bg-red-50 dark:bg-red-950/30 p-2 border border-red-200/50 dark:border-red-900/30">
                {unlockError}
              </p>
            ) : null}
            <div className="flex items-center gap-3 pt-2 justify-end">
              <Button
                type="button"
                variant="outline"
                className="rounded-none font-bold text-xs h-10 border-zinc-200 dark:border-zinc-850 cursor-pointer"
                onClick={() => setUnlockTarget(null)}
              >
                ביטול
              </Button>
              <Button
                type="button"
                className="rounded-none font-bold text-xs h-10 bg-zinc-950 hover:bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-100 cursor-pointer"
                onClick={() => void unlockAndLogin()}
              >
                שחרר והתחבר
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent showCloseButton={false} className="max-w-md bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-none p-6 shadow-2xl" dir="rtl">
          {deleteSuccess ? (
            <div className="min-h-[220px] flex flex-col items-center justify-center text-center gap-4">
              <div className="h-11 w-11 rounded-full bg-emerald-600 text-white flex items-center justify-center text-2xl font-black">✓</div>
              <p className="text-sm font-black text-zinc-900 dark:text-zinc-100">הפרופיל נמחק בהצלחה</p>
              <Button
                className="rounded-none font-bold text-xs h-10 bg-zinc-950 hover:bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-100 cursor-pointer px-8"
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
              <DialogHeader className="text-right space-y-1 pb-4 border-b border-zinc-100 dark:border-zinc-900">
                <DialogTitle className="text-lg font-black text-zinc-950 dark:text-white">מחיקת פרופיל</DialogTitle>
                <DialogDescription className="text-xs font-semibold text-zinc-400">
                  כדי למחוק את הפרופיל, הקלד את האימייל שלו בדיוק.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 pt-4">
                <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                  הקלד: <span className="font-black text-zinc-950 dark:text-zinc-100">{deleteTarget?.email}</span>
                </p>
                <Input
                  value={deleteConfirmation}
                  onChange={(e) => setDeleteConfirmation(e.target.value)}
                  placeholder="profile@email.com"
                  className="w-full h-12 bg-zinc-50/50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded-none"
                />
                <div className="flex items-center gap-3 pt-2 justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-none font-bold text-xs h-10 border-zinc-200 dark:border-zinc-850 cursor-pointer"
                    onClick={() => setDeleteTarget(null)}
                  >
                    ביטול
                  </Button>
                  <Button
                    type="button"
                    className="rounded-none font-bold text-xs h-10 bg-red-600 hover:bg-red-700 text-white cursor-pointer"
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
