import { Plus } from '@phosphor-icons/react';
import { useState } from 'react';
import { PremiumCard } from '@/components/ui/premium-card';
import { profileCreationSchema } from '@money-up/types';
import {
  useCreateUser,
  useDeleteUserConfirmed,
  useUsers,
  type User,
} from '@/hooks/useUsers';
import { useLogin, useUnlockProfile } from '@/hooks/useAuth';
import { CreateProfileForm } from '@/features/auth/components/CreateProfileForm';
import { ProfileCard } from '@/features/auth/components/ProfileCard';
import { UnlockProfileDialog } from '@/features/auth/components/UnlockProfileDialog';
import { DeleteProfileDialog } from '@/features/auth/components/DeleteProfileDialog';

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
          <CreateProfileForm
            username={username}
            setUsername={setUsername}
            email={email}
            setEmail={setEmail}
            lockProfile={lockProfile}
            setLockProfile={setLockProfile}
            unlockKey={unlockKey}
            setUnlockKey={setUnlockKey}
            fieldErrors={fieldErrors}
            onSave={() => void createProfile()}
            onCancel={() => setShowForm(false)}
            showCancelButton={profiles.length > 0}
          />
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
                <ProfileCard
                  key={user.id}
                  user={user}
                  index={index}
                  isSelected={selectedId === user.id}
                  onSelect={() => {
                    setSelectedId(user.id);
                    void login(user.id);
                  }}
                  onDeleteClick={() => {
                    setDeleteTarget(user);
                    setDeleteSuccess(false);
                    setDeleteConfirmation('');
                  }}
                />
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

      <UnlockProfileDialog
        target={unlockTarget}
        onClose={() => setUnlockTarget(null)}
        unlockInput={unlockInput}
        setUnlockInput={setUnlockInput}
        unlockError={unlockError}
        onUnlock={() => void unlockAndLogin()}
        isPending={unlockMutation.isPending}
      />

      <DeleteProfileDialog
        target={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        deleteConfirmation={deleteConfirmation}
        setDeleteConfirmation={setDeleteConfirmation}
        deleteSuccess={deleteSuccess}
        setDeleteSuccess={setDeleteSuccess}
        onDelete={() => void deleteProfile()}
        isPending={deleteUserMutation.isPending}
      />
    </section>
  );
}
