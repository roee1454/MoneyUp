import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { AiMessageBubble } from './AiMessageBubble';
import type { LocalMessage } from './useAiStream';
import { Sparkle } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';

interface AiMessageListProps {
  messages: LocalMessage[];
  isLoading: boolean;
  toolStatus: string | null;
  defaultPrompts: string[];
  selectedModel: string;
  onPromptClick: (prompt: string) => void;
  hasAiProvider?: boolean;
  onConnectClick?: () => void;
}

export function AiMessageList({
  messages,
  isLoading,
  toolStatus,
  defaultPrompts,
  selectedModel,
  onPromptClick,
  hasAiProvider = true,
  onConnectClick,
}: AiMessageListProps) {
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const visibleMessages = messages.filter(
    (m) =>
      m.role !== 'system' &&
      m.role !== 'tool' &&
      !(m.role === 'assistant' && !m.text && m.tool_calls?.length)
  );

  const hasMessages = messages.length > 0;

  return (
    <div
      dir="rtl"
      className={cn(
        'flex-1 min-h-0 bg-transparent py-4 pb-6 md:py-5 md:pb-7 custom-scrollbar',
        hasMessages ? 'overflow-y-auto' : 'overflow-hidden'
      )}
    >
      {!hasMessages ? (
        !hasAiProvider ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-4 animate-in fade-in-50 duration-300">
            {/* Glowing Animated AI Sparkle Orb in orange */}
            <div className="relative mb-8 flex h-28 w-28 items-center justify-center select-none">
              {/* Outer Glow Ring */}
              <div className="absolute inset-0 rounded-full bg-radial-to-br from-amber-500/30 via-amber-500/5 to-transparent blur-md animate-pulse duration-[4s]" />
              {/* Orbit rings */}
              <div className="absolute inset-2 rounded-full border border-dashed border-amber-500/20 animate-spin" style={{ animationDuration: '20s' }} />
              <div className="absolute inset-5 rounded-full border border-dotted border-amber-500/30 animate-spin" style={{ animationDuration: '10s', animationDirection: 'reverse' }} />
              {/* Centered Glowing Shape */}
              <div className="relative flex h-16 w-16 items-center justify-center border border-amber-500/35 bg-background shadow-xl shadow-amber-500/10 rounded-full">
                <Sparkle className="h-8 w-8 text-amber-500 animate-pulse" style={{ animationDuration: '2.5s' }} weight="fill" />
              </div>
            </div>

            <div className="mb-8 space-y-3.5 max-w-md mx-auto">
              <h3 className="text-2xl font-black text-foreground uppercase tracking-tight">
     נצל את כוחה של הבינה המלאכותית
              </h3>
              <p className="text-[13px] font-semibold text-muted-foreground leading-relaxed">
                על מנת להתחיל להתייעץ עם הסוכן הפיננסי שלך, יש לחבר לפחות ספק API אחד (כגון Gemini, OpenAI או Claude).
              </p>
              <div className="pt-2 flex justify-center">
                <Button
                  onClick={onConnectClick}
                  className="rounded-none font-black text-xs h-11 bg-primary hover:bg-primary text-primary-foreground shadow-lg shadow-black/10 flex items-center gap-2 px-6 cursor-pointer border border-neutral-800"
                >
                  <Sparkle className="h-4 w-4" weight="fill" />
                  <span>חבר ספק AI</span>
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center p-4">
            {/* Glowing Animated AI Sparkle Orb */}
            <div className="relative mb-8 flex h-28 w-28 items-center justify-center select-none">
              {/* Outer Glow Ring */}
              <div className="absolute inset-0 rounded-full bg-radial-to-br from-primary/30 via-primary/5 to-transparent blur-md animate-pulse duration-[4s]" />
              {/* Orbit rings */}
              <div className="absolute inset-2 rounded-full border border-dashed border-primary/20 animate-spin" style={{ animationDuration: '20s' }} />
              <div className="absolute inset-5 rounded-full border border-dotted border-muted-foreground/30 animate-spin" style={{ animationDuration: '10s', animationDirection: 'reverse' }} />
              {/* Centered Glowing Shape */}
              <div className="relative flex h-16 w-16 items-center justify-center border border-primary/35 bg-background shadow-xl shadow-primary/10 rounded-full">
                <Sparkle className="h-8 w-8 text-primary animate-pulse" style={{ animationDuration: '2.5s' }} weight="fill" />
              </div>
            </div>

            <div className="mb-8 space-y-2.5">
              <h3 className="text-2xl font-black text-foreground uppercase tracking-tight">
                כיצד אוכל לסייע לך היום?
              </h3>
              <p className="text-xs font-semibold text-muted-foreground max-w-sm mx-auto leading-relaxed">
                שאל אותי על הוצאות, הכנסות, מנויים מחזוריים או ניתוח מגמות בחשבונות המחוברים שלך.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 w-full max-w-2xl">
              {defaultPrompts.map((p) => (
                <button
                  key={p}
                  onClick={() => onPromptClick(p)}
                  disabled={isLoading || !selectedModel}
                  className="p-4 text-right border border-border bg-card hover:bg-muted/50 hover:border-foreground/30 transition-all rounded-none text-xs font-bold text-foreground/80 hover:text-foreground group cursor-pointer shadow-xs active:scale-[0.99]"
                >
                  {p}
                  <div className="mt-2 text-[10px] text-primary font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                    שלח שאלה זו ←
                  </div>
                </button>
              ))}
            </div>
          </div>
        )
      ) : (
        <div className="max-w-5xl mx-auto w-full space-y-6 flex flex-col px-3 md:px-5">
          {visibleMessages.map((message, index) => {
            const isLast = index === visibleMessages.length - 1;
            return (
              <AiMessageBubble
                key={message.id}
                message={message}
                isLoading={isLoading}
                isLast={isLast}
                toolStatus={toolStatus}
              />
            );
          })}
        </div>
      )}
      <div ref={endRef} />
    </div>
  );
}
