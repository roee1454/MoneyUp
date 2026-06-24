/** Shape of a scraper entry returned by the scrapers list API. */
export type ScraperListItem = {
  id: string;
  name: string;
  loginFields: string[];
  type?: 'bank' | 'credit_card' | string;
};

/** Props for the top-level AddBankAccountDialog component. */
export interface AddBankAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void | Promise<unknown>;
}

/** Props for the bank / credit-card selection grid. */
export interface BankSelectionStepProps {
  scrapers: ScraperListItem[];
  activeTab: 'bank' | 'credit_card';
  onTabChange: (tab: 'bank' | 'credit_card') => void;
  onBankSelect: (bank: ScraperListItem) => void;
  isLoading: boolean;
}

/** Props for the credentials login form. */
export interface CredentialsStepProps {
  selectedBank: ScraperListItem;
  onSubmit: (values: Record<string, string>) => void;
  onBack: () => void;
  errorMsg: string | null;
  isConnecting: boolean;
}

/** Props for the OTP / 2FA challenge entry screen. */
export interface OtpChallengeStepProps {
  selectedBank: ScraperListItem;
  onSubmit: (code: string) => void;
  onBack: () => void;
  challengeMsg: string;
  errorMsg: string | null;
  isConnecting: boolean;
}

/** Props for the syncing progress view. */
export interface SyncingViewProps {
  bankId: string;
  bankName: string;
  syncStep: string | null;
  errorMsg?: string | null;
  onRetry?: () => void;
  onClose?: () => void;
}

/** Props for the post-connection success view. */
export interface ConnectedViewProps {
  bankId: string;
  bankName: string;
  onClose: () => void;
}
