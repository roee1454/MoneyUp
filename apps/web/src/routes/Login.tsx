import { Plus } from '@phosphor-icons/react';
import { useState } from 'react';

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
import { motion, AnimatePresence, type Variants } from 'motion/react';
import { PremiumMotionCard } from '@/components/ui/premium-motion-card';

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.05,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

export default function Login() {
  const [selectedId, setSelectedId] = useState('');
  const [username, setUsername] = useState('');
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

    const validation = profileCreationSchema.safeParse({
      username: normalizedUsername,
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
        lockProfile,
        unlockKey: lockProfile ? unlockKey : undefined,
      });
      setUsername('');
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
      const isInvalidKey = err.message?.toLowerCase() === 'invalid unlocking key';
      setUnlockError(isInvalidKey ? 'קוד פתיחה שגוי' : (err.message || 'קוד פתיחה שגוי'));
    }
  }

  async function deleteProfile() {
    if (!deleteTarget) return;
    try {
      await deleteUserMutation.mutateAsync({
        userId: deleteTarget.id,
        confirmationUserId: deleteConfirmation,
      });
      setDeleteSuccess(true);
      if (selectedId === deleteTarget.id) setSelectedId('');
    } catch (err: any) {
      setError(err.message || 'מחיקת הפרופיל נכשלה');
    }
  }



  return (
    <section
      className="relative flex min-h-[calc(100vh-140px)] items-center justify-center px-4 overflow-hidden bg-transparent"
      dir="rtl"
    >

      <div className="relative z-10 w-full max-w-5xl py-8">
        {error ? (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-auto mb-6 max-w-md rounded-none border border-border bg-muted/50 p-4 text-center text-sm font-bold text-foreground"
          >
            {error}
          </motion.div>
        ) : null}

        <AnimatePresence mode="wait">
          {usersQuery.isLoading ? (
            <motion.div
              key="loading"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
              className="mx-auto flex flex-col items-center justify-center space-y-12 max-w-4xl"
            >
              <div className="text-center space-y-3">
                <motion.h1
                  variants={itemVariants}
                  className="text-5xl font-black tracking-tight text-foreground uppercase opacity-20"
                >
                  מי מתחבר?
                </motion.h1>
                <motion.p
                  variants={itemVariants}
                  className="text-muted-foreground font-black text-xs uppercase tracking-[0.2em] opacity-20 animate-pulse"
                >
                  טוען פרופילים במערכת...
                </motion.p>
              </div>

              <motion.div
                variants={itemVariants}
                className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 w-full"
              >
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="w-full flex flex-col justify-between h-44 border border-border/30 bg-card/20 p-5 rounded-none animate-pulse"
                  >
                    <div className="flex justify-between items-start w-full">
                      <div className="h-12 w-12 border border-border bg-muted/40 rounded-none" />
                    </div>
                    <div className="space-y-2 text-right w-full flex flex-col items-end">
                      <div className="h-5 bg-muted/40 w-24 rounded-none" />
                      <div className="h-3 bg-muted/30 w-16 rounded-none" />
                    </div>
                  </div>
                ))}
              </motion.div>
            </motion.div>
          ) : shouldShowForm ? (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="w-full"
            >
              <CreateProfileForm
                username={username}
                setUsername={(val) => {
                  setUsername(val);
                  if (fieldErrors.username) {
                    setFieldErrors((prev) => ({ ...prev, username: '' }));
                  }
                }}
                lockProfile={lockProfile}
                setLockProfile={setLockProfile}
                unlockKey={unlockKey}
                setUnlockKey={setUnlockKey}
                fieldErrors={fieldErrors}
                onSave={() => void createProfile()}
                onCancel={() => setShowForm(false)}
                showCancelButton={profiles.length > 0}
                isPending={createUserMutation.isPending}
              />
            </motion.div>
          ) : (
            <motion.div
              key="list"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
              className="mx-auto flex flex-col items-center justify-center space-y-12 max-w-4xl"
            >
              <div className="text-center space-y-3">
                <motion.h1
                  variants={itemVariants}
                  className="text-5xl font-black tracking-tight text-foreground uppercase"
                >
                  מי מתחבר?
                </motion.h1>
                <motion.p
                  variants={itemVariants}
                  className="text-muted-foreground font-black text-xs uppercase tracking-[0.2em]"
                >
                  בחר פרופיל על מנת להיכנס לדשבורד
                </motion.p>
              </div>

              <motion.div
                variants={itemVariants}
                className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 w-full"
              >
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

                <PremiumMotionCard
                  onClick={() => setShowForm(true)}
                  className="group w-full text-center border-dashed border-border p-5 flex flex-col items-center justify-center gap-4 h-44"
                >
                  <div className="h-12 w-12 rounded-none bg-background border border-border flex items-center justify-center transition-all group-hover:scale-110 group-hover:border-primary group-hover:bg-primary group-hover:text-primary-foreground">
                    <Plus
                      className="h-6 w-6 text-muted-foreground transition-colors group-hover:text-primary-foreground"
                      weight="bold"
                    />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-black text-muted-foreground group-hover:text-foreground transition-colors uppercase tracking-tight">
                      הוסף פרופיל
                    </p>
                  </div>
                </PremiumMotionCard>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
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
