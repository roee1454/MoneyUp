import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { useAppStore } from '@/store';
import {
  useUserProfile,
  useUpdateGeneralSettings,
  useEnableProfileLock,
  useDisableProfileLock,
  useUpdateUnlockKey,
} from '@/hooks/useUsers';
import { PremiumButton } from '@/components/ui/premium-button';
import { PremiumInput } from '@/components/ui/premium-input';
import { Select, SelectItem } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { motion, useReducedMotion, type Variants } from 'motion/react';
import { Lock, LockOpen } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.02,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

export default function ProfileSettings() {
  const session = useAppStore((s) => s.session);
  const { data: userProfile, refetch: refetchProfile } = useUserProfile(
    session?.userId,
  );

  const updateGeneralSettings = useUpdateGeneralSettings();
  const enableProfileLock = useEnableProfileLock();
  const disableProfileLock = useDisableProfileLock();
  const updateUnlockKey = useUpdateUnlockKey();

  const { theme, setTheme } = useTheme();

  // Local form states
  const [username, setUsername] = useState('');
  const [initialLandingPage, setInitialLandingPage] = useState('/dashboard');
  const [accentColor, setAccentColor] = useState('default');
  const [defaultCurrency, setDefaultCurrency] = useState('ILS');
  const [sessionTimeoutMinutes, setSessionTimeoutMinutes] = useState(30);

  // Dialog Visibility states
  const [isEnableOpen, setIsEnableOpen] = useState(false);
  const [isDisableOpen, setIsDisableOpen] = useState(false);
  const [isChangeOpen, setIsChangeOpen] = useState(false);

  // Dialog input states
  const [enableLockKey, setEnableLockKey] = useState('');
  const [enableLockKeyConfirm, setEnableLockKeyConfirm] = useState('');
  const [disableLockKey, setDisableLockKey] = useState('');
  const [oldUnlockKey, setOldUnlockKey] = useState('');
  const [newUnlockKey, setNewUnlockKey] = useState('');
  const [newUnlockKeyConfirm, setNewUnlockKeyConfirm] = useState('');

  useEffect(() => {
    if (userProfile) {
      setUsername(userProfile.username);
      setInitialLandingPage(userProfile.initialLandingPage ?? '/dashboard');
      setAccentColor(userProfile.accentColor ?? 'default');
      setDefaultCurrency(userProfile.defaultCurrency ?? 'ILS');
      setSessionTimeoutMinutes(userProfile.sessionTimeoutMinutes ?? 30);
    }
  }, [userProfile]);

  const shouldReduceMotion = useReducedMotion();
  const isAnimated = !shouldReduceMotion;

  const LayoutContainer = isAnimated ? motion.div : 'div';
  const MotionItem = isAnimated ? motion.div : 'div';

  const handleSaveProfile = async () => {
    if (!username.trim()) {
      toast.error('שם המשתמש אינו יכול להיות ריק');
      return;
    }
    try {
      await updateGeneralSettings.mutateAsync({
        username,
        initialLandingPage,
        accentColor,
        defaultCurrency,
        sessionTimeoutMinutes,
      });
      toast.success('ההגדרות נשמרו בהצלחה!');
      refetchProfile();
    } catch (err: any) {
      toast.error(err.message || 'שגיאה בשמירת ההגדרות');
    }
  };

  const handleEnableLockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!enableLockKey) {
      toast.error('נא להזין קוד אבטחה');
      return;
    }
    if (enableLockKey !== enableLockKeyConfirm) {
      toast.error('קודי האבטחה אינם תואמים');
      return;
    }
    try {
      await enableProfileLock.mutateAsync({ unlockKey: enableLockKey });
      toast.success('נעילת הפרופיל הופעלה בהצלחה!');
      setEnableLockKey('');
      setEnableLockKeyConfirm('');
      setIsEnableOpen(false);
      refetchProfile();
    } catch (err: any) {
      toast.error(err.message || 'שגיאה בהפעלת הנעילה');
    }
  };

  const handleDisableLockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!disableLockKey) {
      toast.error('נא להזין את קוד האבטחה הנוכחי');
      return;
    }
    try {
      await disableProfileLock.mutateAsync({ unlockKey: disableLockKey });
      toast.success('נעילת הפרופיל בוטלה בהצלחה');
      setDisableLockKey('');
      setIsDisableOpen(false);
      refetchProfile();
    } catch (err: any) {
      toast.error(err.message || 'קוד אבטחה שגוי');
    }
  };

  const handleChangeLockKeySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldUnlockKey || !newUnlockKey) {
      toast.error('נא למלא את כל השדות');
      return;
    }
    if (newUnlockKey !== newUnlockKeyConfirm) {
      toast.error('הקוד החדש ואישור הקוד אינם תואמים');
      return;
    }
    try {
      await updateUnlockKey.mutateAsync({
        oldUnlockKey,
        newUnlockKey,
      });
      toast.success('קוד האבטחה עודכן בהצלחה!');
      setOldUnlockKey('');
      setNewUnlockKey('');
      setNewUnlockKeyConfirm('');
      setIsChangeOpen(false);
      refetchProfile();
    } catch (err: any) {
      toast.error(err.message || 'שגיאה בעדכון קוד האבטחה');
    }
  };

  const ACCENTS = [
    { id: 'default', label: 'מבריח (כחול)', bg: 'bg-zinc-800' },
    { id: 'emerald', label: 'אזמרגד', bg: 'bg-emerald-600' },
    { id: 'rose', label: 'ורד', bg: 'bg-rose-600' },
    { id: 'amber', label: 'ענבר', bg: 'bg-amber-500' },
    { id: 'indigo', label: 'אינדיגו', bg: 'bg-indigo-600' },
  ];

  return (
    <LayoutContainer
      className="w-full space-y-1 pb-20"
      {...(isAnimated ? { variants: containerVariants, initial: 'hidden', animate: 'visible' } : {})}
    >
      {/* Page Title */}
      <MotionItem className="space-y-2 border-b border-border/30 pb-6" {...(isAnimated ? { variants: itemVariants } : {})}>
        <h2 className="text-5xl font-black text-foreground tracking-tighter uppercase">
          כללי ואבטחה
        </h2>
        <p className="text-muted-foreground font-medium max-w-2xl text-sm">
          הגדר את שם המשתמש, מראה האפליקציה, ניווט ואתחול ואבטחת הפרופיל שלך.
        </p>
      </MotionItem>

      {/* Section 1: Profile Info */}
      <MotionItem
        className="grid grid-cols-1 md:grid-cols-3 gap-8 py-8 border-b border-border/30 text-right items-start"
        {...(isAnimated ? { variants: itemVariants } : {})}
      >
        <div className="space-y-1.5">
          <h3 className="font-black text-base text-foreground">פרטי פרופיל</h3>
          <p className="text-xs font-semibold text-muted-foreground leading-relaxed">
            שנה את שם המשתמש של הפרופיל שלך ומטבע התצוגה המועדף עליך.
          </p>
        </div>
        <div className="space-y-4 md:col-span-2 max-w-md w-full">
          <div className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground">שם משתמש</label>
            <PremiumInput
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="שם משתמש..."
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground">מטבע ברירת מחדל</label>
            <Select value={defaultCurrency} onValueChange={setDefaultCurrency}>
              <SelectItem value="ILS">שקל חדש (₪)</SelectItem>
              <SelectItem value="USD">דולר אמריקאי ($)</SelectItem>
              <SelectItem value="EUR">אירו (€)</SelectItem>
              <SelectItem value="GBP">לירה שטרלינג (£)</SelectItem>
            </Select>
          </div>
        </div>
      </MotionItem>

      {/* Section 2: Appearance */}
      <MotionItem
        className="grid grid-cols-1 md:grid-cols-3 gap-8 py-8 border-b border-border/30 text-right items-start"
        {...(isAnimated ? { variants: itemVariants } : {})}
      >
        <div className="space-y-1.5">
          <h3 className="font-black text-base text-foreground">מראה ותצוגה</h3>
          <p className="text-xs font-semibold text-muted-foreground leading-relaxed">
            בחר את נושא האפליקציה וצבע ההדגשה (Accent) המועדף עליך.
          </p>
        </div>
        <div className="space-y-5 md:col-span-2 max-w-md w-full">
          <div className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground block">מצב תצוגה</label>
            <div className="grid grid-cols-3 gap-2">
              {['light', 'dark', 'system'].map((m) => (
                <button
                  key={m}
                  onClick={() => setTheme(m)}
                  className={cn(
                    'h-10 text-xs font-bold border rounded-none cursor-pointer transition-colors',
                    theme === m
                      ? 'border-primary bg-primary text-primary-foreground font-black'
                      : 'border-border bg-muted/20 text-muted-foreground hover:bg-muted/40 hover:text-foreground',
                  )}
                >
                  {m === 'light' ? 'בהיר' : m === 'dark' ? 'כהה' : 'מערכת'}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground block">צבע הדגשה (Accent)</label>
            <div className="flex flex-wrap gap-2.5">
              {ACCENTS.map((acc) => (
                <button
                  key={acc.id}
                  onClick={() => setAccentColor(acc.id)}
                  className={cn(
                    'h-9 px-3 flex items-center gap-2 border text-xs font-bold rounded-none cursor-pointer transition-all',
                    accentColor === acc.id
                      ? 'border-primary bg-primary/5 shadow-xs font-black'
                      : 'border-border bg-transparent text-muted-foreground hover:bg-muted/10',
                  )}
                >
                  <span className={cn('h-3.5 w-3.5 border border-black/10 inline-block', acc.bg)} />
                  {acc.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </MotionItem>

      {/* Section 3: Navigation & Init */}
      <MotionItem
        className="grid grid-cols-1 md:grid-cols-3 gap-8 py-8 border-b border-border/30 text-right items-start"
        {...(isAnimated ? { variants: itemVariants } : {})}
      >
        <div className="space-y-1.5">
          <h3 className="font-black text-base text-foreground">ניווט ואתחול</h3>
          <p className="text-xs font-semibold text-muted-foreground leading-relaxed">
            הגדר לאיזה עמוד האפליקציה תפתח לאחר התחברות וזמן התנתקות אוטומטית.
          </p>
        </div>
        <div className="space-y-4 md:col-span-2 max-w-md w-full">
          <div className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground">עמוד הבית בעת כניסה</label>
            <Select value={initialLandingPage} onValueChange={setInitialLandingPage}>
              <SelectItem value="/dashboard">דשבורד ראשי</SelectItem>
              <SelectItem value="/ai-studio">סוכן ה-AI</SelectItem>
              <SelectItem value="/settings">הגדרות חשבונות</SelectItem>
              <SelectItem value="/export">ייצוא נתונים</SelectItem>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground">זמן התנתקות אוטומטית מחוסר פעילות</label>
            <Select value={String(sessionTimeoutMinutes)} onValueChange={(val) => setSessionTimeoutMinutes(Number(val))}>
              <SelectItem value="15">15 דקות</SelectItem>
              <SelectItem value="30">30 דקות</SelectItem>
              <SelectItem value="60">שעה אחת</SelectItem>
              <SelectItem value="0">ללא התנתקות אוטומטית</SelectItem>
            </Select>
          </div>
        </div>
      </MotionItem>

      {/* Section 4: Security & Lock */}
      <MotionItem
        className="grid grid-cols-1 md:grid-cols-3 gap-8 py-8 border-b border-border/30 text-right items-start"
        {...(isAnimated ? { variants: itemVariants } : {})}
      >
        <div className="space-y-1.5">
          <h3 className="font-black text-base text-foreground">אבטחה ונעילת פרופיל</h3>
          <p className="text-xs font-semibold text-muted-foreground leading-relaxed">
            הגן על הנתונים שלך על ידי הפעלת קוד נעילה לפרופיל.
          </p>
        </div>
        <div className="space-y-4 md:col-span-2 max-w-md w-full">
          <div className="flex items-center justify-between border border-border p-4 bg-muted/10">
            <div className="flex items-center gap-2.5">
              {userProfile?.isLocked ? (
                <Lock className="h-5 w-5 text-destructive" />
              ) : (
                <LockOpen className="h-5 w-5 text-muted-foreground" />
              )}
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-black text-foreground">נעילת פרופיל בקוד גישה</span>
                <span className="text-[10px] font-semibold text-muted-foreground">
                  {userProfile?.isLocked ? 'הפרופיל מאובטח בקוד גישה' : 'קוד הגישה מבוטל כרגע'}
                </span>
              </div>
            </div>
            <span
              className={cn(
                'text-[10.5px] font-black uppercase px-2 py-0.5 border',
                userProfile?.isLocked
                  ? 'bg-destructive/10 text-destructive border-destructive/20'
                  : 'bg-muted text-muted-foreground border-border',
              )}
            >
              {userProfile?.isLocked ? 'פעיל' : 'כבוי'}
            </span>
          </div>

          <div className="pt-2">
            {!userProfile?.isLocked ? (
              <PremiumButton
                variant="outline"
                className="w-full text-right flex items-center justify-between"
                onClick={() => setIsEnableOpen(true)}
              >
                <span>הפעל נעילת פרופיל עם קוד גישה</span>
                <Lock className="h-4 w-4" />
              </PremiumButton>
            ) : (
              <div className="flex gap-3">
                <PremiumButton
                  variant="outline"
                  className="flex-1 text-xs"
                  onClick={() => setIsChangeOpen(true)}
                >
                  שינוי קוד פתיחה
                </PremiumButton>
                <PremiumButton
                  variant="accent"
                  className="flex-1 text-xs text-destructive border-destructive/30"
                  onClick={() => setIsDisableOpen(true)}
                >
                  ביטול נעילה
                </PremiumButton>
              </div>
            )}
          </div>
        </div>
      </MotionItem>

      {/* Sticky Save Button Row */}
      <MotionItem
        className="sticky bottom-0 z-30 bg-background/95 backdrop-blur-md grid grid-cols-1 md:grid-cols-3 gap-8 py-6 text-right items-center w-full"
        {...(isAnimated ? { variants: itemVariants } : {})}
      >
        <div className="hidden md:block" />
        <div className="md:col-span-2 max-w-md w-full flex justify-end">
          <PremiumButton
            onClick={handleSaveProfile}
            disabled={updateGeneralSettings.isPending}
            className="w-full md:w-auto px-10 shadow-lg shadow-primary/10"
          >
            {updateGeneralSettings.isPending ? 'שומר שינויים...' : 'שמור שינויים'}
          </PremiumButton>
        </div>
      </MotionItem>

      {/* ── Security Dialogs ────────────────────────────────────────────── */}

      {/* Enable Lock Dialog */}
      <Dialog open={isEnableOpen} onOpenChange={(open) => !open && setIsEnableOpen(false)}>
        <DialogContent className="max-w-md bg-card border border-border rounded-none p-6 shadow-2xl" dir="rtl">
          <DialogHeader className="text-right space-y-1 pb-4 border-b border-border">
            <DialogTitle className="text-lg font-black text-foreground uppercase">הפעלת נעילת פרופיל</DialogTitle>
            <DialogDescription className="text-xs font-semibold text-muted-foreground">הגדר קוד גישה לאבטחת הפרופיל שלך.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEnableLockSubmit} className="space-y-4 pt-4">
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground">קוד אבטחה חדש</label>
                <PremiumInput
                  isPassword
                  placeholder="הזן קוד אבטחה..."
                  value={enableLockKey}
                  onChange={(e) => setEnableLockKey(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground">אישור קוד אבטחה</label>
                <PremiumInput
                  isPassword
                  placeholder="הזן שוב את הקוד..."
                  value={enableLockKeyConfirm}
                  onChange={(e) => setEnableLockKeyConfirm(e.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-2 border-t border-border/40">
              <PremiumButton type="button" size="sm" variant="ghost" onClick={() => setIsEnableOpen(false)}>
                ביטול
              </PremiumButton>
              <PremiumButton type="submit" size="sm" disabled={enableProfileLock.isPending}>
                {enableProfileLock.isPending ? 'מפעיל...' : 'הפעל נעילה'}
              </PremiumButton>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Disable Lock Dialog */}
      <Dialog open={isDisableOpen} onOpenChange={(open) => !open && setIsDisableOpen(false)}>
        <DialogContent className="max-w-md bg-card border border-border rounded-none p-6 shadow-2xl" dir="rtl">
          <DialogHeader className="text-right space-y-1 pb-4 border-b border-border">
            <DialogTitle className="text-lg font-black text-foreground uppercase">ביטול נעילת פרופיל</DialogTitle>
            <DialogDescription className="text-xs font-semibold text-muted-foreground">הזן קוד גישה נוכחי על מנת לבטל את נעילת הפרופיל.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleDisableLockSubmit} className="space-y-4 pt-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-muted-foreground">קוד אבטחה נוכחי</label>
              <PremiumInput
                isPassword
                placeholder="הזן קוד גישה נוכחי..."
                value={disableLockKey}
                onChange={(e) => setDisableLockKey(e.target.value)}
              />
            </div>
            <div className="flex gap-2 justify-end pt-2 border-t border-border/40">
              <PremiumButton type="button" size="sm" variant="ghost" onClick={() => setIsDisableOpen(false)}>
                ביטול
              </PremiumButton>
              <PremiumButton type="submit" size="sm" variant="accent" className="text-destructive border-destructive/20" disabled={disableProfileLock.isPending}>
                {disableProfileLock.isPending ? 'מבטל...' : 'בטל נעילה'}
              </PremiumButton>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Change Lock Dialog */}
      <Dialog open={isChangeOpen} onOpenChange={(open) => !open && setIsChangeOpen(false)}>
        <DialogContent className="max-w-md bg-card border border-border rounded-none p-6 shadow-2xl" dir="rtl">
          <DialogHeader className="text-right space-y-1 pb-4 border-b border-border">
            <DialogTitle className="text-lg font-black text-foreground uppercase">שינוי קוד פתיחה</DialogTitle>
            <DialogDescription className="text-xs font-semibold text-muted-foreground">עדכן את קוד האבטחה של הפרופיל שלך.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleChangeLockKeySubmit} className="space-y-4 pt-4">
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground">קוד אבטחה נוכחי</label>
                <PremiumInput
                  isPassword
                  placeholder="הזן קוד אבטחה נוכחי..."
                  value={oldUnlockKey}
                  onChange={(e) => setOldUnlockKey(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground">קוד אבטחה חדש</label>
                <PremiumInput
                  isPassword
                  placeholder="הזן קוד אבטחה חדש..."
                  value={newUnlockKey}
                  onChange={(e) => setNewUnlockKey(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground">אישור קוד אבטחה חדש</label>
                <PremiumInput
                  isPassword
                  placeholder="אשר את הקוד החדש..."
                  value={newUnlockKeyConfirm}
                  onChange={(e) => setNewUnlockKeyConfirm(e.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-2 border-t border-border/40">
              <PremiumButton type="button" size="sm" variant="ghost" onClick={() => setIsChangeOpen(false)}>
                ביטול
              </PremiumButton>
              <PremiumButton type="submit" size="sm" disabled={updateUnlockKey.isPending}>
                {updateUnlockKey.isPending ? 'מעדכן...' : 'עדכן קוד'}
              </PremiumButton>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </LayoutContainer>
  );
}
