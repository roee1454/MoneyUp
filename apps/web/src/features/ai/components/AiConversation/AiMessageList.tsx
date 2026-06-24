import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { AiMessageBubble } from './AiMessageBubble';
import type { LocalMessage } from './useAiStream';
import { Sparkle } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { motion, useReducedMotion, type Variants } from 'motion/react';
import { PremiumMotionCard } from '@/components/ui/premium-motion-card';

interface AiMessageListProps {
  messages: LocalMessage[];
  isLoading: boolean;
  toolStatus: string | null;
  defaultPrompts: string[];
  selectedModel: string;
  onPromptClick: (prompt: string) => void;
  onEditSubmit?: (messageId: string, newText: string) => void;
  hasAiProvider?: boolean;
  onConnectClick?: () => void;
}

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.05,
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

/**
 * Renders the list of active messages in the AI conversation.
 * Handles system/tool message filtering, empty state prompts, and scrolling to the newest message.
 */
export function AiMessageList({
  messages,
  isLoading,
  toolStatus,
  defaultPrompts,
  selectedModel,
  onPromptClick,
  onEditSubmit,
  hasAiProvider = true,
  onConnectClick,
}: AiMessageListProps) {
  const endRef = useRef<HTMLDivElement | null>(null);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const visibleMessages = messages.filter((m) => {
    if (m.role === 'system' || m.role === 'tool') return false;

    // Hide assistant messages that only have tool calls and no text,
    // UNLESS the tool call is our generative UI simulator
    if (m.role === 'assistant' && !m.text && m.tool_calls?.length) {
      const hasSimulator = m.tool_calls.some(
        (tc: any) =>
          (tc.name || tc.function?.name) === 'render_investment_simulator',
      );
      if (!hasSimulator) return false;
    }

    return true;
  });

  const hasMessages = messages.length > 0;
  const MotionContainer = shouldReduceMotion ? 'div' : motion.div;
  const MotionItem = shouldReduceMotion ? 'div' : motion.div;

  return (
    <div
      dir="rtl"
      className={cn(
        'flex-1 min-h-0 bg-transparent py-4 pb-6 md:py-5 md:pb-7 custom-scrollbar',
        hasMessages ? 'overflow-y-auto overflow-x-hidden' : 'overflow-hidden',
      )}
    >
      {!hasMessages ? (
        !hasAiProvider ? (
          <MotionContainer
            className="h-full flex flex-col items-center justify-center text-center p-4"
            {...(!shouldReduceMotion ? { variants: containerVariants, initial: 'hidden', animate: 'visible' } : {})}
          >
            {/* Glowing Animated AI Sparkle Orb in orange */}
            <MotionItem
              className="relative mb-8 flex h-28 w-28 items-center justify-center select-none"
              {...(!shouldReduceMotion ? { variants: itemVariants } : {})}
            >
              {/* Outer Glow Ring */}
              <div className="absolute inset-0 rounded-full bg-radial-to-br from-zinc-500/30 via-zinc-500/5 to-transparent blur-md animate-pulse duration-[4s]" />
              {/* Orbit rings */}
              <div
                className="absolute inset-2 rounded-full border border-dashed border-zinc-500/20 animate-spin"
                style={{ animationDuration: '20s' }}
              />
              <div
                className="absolute inset-5 rounded-full border border-dotted border-zinc-500/30 animate-spin"
                style={{
                  animationDuration: '10s',
                  animationDirection: 'reverse',
                }}
              />
              {/* Centered Glowing Shape */}
              <div className="relative flex h-16 w-16 items-center justify-center border border-zinc-500/35 bg-background shadow-xl shadow-zinc-500/10 rounded-full">
                <Sparkle
                  className="h-8 w-8 text-zinc-700 animate-pulse"
                  style={{ animationDuration: '2.5s' }}
                  weight="fill"
                />
              </div>
            </MotionItem>

            <MotionItem
              className="mb-8 space-y-3.5 max-w-md mx-auto"
              {...(!shouldReduceMotion ? { variants: itemVariants } : {})}
            >
              <h3 className="text-2xl font-black text-foreground uppercase tracking-tight">
                נצל את כוחה של הבינה המלאכותית
              </h3>
              <p className="text-[13px] font-semibold text-muted-foreground leading-relaxed">
                על מנת להתחיל להתייעץ עם הסוכן הפיננסי שלך, יש לחבר לפחות ספק
                API אחד (כגון Gemini, OpenAI או Claude).
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
            </MotionItem>
          </MotionContainer>
        ) : (
          <MotionContainer
            className="h-full flex flex-col items-center justify-center text-center p-4"
            {...(!shouldReduceMotion ? { variants: containerVariants, initial: 'hidden', animate: 'visible' } : {})}
          >
            {/* Glowing Animated AI Sparkle Orb */}
            <MotionItem
              className="relative mb-8 flex h-28 w-28 items-center justify-center select-none"
              {...(!shouldReduceMotion ? { variants: itemVariants } : {})}
            >
              {/* Outer Glow Ring */}
              <div className="absolute inset-0 rounded-full bg-radial-to-br from-primary/30 via-primary/5 to-transparent blur-md animate-pulse duration-[4s]" />
              {/* Orbit rings */}
              <div
                className="absolute inset-2 rounded-full border border-dashed border-primary/20 animate-spin"
                style={{ animationDuration: '20s' }}
              />
              <div
                className="absolute inset-5 rounded-full border border-dotted border-muted-foreground/30 animate-spin"
                style={{
                  animationDuration: '10s',
                  animationDirection: 'reverse',
                }}
              />
              {/* Centered Glowing Shape */}
              <div className="relative flex h-16 w-16 items-center justify-center border border-primary/35 bg-background shadow-xl shadow-primary/10 rounded-full">
                <Sparkle
                  className="h-8 w-8 text-primary animate-pulse"
                  style={{ animationDuration: '2.5s' }}
                  weight="fill"
                />
              </div>
            </MotionItem>

            <MotionItem
              className="mb-8 space-y-2.5"
              {...(!shouldReduceMotion ? { variants: itemVariants } : {})}
            >
              <h3 className="text-2xl font-black text-foreground uppercase tracking-tight">
                כיצד אוכל לסייע לך היום?
              </h3>
              <p className="text-xs font-semibold text-muted-foreground max-w-sm mx-auto leading-relaxed">
                שאל אותי על הוצאות, הכנסות, מנויים מחזוריים או ניתוח מגמות
                בחשבונות המחוברים שלך.
              </p>
            </MotionItem>

            <MotionItem
              className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 w-full max-w-2xl"
              {...(!shouldReduceMotion ? { variants: itemVariants } : {})}
            >
              {defaultPrompts.map((p) => (
                <PremiumMotionCard
                  key={p}
                  onClick={() => onPromptClick(p)}
                  disabled={isLoading || !selectedModel}
                  className="p-4 text-xs font-bold text-foreground/80 hover:text-foreground group active:scale-[0.99]"
                >
                  {p}
                  <div className="mt-2 text-[10px] text-primary font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                    שלח שאלה זו ←
                  </div>
                </PremiumMotionCard>
              ))}
            </MotionItem>
          </MotionContainer>
        )
      ) : (
        <div className="max-w-5xl mx-auto w-full space-y-6 flex flex-col px-3 md:px-5">
          {visibleMessages.map((message, index) => {
            const isLast = index === visibleMessages.length - 1;
            return (
              <motion.div
                key={message.id}
                initial={shouldReduceMotion ? {} : { opacity: 0, y: 12 }}
                animate={shouldReduceMotion ? {} : { opacity: 1, y: 0 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className="w-full animate-none"
              >
                <AiMessageBubble
                  message={message}
                  isLoading={isLoading}
                  isLast={isLast}
                  toolStatus={toolStatus}
                  onEditSubmit={onEditSubmit}
                />
              </motion.div>
            );
          })}
        </div>
      )}
      <div ref={endRef} />
    </div>
  );
}
