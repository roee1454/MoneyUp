import React, { useState, useMemo, useRef } from 'react';
import {
  CircleNotch,
  PaperPlaneRight,
  Sliders,
  X,
  ChartLineUp,
} from '@phosphor-icons/react';
import { PremiumButton } from '@/components/ui/premium-button';
import { PremiumTextarea } from '@/components/ui/premium-textarea';
import { DataSourceCard } from '@/features/dashboard/components/DataSourceCard';
import { cn } from '@/lib/utils';
import { useAccounts } from '@/hooks/useAccounts';
import { BankIcon } from '@/features/accounts/components/BankIcon';
import { getBankName, normalizeBankId } from '@/lib/bank-branding';
import { AiModelDropdownSelector } from '@/features/ai/components/AiModelDropdownSelector';

type TaggedItem =
  | { type: 'account'; bankId: string; accountNumber: string; name?: string }
  | { type: 'investment'; ticker: string; name: string };

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
  setAgentProvider: (
    provider: 'openai' | 'claude' | 'gemini' | 'ollama' | 'openrouter',
  ) => void;
  agentModel: string;
  setAgentModel: (model: string) => void;
  modelsByProvider: Record<string, string[]>;
  configuredProviders?: string[];
}

const MOCK_INVESTMENTS: TaggedItem[] = [
  { type: 'investment', ticker: 'AAPL', name: 'Apple Inc.' },
  { type: 'investment', ticker: 'MSFT', name: 'Microsoft Corporation' },
  { type: 'investment', ticker: 'TSLA', name: 'Tesla Inc.' },
];

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
  const [taggedItems, setTaggedItems] = useState<TaggedItem[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const { data: accounts = [] } = useAccounts();

  const filteredItems = useMemo(() => {
    const allItems: TaggedItem[] = [
      ...accounts.map((a) => ({
        type: 'account' as const,
        bankId: a.bankId,
        accountNumber: a.accountNumber,
        name: getBankName(a.bankId),
      })),
      ...MOCK_INVESTMENTS,
    ];
    if (!mentionSearch) return allItems;
    const searchLower = mentionSearch.toLowerCase();
    return allItems.filter((item) => {
      if (item.type === 'account') {
        const bankName = (item.name || '').toLowerCase();
        const bankId = item.bankId.toLowerCase();
        const accNum = item.accountNumber.toLowerCase();
        return (
          bankName.includes(searchLower) ||
          bankId.includes(searchLower) ||
          accNum.includes(searchLower)
        );
      } else {
        return (
          item.ticker.toLowerCase().includes(searchLower) ||
          item.name.toLowerCase().includes(searchLower)
        );
      }
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
    evaluateMentions(
      e.currentTarget.value,
      e.currentTarget.selectionStart ?? 0,
    );
  };

  const insertMention = (item: TaggedItem) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const value = prompt;
    const start = mentionStartIndex;

    const isAlreadyTagged = taggedItems.some((a) => {
      if (a.type === 'account' && item.type === 'account') {
        return (
          a.bankId === item.bankId && a.accountNumber === item.accountNumber
        );
      }
      if (a.type === 'investment' && item.type === 'investment') {
        return a.ticker === item.ticker;
      }
      return false;
    });

    if (!isAlreadyTagged) {
      setTaggedItems((prev) => [...prev, item]);
    }

    const newValue = value.slice(0, start).trim() + ' ';
    setPrompt(newValue);
    setShowMentionDropdown(false);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newValue.length, newValue.length);
    }, 0);
  };

  const removeTaggedItem = (item: TaggedItem) => {
    setTaggedItems((prev) =>
      prev.filter((a) => {
        if (a.type === 'account' && item.type === 'account') {
          return !(
            a.bankId === item.bankId && a.accountNumber === item.accountNumber
          );
        }
        if (a.type === 'investment' && item.type === 'investment') {
          return a.ticker !== item.ticker;
        }
        return true;
      }),
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showMentionDropdown && filteredItems.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedAccountIndex((prev) => (prev + 1) % filteredItems.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedAccountIndex(
          (prev) => (prev - 1 + filteredItems.length) % filteredItems.length,
        );
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        insertMention(filteredItems[selectedAccountIndex]);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowMentionDropdown(false);
        return;
      }
    }

    if (e.key === 'Backspace' && !prompt) {
      setTaggedItems((prev) => prev.slice(0, -1));
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      setShowMentionDropdown(false);
      triggerSubmit();
    }
  };

  const triggerSubmit = () => {
    if (!prompt.trim() && taggedItems.length === 0) return;

    let finalPrompt = prompt;
    if (taggedItems.length > 0) {
      const tags = taggedItems
        .map((item) => {
          if (item.type === 'investment') {
            return ` \`portfolio:${item.ticker}\` `;
          }

          const isCard = ['max', 'isracard', 'cal'].includes(
            normalizeBankId(item.bankId),
          );
          let identifier = item.accountNumber;
          if (isCard) {
            identifier = item.accountNumber.slice(-4);
          } else {
            const normalizedBankId = normalizeBankId(item.bankId);
            if (normalizedBankId === 'hapoalim') {
              const parts = item.accountNumber.split('-');
              if (parts.length >= 3) {
                identifier = parts.slice(2).join('-');
              }
            }
          }
          return ` \`bankid:${item.bankId}:${identifier}\` `;
        })
        .join('');

      finalPrompt = `${prompt}\n\n${tags}`;
    }

    setTaggedItems([]);
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
      {showMentionDropdown && filteredItems.length > 0 && (
        <>
          <div
            className="fixed inset-0 z-40 bg-transparent"
            onClick={() => setShowMentionDropdown(false)}
          />
          <div
            className="absolute bottom-full mb-1.5 left-4 right-4 z-50 border border-border bg-card shadow-2xl p-1 max-h-56 overflow-y-auto rounded-none text-right flex flex-col gap-0.5"
            dir="rtl"
          >
            <div className="px-3 py-1.5 text-[10px] font-black text-muted-foreground border-b border-border/50 uppercase tracking-widest mb-1 select-none">
              בחר חשבון, כרטיס או נכס לקישור
            </div>
            {filteredItems.map((item, index) => {
              const active = index === selectedAccountIndex;

              if (item.type === 'investment') {
                return (
                  <button
                    key={`inv:${item.ticker}`}
                    type="button"
                    onClick={() => insertMention(item)}
                    onMouseEnter={() => setSelectedAccountIndex(index)}
                    className={cn(
                      'w-full px-3 py-2 flex items-center justify-between transition-colors text-right cursor-pointer rounded-none',
                      active
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-muted/50 text-foreground',
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <div className="flex items-center justify-center h-6 w-6 rounded-full bg-blue-500/10 text-blue-500">
                        <ChartLineUp className="h-4 w-4" weight="bold" />
                      </div>
                      <div className="text-right leading-tight">
                        <div
                          className={cn(
                            'text-xs font-black',
                            active
                              ? 'text-primary-foreground'
                              : 'text-foreground',
                          )}
                        >
                          {item.name}
                        </div>
                        <div
                          className={cn(
                            'text-[9px] font-semibold',
                            active
                              ? 'text-primary-foreground/75'
                              : 'text-muted-foreground',
                          )}
                        >
                          תיק השקעות
                        </div>
                      </div>
                    </div>
                    <div
                      className={cn(
                        'text-[10px] font-mono font-bold',
                        active
                          ? 'text-primary-foreground/80'
                          : 'text-muted-foreground/85',
                      )}
                    >
                      {item.ticker}
                    </div>
                  </button>
                );
              }

              const isCard = ['max', 'isracard', 'cal'].includes(
                normalizeBankId(item.bankId),
              );
              let identifier = item.accountNumber;
              if (isCard) {
                identifier = item.accountNumber.slice(-4);
              } else {
                const normalizedBankId = normalizeBankId(item.bankId);
                if (normalizedBankId === 'hapoalim') {
                  const parts = item.accountNumber.split('-');
                  if (parts.length >= 3) {
                    identifier = parts.slice(2).join('-');
                  }
                }
              }
              return (
                <button
                  key={`${item.bankId}:${item.accountNumber}`}
                  type="button"
                  onClick={() => insertMention(item)}
                  onMouseEnter={() => setSelectedAccountIndex(index)}
                  className={cn(
                    'w-full px-3 py-2 flex items-center justify-between transition-colors text-right cursor-pointer rounded-none',
                    active
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-muted/50 text-foreground',
                  )}
                >
                  <div className="flex items-center gap-2">
                    <BankIcon
                      bankId={item.bankId}
                      size="sm"
                      className="!h-6 !w-6"
                    />
                    <div className="text-right leading-tight">
                      <div
                        className={cn(
                          'text-xs font-black',
                          active
                            ? 'text-primary-foreground'
                            : 'text-foreground',
                        )}
                      >
                        {getBankName(item.bankId)}
                      </div>
                      <div
                        className={cn(
                          'text-[9px] font-semibold',
                          active
                            ? 'text-primary-foreground/75'
                            : 'text-muted-foreground',
                        )}
                      >
                        {isCard ? 'כרטיס אשראי' : 'חשבון בנק'}
                      </div>
                    </div>
                  </div>
                  <div
                    className={cn(
                      'text-[10px] font-mono font-bold',
                      active
                        ? 'text-primary-foreground/80'
                        : 'text-muted-foreground/85',
                    )}
                  >
                    {identifier}
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}

      {taggedItems.length > 0 && (
        <div
          className="flex flex-wrap gap-1.5 px-4 pt-3 pb-1 border-b border-border/50 bg-muted/5 text-right"
          dir="rtl"
        >
          {taggedItems.map((item) => {
            if (item.type === 'investment') {
              return (
                <div
                  key={`inv:${item.ticker}`}
                  className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-blue-500/10 border border-blue-500/20 text-blue-500 text-xs font-semibold select-none align-middle rounded-full animate-in fade-in zoom-in-95 duration-150"
                >
                  <ChartLineUp className="h-3.5 w-3.5" weight="bold" />
                  <span>{item.ticker}</span>
                  <button
                    type="button"
                    onClick={() => removeTaggedItem(item)}
                    className="mr-1 hover:text-destructive text-blue-500/60 transition-colors cursor-pointer flex items-center justify-center h-4 w-4 rounded-full hover:bg-blue-500/20"
                  >
                    <X className="h-3 w-3" weight="bold" />
                  </button>
                </div>
              );
            }

            const isCard = ['max', 'isracard', 'cal'].includes(
              normalizeBankId(item.bankId),
            );
            let identifier = item.accountNumber;
            if (isCard) {
              identifier = item.accountNumber.slice(-4);
            } else {
              const normalizedBankId = normalizeBankId(item.bankId);
              if (normalizedBankId === 'hapoalim') {
                const parts = item.accountNumber.split('-');
                if (parts.length >= 3) {
                  identifier = parts.slice(2).join('-');
                }
              }
            }
            return (
              <div
                key={`${item.bankId}:${item.accountNumber}`}
                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-muted border border-border text-xs font-semibold text-foreground select-none align-middle rounded-full animate-in fade-in zoom-in-95 duration-150"
              >
                <BankIcon
                  bankId={item.bankId}
                  size="sm"
                  className="!h-4 !w-4 border-none"
                />
                <span>
                  {getBankName(item.bankId)} • {identifier}
                </span>
                <button
                  type="button"
                  onClick={() => removeTaggedItem(item)}
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
        placeholder={
          selectedModel
            ? 'הקלד כאן שאלה... (השתמש ב-@ כדי לתייג חשבון או השקעה)'
            : 'יש לחבר ספק AI על מנת לשלוח הודעות'
        }
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
          disabled={
            (!prompt.trim() && taggedItems.length === 0) ||
            isLoading ||
            !selectedModel
          }
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
