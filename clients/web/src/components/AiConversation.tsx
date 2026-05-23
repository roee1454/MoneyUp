import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { CircleNotch, ChatText, PaperPlaneRight, Sliders } from '@phosphor-icons/react';
import ReactMarkdown from 'react-markdown';
import { useFetchAiModels } from '@/hooks/useAi';
import { api } from '@/lib/api';
import type { AiProvider } from '@/components/AiIcon';
import { Button } from '@/components/ui/button';
import { PremiumInput } from '@/components/ui/premium-input';
import { Select, SelectItem } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
};

interface AiConversationProps {
  provider: AiProvider;
  preferredModel?: string | null;
  userProfile?: {
    aiProviderConfigs?: Record<string, any> | null;
  } | null;
}

const debugEnabled = import.meta.env.VITE_DEBUG_AI_CHAT === 'true';

export function AiConversation({ provider, preferredModel, userProfile }: AiConversationProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const providerConfig = useMemo(() => {
    return userProfile?.aiProviderConfigs?.[provider] || {};
  }, [userProfile, provider]);

  const [streaming, setStreaming] = useState(providerConfig.stream ?? false);
  const [temperature, setTemperature] = useState(providerConfig.temperature ?? 0.7);
  const [maxTokens, setMaxTokens] = useState(providerConfig.maxTokens ?? 1024);
  const [modelOverride, setModelOverride] = useState('');
  const [showDebug, setShowDebug] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);

  const modelsQuery = useFetchAiModels(provider);
  const availableModels = useMemo(() => modelsQuery.data ?? [], [modelsQuery.data]);
  const selectedModel = modelOverride || preferredModel || availableModels[0] || '';

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  useEffect(() => {
    setMessages([]);
    setPrompt('');
    setError('');
    setModelOverride('');
    setStreaming(providerConfig.stream ?? false);
    setTemperature(providerConfig.temperature ?? 0.7);
    setMaxTokens(providerConfig.maxTokens ?? 1024);
  }, [provider, preferredModel, providerConfig]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt || !selectedModel || isLoading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      text: trimmedPrompt,
    };
    const assistantId = crypto.randomUUID();
    setMessages((prev) => [...prev, userMessage, { id: assistantId, role: 'assistant', text: '' }]);
    setPrompt('');
    setError('');
    setIsLoading(true);

    if (streaming) {
      const qs = new URLSearchParams({
        provider,
        model: selectedModel,
        prompt: trimmedPrompt,
        temperature: String(temperature),
        maxTokens: String(maxTokens),
      });
      const eventSource = new EventSource(`http://localhost:3000/ai/prompt/stream?${qs.toString()}`, {
        withCredentials: true,
      });

      eventSource.onmessage = (eventData) => {
        const chunk = String(eventData.data ?? '');
        if (!chunk) return;
        setMessages((prev) =>
          prev.map((message) =>
            message.id === assistantId
              ? { ...message, text: `${message.text}${chunk}` }
              : message,
          ),
        );
      };

      eventSource.onerror = () => {
        eventSource.close();
        setIsLoading(false);
      };

      eventSource.addEventListener('end', () => {
        eventSource.close();
        setIsLoading(false);
      });

      setTimeout(() => {
        if (eventSource.readyState !== EventSource.CLOSED) {
          eventSource.close();
          setIsLoading(false);
        }
      }, 180000);
      return;
    }

    try {
      const response = await api.post<{ text: string }>('/ai/prompt', {
        provider,
        model: selectedModel,
        prompt: trimmedPrompt,
        temperature,
        maxTokens,
      });
      setMessages((prev) =>
        prev.map((message) =>
          message.id === assistantId ? { ...message, text: response.text ?? '' } : message,
        ),
      );
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'שליחת ההודעה נכשלה');
      setMessages((prev) =>
        prev.map((message) =>
          message.id === assistantId
            ? { ...message, text: 'אירעה שגיאה בקבלת תשובה מהעוזר.' }
            : message,
        ),
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="h-full min-h-0 flex flex-col gap-3">
      <div
        dir="rtl"
        className={cn(
          'flex-1 min-h-0 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 px-3 py-4 pb-6 md:px-5 md:py-5 md:pb-7 space-y-3',
          messages.length > 0 ? 'overflow-y-auto' : 'overflow-hidden',
        )}
      >
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-center">
            <p className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">
              שאל שאלה כדי להתחיל שיחה עם העוזר החכם
            </p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'assistant' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={
                  message.role === 'user'
                    ? 'max-w-[90%] rounded-[1.75rem] rounded-br-md bg-zinc-900 text-white px-5 py-3 text-sm font-semibold'
                    : 'max-w-[90%] rounded-[1.75rem] rounded-bl-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-5 py-3 text-sm font-semibold text-zinc-800 dark:text-zinc-200'
                }
              >
                <div
                  className={cn(
                    'markdown-content max-w-none wrap-break-word space-y-2 leading-7 text-right',
                    message.role === 'user' ? 'text-white' : 'text-zinc-800 dark:text-zinc-200',
                  )}
                >
                  <ReactMarkdown>
                    {message.text || (isLoading && message.role === 'assistant' ? '...' : '')}
                  </ReactMarkdown>
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={endRef} />
      </div>

      {error ? (
        <p className="text-xs font-bold text-red-500 bg-red-50 dark:bg-red-950/30 px-4 py-2.5 rounded-2xl border border-red-200/50 dark:border-red-900/30 text-right">
          {error}
        </p>
      ) : null}

      <form
        onSubmit={handleSubmit}
        className="mt-auto flex items-center gap-2 rounded-4xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-2.5 py-2"
      >
        {debugEnabled && (
          <Button
            type="button"
            onClick={() => setShowDebug(true)}
            variant="outline"
            className="h-12 w-12 rounded-full border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 p-0 text-zinc-600 hover:text-zinc-950 dark:hover:text-zinc-100 flex items-center justify-center shrink-0 cursor-pointer"
          >
            <Sliders className="h-4.5 w-4.5" weight="duotone" />
          </Button>
        )}
        <PremiumInput
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          placeholder="הקלד כאן שאלה..."
          className="w-full h-12 rounded-full text-sm font-semibold"
          disabled={isLoading || !selectedModel}
        />
        <Button
          type="submit"
          disabled={!prompt.trim() || isLoading || !selectedModel}
          className="h-12 rounded-full px-5 font-bold text-sm bg-zinc-950 hover:bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-100"
        >
          {isLoading ? <CircleNotch className="h-4 w-4 animate-spin" /> : <PaperPlaneRight className="h-4 w-4" weight="duotone" />}
          <span className="hidden sm:inline">{isLoading ? 'שולח...' : 'שלח'}</span>
          <span className="sm:hidden">
            <ChatText className="h-4 w-4" weight="duotone" />
          </span>
        </Button>
      </form>

      {/* Debug Advanced Parameter Dialog */}
      {debugEnabled && (
        <Dialog open={showDebug} onOpenChange={setShowDebug}>
          <DialogContent
            className="max-w-md bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-3xl text-right"
            dir="rtl"
            showCloseButton={true}
          >
            <DialogHeader className="text-right">
              <DialogTitle className="text-base font-black text-zinc-950 dark:text-white">הגדרות דיבאג מתקדמות</DialogTitle>
              <DialogDescription className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                שנה פרמטרי מודל ומשתני שיחה בזמן אמת.
              </DialogDescription>
            </DialogHeader>
            
            <div className="py-4 space-y-4 text-xs font-semibold text-zinc-700 dark:text-zinc-300 max-h-96 overflow-y-auto pr-1">
              <div className="space-y-1 text-right">
                <Label className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400">Model Override</Label>
                <Select value={modelOverride} onValueChange={(val) => setModelOverride(val)} placeholder="Use Profile Default">
                  <SelectItem value="">Use Profile Default</SelectItem>
                  {availableModels.map((model) => (
                    <SelectItem key={model} value={model}>
                      {model}
                    </SelectItem>
                  ))}
                </Select>
              </div>

              <div className="flex items-center justify-between gap-2 py-1">
                <Label className="font-bold text-zinc-600 dark:text-zinc-300">Streaming</Label>
                <Switch checked={streaming} onCheckedChange={(val) => setStreaming(val)} />
              </div>

              <div className="space-y-1.5 text-right">
                <Label className="font-bold text-zinc-600 dark:text-zinc-300">Temperature: {temperature.toFixed(1)}</Label>
                <Slider
                  min={0}
                  max={2}
                  step={0.1}
                  value={temperature}
                  onValueChange={(val) => setTemperature(val)}
                />
              </div>

              <div className="space-y-1 text-right">
                <Label className="font-bold text-zinc-600 dark:text-zinc-300">Max Tokens</Label>
                <PremiumInput
                  type="number"
                  value={maxTokens}
                  onChange={(event) => setMaxTokens(Number(event.target.value) || 1)}
                  className="h-10 text-xs"
                  min={1}
                  dir="ltr"
                />
              </div>
            </div>

            <DialogFooter className="sm:justify-start">
              <Button
                type="button"
                onClick={() => setShowDebug(false)}
                className="w-full sm:w-auto h-10 text-xs font-bold bg-zinc-950 hover:bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-100 rounded-full px-6"
              >
                סגור הגדרות
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
