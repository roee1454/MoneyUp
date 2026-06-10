import React, { useState, useMemo, useRef } from 'react';
import {
  CircleNotch,
  PaperPlaneRight,
  Sliders,
  X,
} from '@phosphor-icons/react';
import { PremiumButton } from '@/components/ui/premium-button';
import { PremiumTextarea } from '@/components/ui/premium-textarea';
import { DataSourceCard } from '@/features/dashboard/components/DataSourceCard';
import { cn } from '@/lib/utils';
import { useAccounts } from '@/hooks/useAccounts';
import { BankIcon } from '@/features/accounts/components/BankIcon';
import { getBankName, normalizeBankId } from '@/lib/bank-branding';
import { AiModelDropdownSelector } from '@/features/ai/components/AiModelDropdownSelector';

interface AiInputPanelProps {
  prompt: string;
  setPrompt: (value: string) => void;
  onSubmit: (promptValue: string) => void;
  isLoading: boolean;
  selectedModel: string;
  debugEnabled: boolean;
  activeSources: string[];
  onShowDebug: () => void;

  agentProvider: 'openai' | 'claude' | 'gemini' | 'ollama' | 'openrouter';
  setAgentProvider: (provider: 'openai' | 'claude' | 'gemini' | 'ollama' | 'openrouter') => void;
  agentModel: string;
  setAgentModel: (model: string) => void;
  modelsByProvider: Record<string, string[]>;
  configuredProviders?: string[];
}

