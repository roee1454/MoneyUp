import { useState, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { useScrapersList, type ScraperErrorCode } from '@/hooks/useScrapers';
import { getScraperSocket, emitScraperSocket } from '@/lib/scraper-socket';
import { getFriendlyScraperError } from '@/lib/error-formatter';
import { BankSelectionStep } from './add-bank-account/BankSelectionStep';
import { CredentialsStep } from './add-bank-account/CredentialsStep';
import { OtpChallengeStep } from './add-bank-account/OtpChallengeStep';
import { SyncingView } from './add-bank-account/SyncingView';
import { ConnectedView } from './add-bank-account/ConnectedView';
import type {
  AddBankAccountDialogProps,
  ScraperListItem,
} from './add-bank-account/types';

export function AddBankAccountDialog({
  open,
  onOpenChange,
  onSuccess,
}: AddBankAccountDialogProps) {
  const queryClient = useQueryClient();
  const [selectedBank, setSelectedBank] = useState<ScraperListItem | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  // 2FA / MFA Interactive States
  const [isAwaiting2FA, setIsAwaiting2FA] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const sessionIdRef = useRef(sessionId);
  const [challengeMsg, setChallengeMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [hasFailed, setHasFailed] = useState(false);
  const [activeTab, setActiveTab] = useState<'bank' | 'credit_card'>(
    'credit_card',
  );
  const [syncStep, setSyncStep] = useState<string | null>(null);

  useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);

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
    return getFriendlyScraperError(fallback, errorCode);
  };

  // ── Socket event listeners ──────────────────────────────────────────
  useEffect(() => {
    if (!open) {
      return;
    }

    const socket = getScraperSocket();

    const handleStatus = (data: { sessionId?: string; status?: string; step?: string }) => {
      if (!data.sessionId || data.sessionId !== sessionIdRef.current) return;
      if (data.step) setSyncStep(data.step);
    };

    const handleChallenge = (data: {
      sessionId?: string;
      challenge?: { message?: string };
      errorCode?: ScraperErrorCode;
      error?: string;
    }) => {
      if (!data.sessionId || data.sessionId !== sessionIdRef.current) return;
      setIsConnecting(false);
      setChallengeMsg(
        data.challenge?.message || 'הזן את קוד ה-SMS שנשלח אליך לצורך אימות',
      );
      setIsAwaiting2FA(true);
      if (data.errorCode || data.error) {
        setErrorMsg(getFriendlyError(data.errorCode, data.error));
      }
    };

    const handleSuccess = (data?: { sessionId?: string }) => {
      if (!data?.sessionId || data.sessionId !== sessionIdRef.current) return;
      setIsConnecting(false);
      setIsAwaiting2FA(false);
      setIsConnected(true);
      setSyncStep(null);
      toast.success('החשבון סונכרן בהצלחה!');
      void queryClient.invalidateQueries({ queryKey: ['connected-accounts'] });
      void onSuccess?.();
    };

    const handleError = (data: {
      sessionId?: string;
      errorCode?: ScraperErrorCode;
      error?: string;
    }) => {
      if (!data.sessionId || data.sessionId !== sessionIdRef.current) return;
      setIsConnecting(false);
      setHasFailed(true);
      setErrorMsg(getFriendlyError(data.errorCode, data.error));
    };

    const handleConnectError = () => {
      setIsConnecting(false);
      setHasFailed(true);
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

  // ── Reset state on close ────────────────────────────────────────────
  useEffect(() => {
    if (!open) {
      setSelectedBank(null);
      setIsAwaiting2FA(false);
      setSessionId('');
      setChallengeMsg('');
      setErrorMsg(null);
      setIsConnecting(false);
      setIsConnected(false);
      setHasFailed(false);
      setActiveTab('credit_card');
      setSyncStep(null);
    }
  }, [open]);

  // ── Handlers ────────────────────────────────────────────────────────
  async function handleConnect(credentials: Record<string, string>) {
    setIsConnecting(true);
    setHasFailed(false);
    setErrorMsg(null);
    setSessionId('');
    setSyncStep(null);

    try {
      const res = await emitScraperSocket<{
        status: string;
        sessionId?: string;
        errorCode?: ScraperErrorCode;
        error?: string;
      }>('scraper:connect', {
        bankId: selectedBank!.id,
        credentials,
      });

      if (res.status === 'FAILED') {
        setIsConnecting(false);
        setHasFailed(true);
        setErrorMsg(getFriendlyError(res.errorCode, res.error));
      } else if (res.sessionId) {
        setSessionId(res.sessionId);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'לא ניתן לפתוח חיבור בזמן אמת עכשיו, נא לפתוח את האפליקציה מחדש!');
      setIsConnecting(false);
    }
  }

  async function handleSubmitChallenge(otpCode: string) {
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

  // ── Derived state ───────────────────────────────────────────────────
  const showSyncingScreen = !!selectedBank && (isConnecting || hasFailed) && !isAwaiting2FA;

  // ── Render ──────────────────────────────────────────────────────────
  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        if (isConnecting) return;
        onOpenChange(val);
      }}
    >
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
          <SyncingView
            bankId={selectedBank.id}
            bankName={selectedBank.name}
            syncStep={syncStep}
            errorMsg={hasFailed ? errorMsg : null}
            onRetry={() => {
              setHasFailed(false);
              setErrorMsg(null);
              setSessionId('');
              setSyncStep(null);
            }}
            onClose={() => onOpenChange(false)}
          />
        ) : !selectedBank ? (
          <BankSelectionStep
            scrapers={tabScrapers}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            onBankSelect={setSelectedBank}
            isLoading={isLoadingScrapers}
          />
        ) : isAwaiting2FA ? (
          <OtpChallengeStep
            selectedBank={selectedBank}
            onSubmit={handleSubmitChallenge}
            onBack={() => {
              setIsAwaiting2FA(false);
              setErrorMsg(null);
            }}
            challengeMsg={challengeMsg}
            errorMsg={errorMsg}
            isConnecting={isConnecting}
          />
        ) : (
          <CredentialsStep
            selectedBank={selectedBank}
            onSubmit={handleConnect}
            onBack={() => {
              setSelectedBank(null);
              setErrorMsg(null);
            }}
            errorMsg={errorMsg}
            isConnecting={isConnecting}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
