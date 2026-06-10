import { CircleNotch, Sparkle } from '@phosphor-icons/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import type { LocalMessage } from './useAiStream';
import { BankChip } from './BankChip';

interface AiMessageBubbleProps {
  message: LocalMessage;
  isLoading?: boolean;
  isLast?: boolean;
  toolStatus?: string | null;
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
}: AiMessageBubbleProps) {
  const isUser = message.role === 'user';

  if (isUser) {
    return (
      <div className="flex w-full justify-start">
        <div className="max-w-[75%] rounded-[24px] px-5 py-3 text-[17px] font-semibold shadow-xs border border-border/30 bg-secondary text-foreground text-right">
          <div className="markdown-content max-w-none break-words space-y-2 leading-7 text-right">
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
          <div className="markdown-content max-w-none break-words space-y-2 leading-7 text-right text-foreground text-[17px]">
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

