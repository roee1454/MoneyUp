import { useState, useEffect } from 'react';
import { Check } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { useScrapersList, type ScraperErrorCode } from '@/hooks/useScrapers';
import { useSyncAccounts } from '@/hooks/useAccounts';
import { getScraperSocket } from '@/lib/scraper-socket';
import { BankIcon } from './BankIcon';
import { PremiumInput } from '@/components/ui/premium-input';
import { PremiumCard } from '@/components/ui/premium-card';
import { PremiumGridButton } from '@/components/ui/premium-grid-button';

interface AddBankAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void | Promise<unknown>;
}

type ScraperListItem = {
  id: string;
  name: string;
  loginFields: string[];
  type?: 'bank' | 'credit_card' | string;
};

export function AddBankAccountDialog({
  open,
  onOpenChange,
  onSuccess,
}: AddBankAccountDialogProps) {
  const queryClient = useQueryClient();
  const syncMutation = useSyncAccounts();
  const [selectedBank, setSelectedBank] = useState<any | null>(null);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [isConnecting, setIsConnecting] = useState(false);

  // 2FA / MFA Interactive States
  const [isAwaiting2FA, setIsAwaiting2FA] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [challengeMsg, setChallengeMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [activeTab, setActiveTab] = useState<'bank' | 'credit_card'>(
    'credit_card',
  );

  const { data: scrapers = [], isLoading: isLoadingScrapers } =
    useScrapersList(open);

  const normalizedScrapers = (scrapers as ScraperListItem[]).map((item) => {
    const normalizedId =
      item.id === 'visaCal' ? 'cal' : String(item.id ?? '').toLowerCase();
    const inferredType =
      item.type === 'bank' || item.type === 'credit_card'
        ? item.type
        : normalizedId === 'max' ||
            normalizedId === 'isracard' ||
            normalizedId === 'cal'
          ? 'credit_card'
          : 'bank';

    return {
      ...item,
      id: normalizedId,
      type: inferredType,
    };
  });
  const tabScrapers = normalizedScrapers.filter(
    (item) => item.type === activeTab,
  );

  const getFriendlyError = (
    errorCode?: ScraperErrorCode,
    fallback?: string,
  ) => {
    switch (errorCode) {
      case 'INVALID_CREDENTIALS':
        return 'שם משתמש או סיסמה אינם נכונים';
      case 'CHALLENGE_FAILED':
        return 'קוד האימות שגוי';
      case 'BANK_UNAVAILABLE':
        return 'שירות חברת האשראי או הבנק לא זמין כרגע. נסה שוב בעוד כמה דקות.';
      default:
        return fallback || 'ההתחברות נכשלה. נסה שוב.';
    }
  };

  useEffect(() => {
    if (!open) {
      return;
    }

    const socket = getScraperSocket();

    const handleStatus = (data: { sessionId?: string; status?: string }) => {
      if (data.sessionId) setSessionId(data.sessionId);
    };

    const handleChallenge = (data: {
      sessionId?: string;
      challenge?: { message?: string };
      errorCode?: ScraperErrorCode;
      error?: string;
    }) => {
      if (data.sessionId) setSessionId(data.sessionId);
      setIsConnecting(false);
      setChallengeMsg(
        data.challenge?.message || 'הזן את קוד ה-SMS שנשלח אליך לצורך אימות',
      );
      setIsAwaiting2FA(true);
      if (data.errorCode || data.error) {
        setErrorMsg(getFriendlyError(data.errorCode, data.error));
      }
    };

    const handleSuccess = () => {
      setIsConnecting(false);
      setIsAwaiting2FA(false);
      setIsConnected(true);
      toast.success('החשבון סונכרן בהצלחה!');
      void queryClient.invalidateQueries({ queryKey: ['connected-accounts'] });
      syncMutation.mutate({ silent: true });
      void onSuccess?.();
    };

    const handleError = (data: {
      errorCode?: ScraperErrorCode;
      error?: string;
    }) => {
      setIsConnecting(false);
      setErrorMsg(getFriendlyError(data.errorCode, data.error));
    };

    const handleConnectError = () => {
      setIsConnecting(false);
      setErrorMsg('לא ניתן לפתוח חיבור סנכרון בזמן אמת. נסה שוב.');
    };

    socket.on('scraper:status', handleStatus);
    socket.on('scraper:challenge', handleChallenge);
    socket.on('scraper:success', handleSuccess);
    socket.on('scraper:error', handleError);
    socket.on('connect_error', handleConnectError);

    return () => {
      socket.off('scraper:status', handleStatus);
      socket.off('scraper:challenge', handleChallenge);
      socket.off('scraper:success', handleSuccess);
      socket.off('scraper:error', handleError);
      socket.off('connect_error', handleConnectError);
    };
  }, [open, onSuccess]);

  useEffect(() => {
    if (!open) {
      setSelectedBank(null);
      setFormValues({});
      setIsAwaiting2FA(false);
      setOtpCode('');
      setSessionId('');
      setChallengeMsg('');
      setErrorMsg(null);
      setIsConnecting(false);
      setIsConnected(false);
      setActiveTab('credit_card');
    }
  }, [open]);

  async function handleConnect(e: React.FormEvent) {
    e.preventDefault();
    setIsConnecting(true);
    setErrorMsg(null);

    try {
      const socket = getScraperSocket();
      socket.emit('scraper:connect', {
        bankId: selectedBank.id,
        credentials: formValues,
      });
    } catch (err: any) {
      setErrorMsg(err.message || 'ההתחברות נכשלה. נסה שוב.');
      setIsConnecting(false);
    }
  }

  async function handleSubmitChallenge(e: React.FormEvent) {
    e.preventDefault();
    setIsConnecting(true);
    setErrorMsg(null);

    try {
      const socket = getScraperSocket();
      socket.emit('scraper:challenge:submit', { sessionId, code: otpCode });
      setIsAwaiting2FA(false);
    } catch (err: any) {
      setErrorMsg(err.message || 'קוד האימות שגוי');
      setIsConnecting(false);
    }
  }

  const showSyncingScreen = !!selectedBank && isConnecting && !isAwaiting2FA;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-w-md bg-card border border-border rounded-none p-6 shadow-2xl"
        dir="rtl"
      >
        {isConnected && selectedBank ? (
          <ConnectedView
            bankId={selectedBank.id}
            bankName={selectedBank.name}
            onClose={() => onOpenChange(false)}
          />
        ) : showSyncingScreen ? (
          <SyncingView bankId={selectedBank.id} bankName={selectedBank.name} />
        ) : !selectedBank ? (
          <div className="animate-in fade-in-50 duration-200 slide-in-from-bottom-2 space-y-4">
            <DialogHeader className="text-right space-y-1.5 pb-4 border-b border-border">
              <DialogTitle className="text-xl font-black text-foreground">
                חיבור מקור מידע פיננסי
              </DialogTitle>
              <DialogDescription className="text-xs font-semibold text-muted-foreground">
                סנכרן באופן אוטומטי ומאובטח את הנתונים הפיננסיים שלך
              </DialogDescription>
            </DialogHeader>

            {/* Tabs Selector */}
            <div className="flex border-b border-border pt-1">
              <button
                type="button"
                className={`flex-1 pb-3 text-xs font-black transition-all border-b-2 cursor-pointer ${
                  activeTab === 'credit_card'
                    ? 'border-primary text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
                onClick={() => setActiveTab('credit_card')}
              >
                💳 חברות אשראי
              </button>
              <button
                type="button"
                className={`flex-1 pb-3 text-xs font-black transition-all border-b-2 cursor-pointer ${
                  activeTab === 'bank'
                    ? 'border-primary text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
                onClick={() => setActiveTab('bank')}
              >
                🏦 בנקים (חשבון עו״ש)
              </button>
            </div>

            {/* Premium Explanation Banner */}
            <div className="bg-muted/40 border border-border p-3 text-xs leading-relaxed text-muted-foreground rounded-none animate-in fade-in-50 duration-150">
              {activeTab === 'bank' ? (
                <p>
                  <span className="font-black text-foreground/80">
                    למה לחבר?
                  </span>{' '}
                  סנכרון יתרת העובר ושב (עו״ש), משכורות, העברות בנקאיות, פקדונות
                  וכרטיסי חיוב מיידי (דביט / דירקט).
                </p>
              ) : (
                <p>
                  <span className="font-black text-foreground/80">
                    למה לחבר?
                  </span>{' '}
                  סנכרון כל עסקאות האשראי המפורטות (בארץ ובחו״ל), רכישות
                  בתשלומים, וזיהוי מדויק של תאריכי וסכומי החיוב החודשיים.
                </p>
              )}
            </div>

            {isLoadingScrapers ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted border-t-primary" />
                <span className="text-xs font-semibold text-muted-foreground">
                  טוען מוסדות פיננסיים...
                </span>
              </div>
            ) : (
              <div className="grid gap-3 pt-2">
                {tabScrapers.map((bank) => (
                  <PremiumGridButton
                    key={bank.id}
                    onClick={() => setSelectedBank(bank)}
                    label={bank.name}
                    icon={
                      <BankIcon bankId={bank.id} shape="circle" size="sm" />
                    }
                  />
                ))}
                {tabScrapers.length === 0 && (
                  <p className="text-xs text-center py-8 text-muted-foreground font-semibold">
                    לא נמצאו מוסדות פעילים בקטגוריה זו
                  </p>
                )}
              </div>
            )}
          </div>
        ) : isAwaiting2FA ? (
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

            <form onSubmit={handleSubmitChallenge} className="space-y-4 pt-4">
              <div className="space-y-2 text-right">
                <p className="text-xs font-semibold text-muted-foreground leading-relaxed">
                  {challengeMsg}
                </p>
                <div className="pt-2 pb-2 flex justify-center" dir="ltr">
                  <PremiumInput
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) =>
                      setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))
                    }
                    autoFocus
                    className="text-center tracking-[0.35em] font-bold text-lg"
                  />
                </div>
                {errorMsg && (
                  <p className="text-[11px] font-bold text-destructive mt-2 bg-destructive/10 p-2.5 border border-destructive/20">
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
                  onClick={() => {
                    setIsAwaiting2FA(false);
                    setOtpCode('');
                    setErrorMsg(null);
                  }}
                  disabled={isConnecting}
                >
                  חזרה
                </Button>
                <Button
                  type="submit"
                  className="rounded-none font-bold text-xs h-10 bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer"
                  disabled={isConnecting}
                >
                  {isConnecting ? 'מאמת...' : 'אשר קוד'}
                </Button>
              </div>
            </form>
          </div>
        ) : (
          <div className="animate-in fade-in-50 duration-200 slide-in-from-bottom-2 space-y-4">
            <DialogHeader className="text-right space-y-1 pb-4 border-b border-border">
              <div className="flex items-center gap-3">
                <BankIcon bankId={selectedBank.id} size="md" />
                <div>
                  <DialogTitle className="text-lg font-black text-foreground">
                    התחברות ל{selectedBank.name}
                  </DialogTitle>
                  <DialogDescription className="text-xs font-semibold text-muted-foreground">
                    יש להזין את פרטי ההזדהות של חשבונך
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <form onSubmit={handleConnect} className="space-y-4 pt-4">
              {selectedBank.loginFields.map((field: string) => {
                let label = field;
                let type = 'text';
                if (field === 'username' || field === 'userCode') {
                  label = 'קוד משתמש';
                } else if (field === 'password') {
                  label = 'סיסמה';
                  type = 'password';
                } else if (
                  field === 'id' ||
                  field === 'nationalId' ||
                  field === 'nationalID'
                ) {
                  label = 'תעודת זהות';
                } else if (field === 'card6Digits') {
                  label = '6 ספרות אחרונות של הכרטיס';
                } else if (field === 'accountNumber') {
                  label = 'מספר חשבון';
                }

                return (
                  <div key={field} className="space-y-1.5 text-right">
                    <Label
                      htmlFor={field}
                      className="text-sm font-bold text-muted-foreground"
                    >
                      {label}
                    </Label>
                    <PremiumInput
                      id={field}
                      isPassword={type === 'password'}
                      name={field}
                      required
                      value={formValues[field] || ''}
                      onChange={(e) =>
                        setFormValues((prev) => ({
                          ...prev,
                          [field]: e.target.value,
                        }))
                      }
                      dir="rtl"
                    />
                  </div>
                );
              })}

              <PremiumCard variant="warning">
                <p className="text-sm font-black text-foreground/70 leading-relaxed">
                  פרטי ההתחברות אינם מועברים לשום צד שלישי. הם מוצפן באופן מקומי
                  על המחשב שלך בלבד!
                </p>
              </PremiumCard>

              {errorMsg && (
                <p className="text-[11px] font-bold text-destructive mt-2 bg-destructive/10 p-2.5 border border-destructive/20 text-right">
                  {errorMsg}
                </p>
              )}

              <div className="flex items-center gap-3 pt-4 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-none font-bold text-xs h-10 border-border cursor-pointer"
                  onClick={() => {
                    setSelectedBank(null);
                    setFormValues({});
                    setErrorMsg(null);
                  }}
                >
                  חזרה לרשימה
                </Button>
                <Button
                  type="submit"
                  className="rounded-none font-bold text-xs h-10 bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer"
                >
                  סנכרן חשבון
                </Button>
              </div>
            </form>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function SyncingView({
  bankId,
  bankName,
}: {
  bankId: string;
  bankName: string;
}) {
  return (
    <div className="animate-in fade-in-50 duration-300 slide-in-from-bottom-1 min-h-[320px] flex flex-col items-center justify-center text-center gap-6">
      <div className="relative flex items-center justify-center h-44 w-44">
        <span className="absolute h-32 w-32 rounded-full border border-border animate-ping [animation-duration:1.8s]" />
        <span className="absolute h-24 w-24 rounded-full border border-border animate-ping [animation-duration:1.8s] [animation-delay:350ms]" />
        <span className="absolute h-16 w-16 rounded-full bg-muted animate-pulse" />
        <BankIcon
          bankId={bankId}
          shape="circle"
          size="xl"
          className="relative z-10"
        />
      </div>

      <div className="space-y-1.5">
        <p className="text-sm font-black text-foreground">מנסה לבצע חיבור...</p>
        <p className="text-xs font-semibold text-muted-foreground">
          {bankName}
        </p>
      </div>
    </div>
  );
}

function ConnectedView({
  bankId,
  bankName,
  onClose,
}: {
  bankId: string;
  bankName: string;
  onClose: () => void;
}) {
  return (
    <div className="animate-in fade-in-50 duration-300 slide-in-from-bottom-1 min-h-[320px] flex flex-col items-center justify-center text-center gap-6">
      <div className="relative flex items-center justify-center h-44 w-44">
        <div className="absolute -top-1 h-11 w-11 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg z-20 border-4 border-card">
          <Check className="h-6 w-6 text-white stroke-3" />
        </div>
        <BankIcon
          bankId={bankId}
          shape="circle"
          size="xl"
          className="relative z-10"
        />
      </div>

      <div className="space-y-1.5">
        <p className="text-sm font-black text-foreground">החיבור הצליח</p>
        <p className="text-xs font-semibold text-muted-foreground">
          {bankName} מחובר כעת
        </p>
      </div>

      <Button
        onClick={onClose}
        className="rounded-none font-bold text-xs h-10 bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer px-8"
      >
        סגור
      </Button>
    </div>
  );
}
