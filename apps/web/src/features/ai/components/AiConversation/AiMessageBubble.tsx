import { CircleNotch, Sparkle, PencilSimple } from '@phosphor-icons/react';
import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import type { LocalMessage } from './useAiStream';
import { BankChip } from './BankChip';
import { InvestmentSimulator, InvestmentSimulatorSkeleton } from './InvestmentSimulator';

interface AiMessageBubbleProps {
  message: LocalMessage;
  isLoading?: boolean;
  isLast?: boolean;
  toolStatus?: string | null;
  selectedModel?: string;
  onEditSubmit?: (messageId: string, newText: string) => void;
}

/** Custom renderer for inline `code` nodes.
 *  If the content starts with "bankid:" we render a BankChip instead of <code>. */
function InlineCode({ children, isUser: _isUser }: { children?: React.ReactNode; isUser?: boolean }) {
  const raw = String(children ?? '');
  if (raw.startsWith('bankid:')) {
    const content = raw.slice('bankid:'.length).trim();
    const parts = content.split(':');
    const bankId = parts[0];
    const accountIdentifier = parts.slice(1).join(':') || undefined;
    return (
      <BankChip
        bankId={bankId}
        accountIdentifier={accountIdentifier}
      />
    );
  }
  return (
    <code className="rounded px-1 py-0.5 bg-muted text-[0.8em] font-mono">
      {children}
    </code>
  );
}

export function AiMessageBubble({
  message,
  isLoading,
  isLast,
  toolStatus,
  onEditSubmit,
}: AiMessageBubbleProps) {
  const isUser = message.role === 'user';
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(message.text);

  if (isUser) {
    if (isEditing) {
      return (
        <div className="flex w-full justify-start">
          <div className="w-full max-w-2xl rounded-[24px] px-5 py-4 shadow-sm border border-border/40 bg-secondary text-foreground text-right space-y-3">
            <textarea
              className="w-full bg-background border border-border/50 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none dir-rtl custom-scrollbar min-h-[100px]"
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              dir="auto"
            />
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => {
                  setIsEditing(false);
                  setEditText(message.text);
                }}
                className="text-xs font-bold px-4 py-2 hover:bg-muted/50 rounded-lg text-muted-foreground transition-colors cursor-pointer"
              >
                ביטול
              </button>
              <button
                onClick={() => {
                  if (editText.trim() && editText !== message.text && onEditSubmit) {
                    onEditSubmit(message.id, editText);
                  }
                  setIsEditing(false);
                }}
                className="text-xs font-bold px-4 py-2 bg-primary text-primary-foreground rounded-lg shadow hover:bg-primary/90 transition-colors cursor-pointer"
              >
                שמור ושלח
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="flex w-full justify-start group relative">
        <div className="max-w-[75%] rounded-[24px] px-5 py-3 text-sm font-semibold shadow-xs border border-border/30 bg-secondary text-foreground text-right">
          <div className="markdown-content max-w-none wrap-break-word space-y-2 leading-7 text-right">
            <ReactMarkdown
              remarkPlugins={[remarkGfm, remarkMath]}
              rehypePlugins={[rehypeKatex]}
              components={{
                code({ node: _node, className, children, ...props }) {
                  const isBlock = Boolean(className);
                  if (isBlock) {
                    return (
                      <code className={className} {...props}>
                        {children}
                      </code>
                    );
                  }
                  return <InlineCode isUser={true} {...props}>{children}</InlineCode>;
                },
              }}
            >
              {message.text}
            </ReactMarkdown>
          </div>
        </div>
        {onEditSubmit && !isLoading && (
          <button
            onClick={() => setIsEditing(true)}
            className="absolute -left-10 top-2 p-2 rounded-full text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity hover:bg-muted hover:text-foreground cursor-pointer"
            title="ערוך הודעה"
          >
            <PencilSimple className="w-4 h-4" />
          </button>
        )}
      </div>
    );
  }

  // Assistant Message (Gemini style)
  const showSkeleton = isLoading && isLast && !message.text;

  return (
    <div className="flex w-full justify-start items-start gap-4">
      {/* Sparkle Icon Avatar */}
      <div className="shrink-0 mt-1">
        <div className="h-8 w-8 rounded-full border border-border bg-card flex items-center justify-center text-primary shadow-xs">
          <Sparkle className="h-4.5 w-4.5 text-primary animate-pulse" style={{ animationDuration: '3s' }} weight="fill" />
        </div>
      </div>

      {/* AI Response Text or Shimmering Skeleton */}
      <div className="flex-1 max-w-full min-w-0">
        {showSkeleton ? (
          <div className="space-y-3 w-full py-2">
            {toolStatus && (
              <div className="flex items-center gap-2 text-muted-foreground/80 mb-3 animate-pulse">
                <CircleNotch className="h-3.5 w-3.5 animate-spin" />
                <span className="text-[11px] font-black uppercase tracking-widest">
                  {toolStatus}
                </span>
              </div>
            )}
            <div className="h-3 bg-muted rounded-full w-full animate-soft-shimmer" />
            <div className="h-3 bg-muted rounded-full w-[85%] animate-soft-shimmer" />
            <div className="h-3 bg-muted rounded-full w-[60%] animate-soft-shimmer" />
          </div>
        ) : (
          <div className="markdown-content max-w-none wrap-break-word space-y-2 leading-7 text-right text-foreground">
            {/* Generative UI: Render Investment Simulator if requested */}
            {message.tool_calls?.map((tc: any, idx: number) => {
              const name = tc.name || tc.function?.name;
              if (name === 'render_investment_simulator') {
                try {
                  const args = typeof tc.arguments === 'string' 
                    ? JSON.parse(tc.arguments) 
                    : (tc.arguments || (tc.function?.arguments ? JSON.parse(tc.function.arguments) : {}));
                    
                  if (tc.isStreamingPlaceholder || args?.isStreamingPlaceholder) {
                    return <InvestmentSimulatorSkeleton key={`sim-skeleton-${idx}`} />;
                  }
                  
                  return (
                    <InvestmentSimulator
                      key={`sim-${idx}`}
                      assetA={args.assetA || 'Asset A'}
                      assetB={args.assetB || 'Asset B'}
                      taxRateA={args.taxRateA || 0.15}
                      taxRateB={args.taxRateB || 0.25}
                      terA={args.terA || 0.07}
                      terB={args.terB || 0.03}
                      isAccumulatingA={args.isAccumulatingA ?? true}
                      isAccumulatingB={args.isAccumulatingB ?? false}
                      currency={args.currency}
                    />
                  );
                } catch (e) {
                  return null;
                }
              }
              return null;
            })}

            <ReactMarkdown
              remarkPlugins={[remarkGfm, remarkMath]}
              rehypePlugins={[rehypeKatex]}
              components={{
                code({ node: _node, className, children, ...props }) {
                  const isBlock = Boolean(className);
                  if (isBlock) {
                    return (
                      <code className={className} {...props}>
                        {children}
                      </code>
                    );
                  }
                  return <InlineCode isUser={false} {...props}>{children}</InlineCode>;
                },
              }}
            >
              {message.text}
            </ReactMarkdown>

            {isLoading && isLast && toolStatus && (
              <div className="flex items-center gap-2 text-muted-foreground/80 mt-3 pt-2 border-t border-border/10">
                <CircleNotch className="h-3 w-3 animate-spin" />
                <span className="text-[10px] font-bold uppercase tracking-widest">
                  {toolStatus}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