export function AiInputPanel({
  prompt,
  setPrompt,
  onSubmit,
  isLoading,
  selectedModel,
  debugEnabled,
  activeSources,
  onShowDebug,
  agentProvider,
  setAgentProvider,
  agentModel,
  setAgentModel,
  modelsByProvider,
  configuredProviders,
}: AiInputPanelProps) {
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const [mentionStartIndex, setMentionStartIndex] = useState(-1);
  const [selectedAccountIndex, setSelectedAccountIndex] = useState(0);
  const [taggedAccounts, setTaggedAccounts] = useState<any[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const { data: accounts = [] } = useAccounts();

  const filteredAccounts = useMemo(() => {
    if (!mentionSearch) return accounts;
    const searchLower = mentionSearch.toLowerCase();
    return accounts.filter((account) => {
      const bankName = getBankName(account.bankId).toLowerCase();
      const bankId = account.bankId.toLowerCase();
      const accNum = account.accountNumber.toLowerCase();
      return bankName.includes(searchLower) || bankId.includes(searchLower) || accNum.includes(searchLower);
    });
  }, [accounts, mentionSearch]);

  const evaluateMentions = (value: string, cursor: number) => {
    const textBeforeCursor = value.slice(0, cursor);
    const lastAtIdx = textBeforeCursor.lastIndexOf('@');

    if (lastAtIdx !== -1) {
      const textAfterAt = textBeforeCursor.slice(lastAtIdx + 1);
      if (!textAfterAt.includes(' ') && !textAfterAt.includes('\n')) {
        setShowMentionDropdown(true);
        setMentionSearch(textAfterAt);
        setMentionStartIndex(lastAtIdx);
        return;
      }
    }
    setShowMentionDropdown(false);
  };

  const handleChangeText = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setPrompt(value);
    evaluateMentions(value, e.target.selectionStart ?? 0);
  };

  const handleSelect = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    evaluateMentions(e.currentTarget.value, e.currentTarget.selectionStart ?? 0);
  };

  const insertMention = (account: any) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const value = prompt;
    const start = mentionStartIndex;

    // Check if account already tagged
    const isAlreadyTagged = taggedAccounts.some(
      (a) => a.bankId === account.bankId && a.accountNumber === account.accountNumber
    );

    if (!isAlreadyTagged) {
      setTaggedAccounts((prev) => [...prev, account]);
    }

    // Clean up search query from the input field
    const newValue = value.slice(0, start).trim() + ' ';
    setPrompt(newValue);
    setShowMentionDropdown(false);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newValue.length, newValue.length);
    }, 0);
  };

  const removeTaggedAccount = (account: any) => {
    setTaggedAccounts((prev) =>
      prev.filter((a) => !(a.bankId === account.bankId && a.accountNumber === account.accountNumber))
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showMentionDropdown && filteredAccounts.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedAccountIndex((prev) => (prev + 1) % filteredAccounts.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedAccountIndex((prev) => (prev - 1 + filteredAccounts.length) % filteredAccounts.length);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        insertMention(filteredAccounts[selectedAccountIndex]);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowMentionDropdown(false);
        return;
      }
    }

    // Backspace on empty input deletes the last tagged account
    if (e.key === 'Backspace' && !prompt) {
      setTaggedAccounts((prev) => prev.slice(0, -1));
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      setShowMentionDropdown(false);
      triggerSubmit();
    }
  };

  const triggerSubmit = () => {
    if (!prompt.trim() && taggedAccounts.length === 0) return;

    let finalPrompt = prompt;
    if (taggedAccounts.length > 0) {
      const tags = taggedAccounts.map((account) => {
        const isCard = ['max', 'isracard', 'cal'].includes(normalizeBankId(account.bankId));
        let identifier = account.accountNumber;
        if (isCard) {
          identifier = account.accountNumber.slice(-4);
        } else {
          const normalizedBankId = normalizeBankId(account.bankId);
          if (normalizedBankId === 'hapoalim') {
            const parts = account.accountNumber.split('-');
            if (parts.length >= 3) {
              identifier = parts.slice(2).join('-');
            }
          }
        }
        return ` \`bankid:${account.bankId}:${identifier}\` `;
      }).join('');

      finalPrompt = `${prompt}\n\n${tags}`;
    }

    setTaggedAccounts([]);
    onSubmit(finalPrompt);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowMentionDropdown(false);
    triggerSubmit();
  };

  return (
    <form
      onSubmit={handleFormSubmit}
      className="mt-auto flex flex-col rounded-none border border-border bg-card shadow-sm relative"
    >
      {/* Mentions Dropdown Overlay */}
      {showMentionDropdown && filteredAccounts.length > 0 && (
        <>
          <div
            className="fixed inset-0 z-40 bg-transparent"
            onClick={() => setShowMentionDropdown(false)}
          />
          <div className="absolute bottom-full mb-1.5 left-4 right-4 z-50 border border-border bg-card shadow-2xl p-1 max-h-56 overflow-y-auto rounded-none text-right flex flex-col gap-0.5" dir="rtl">
            <div className="px-3 py-1.5 text-[10px] font-black text-muted-foreground border-b border-border/50 uppercase tracking-widest mb-1 select-none">
              בחר חשבון או כרטיס לקישור
            </div>
            {filteredAccounts.map((account, index) => {
              const isCard = ['max', 'isracard', 'cal'].includes(normalizeBankId(account.bankId));
              const active = index === selectedAccountIndex;
              let identifier = account.accountNumber;
              if (isCard) {
                identifier = account.accountNumber.slice(-4);
              } else {
                const normalizedBankId = normalizeBankId(account.bankId);
                if (normalizedBankId === 'hapoalim') {
                  const parts = account.accountNumber.split('-');
                  if (parts.length >= 3) {
                    identifier = parts.slice(2).join('-');
                  }
                }
              }
              return (
                <button
                  key={`${account.bankId}:${account.accountNumber}`}
                  type="button"
                  onClick={() => insertMention(account)}
                  onMouseEnter={() => setSelectedAccountIndex(index)}
                  className={cn(
                    "w-full px-3 py-2 flex items-center justify-between transition-colors text-right cursor-pointer rounded-none",
                    active ? "bg-primary text-primary-foreground" : "hover:bg-muted/50 text-foreground"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <BankIcon bankId={account.bankId} size="sm" className="!h-6 !w-6" />
                    <div className="text-right leading-tight">
                      <div className={cn("text-xs font-black", active ? "text-primary-foreground" : "text-foreground")}>
                        {getBankName(account.bankId)}
                      </div>
                      <div className={cn("text-[9px] font-semibold", active ? "text-primary-foreground/75" : "text-muted-foreground")}>
                        {isCard ? 'כרטיס אשראי' : 'חשבון בנק'}
                      </div>
                    </div>
                  </div>
                  <div className={cn("text-[10px] font-mono font-bold", active ? "text-primary-foreground/80" : "text-muted-foreground/85")}>
                    {identifier}
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* Tagged Accounts Bar */}
      {taggedAccounts.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-4 pt-3 pb-1 border-b border-border/50 bg-muted/5 text-right" dir="rtl">
          {taggedAccounts.map((account) => {
            const isCard = ['max', 'isracard', 'cal'].includes(normalizeBankId(account.bankId));
            let identifier = account.accountNumber;
            if (isCard) {
              identifier = account.accountNumber.slice(-4);
            } else {
              const normalizedBankId = normalizeBankId(account.bankId);
              if (normalizedBankId === 'hapoalim') {
                const parts = account.accountNumber.split('-');
                if (parts.length >= 3) {
                  identifier = parts.slice(2).join('-');
                }
              }
            }
            return (
              <div
                key={`${account.bankId}:${account.accountNumber}`}
                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-muted border border-border text-xs font-semibold text-foreground select-none align-middle rounded-full animate-in fade-in zoom-in-95 duration-150"
              >
                <BankIcon bankId={account.bankId} size="sm" className="!h-4 !w-4 border-none" />
                <span>{getBankName(account.bankId)} • {identifier}</span>
                <button
                  type="button"
                  onClick={() => removeTaggedAccount(account)}
                  className="mr-1 hover:text-destructive text-muted-foreground/60 transition-colors cursor-pointer flex items-center justify-center h-4 w-4 rounded-full hover:bg-muted-foreground/10"
                >
                  <X className="h-3 w-3" weight="bold" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      <PremiumTextarea
        ref={textareaRef}
        value={prompt}
        onChange={handleChangeText}
        onSelect={handleSelect}
        onKeyDown={handleKeyDown}
        placeholder={selectedModel ? "הקלד כאן שאלה... (השתמש ב-@ כדי לתייג חשבון)" : "יש לחבר ספק AI על מנת לשלוח הודעות"}
        className="w-full min-h-[100px] max-h-60 rounded-none border-none bg-transparent hover:bg-transparent focus:bg-transparent shadow-none py-4 px-4 resize-none text-right text-foreground relative z-10 leading-relaxed placeholder:text-muted-foreground text-[17px]"
        disabled={isLoading || !selectedModel}
        rows={3}
      />

      <div className="flex items-center justify-between px-3 py-2.5 border-t border-border/50 bg-muted/10 min-h-[52px]">
        <div className="flex items-center gap-1.5">
          {debugEnabled && !activeSources.length && (
            <PremiumButton
              type="button"
              onClick={onShowDebug}
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-muted-foreground/70"
            >
              <Sliders className="h-4.5 w-4.5" weight="duotone" />
            </PremiumButton>
          )}

          {activeSources.length > 0 ? (
            <DataSourceCard
              bankIds={activeSources}
              className="bg-background/80 border-primary/20 animate-in fade-in slide-in-from-right-2 duration-500"
              label="מנתח נתונים מ"
            />
          ) : (
            <div className="shrink-0">
              <AiModelDropdownSelector
                selectedProvider={agentProvider}
                setSelectedProvider={setAgentProvider}
                selectedModel={agentModel}
                setSelectedModel={setAgentModel}
                modelsByProvider={modelsByProvider}
                isLoading={isLoading}
                configuredProviders={configuredProviders}
              />
            </div>
          )}
        </div>

        <PremiumButton
          type="submit"
          disabled={(!prompt.trim() && taggedAccounts.length === 0) || isLoading || !selectedModel}
          className="h-10 px-5"
        >
          {isLoading ? (
            <CircleNotch className="h-4 w-4 animate-spin" />
          ) : (
            <PaperPlaneRight className="h-4 w-4" weight="bold" />
          )}
          <span className="hidden sm:inline mr-2">
            {isLoading ? 'שולח...' : 'שלח הודעה'}
          </span>
        </PremiumButton>
      </div>
    </form>
  );
}
