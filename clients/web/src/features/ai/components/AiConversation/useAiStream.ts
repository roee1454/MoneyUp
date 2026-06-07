import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api, API_BASE } from '@/lib/api';
import { useCreateConversation, useAddMessage } from '@/hooks/useAi';
import type { AiProvider } from '../AiIcon';

export type LocalMessage = {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  text: string;
  tool_calls?: any[];
  tool_call_id?: string;
};

interface UseAiStreamProps {
  provider: AiProvider;
  selectedModel: string;
  temperature: number;
  maxTokens: number;
  forceMarkdown: boolean;
  streaming: boolean;
  conversationId: string | null;
  conversationDetail: any;
  onConversationCreated: (id: string) => void;
}

export function useAiStream({
  provider,
  selectedModel,
  temperature,
  maxTokens,
  forceMarkdown,
  streaming,
  conversationId,
  conversationDetail,
  onConversationCreated,
}: UseAiStreamProps) {
  const [messages, setMessages] = useState<LocalMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeSources, setActiveSources] = useState<string[]>([]);
  const [toolStatus, setToolStatus] = useState<string | null>(null);

  const activeConversationIdRef = useRef<string | null>(conversationId);
  const isCreatingConversationRef = useRef(false);

  const createMutation = useCreateConversation();
  const addMessageMutation = useAddMessage();
  const queryClient = useQueryClient();

  // Keep the activeConversationIdRef synchronized with the prop
  useEffect(() => {
    activeConversationIdRef.current = conversationId;
  }, [conversationId]);

  // Sync messages from React Query history when not loading/submitting
  useEffect(() => {
    if (!conversationId) {
      setMessages([]);
      setError('');
      return;
    }

    if (isCreatingConversationRef.current) {
      return;
    }

    if (
      !isLoading &&
      conversationDetail &&
      conversationDetail.conversation?.id === conversationId
    ) {
      setMessages(
        conversationDetail.messages.map((m: any) => ({
          id: m.id,
          role: m.role,
          text: m.content,
          tool_calls: m.tool_calls,
          tool_call_id: m.tool_call_id,
        })),
      );
    }
  }, [conversationId, conversationDetail, isLoading]);

  const processSubmit = async (textToSubmit: string) => {
    const trimmedPrompt = textToSubmit.trim();
    if (!trimmedPrompt || !selectedModel || isLoading) return;

    let targetConvId = activeConversationIdRef.current;

    // Auto-create conversation if this is the first message
    if (!targetConvId) {
      setIsLoading(true);
      isCreatingConversationRef.current = true;
      try {
        const title =
          trimmedPrompt.length > 30
            ? `${trimmedPrompt.slice(0, 30)}...`
            : trimmedPrompt;
        const newConv = await createMutation.mutateAsync(title);
        targetConvId = newConv.id;
        activeConversationIdRef.current = targetConvId;
        onConversationCreated(targetConvId);
        isCreatingConversationRef.current = false;
      } catch (err) {
        setError('שגיאה ביצירת שיחה חדשה');
        setIsLoading(false);
        isCreatingConversationRef.current = false;
        return;
      }
    }

    const userMessage: LocalMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      text: trimmedPrompt,
    };

    const assistantId = crypto.randomUUID();

    setMessages((prev) => [
      ...prev,
      userMessage,
      { id: assistantId, role: 'assistant', text: '' },
    ]);

    setError('');
    setIsLoading(true);
    setActiveSources([]);
    setToolStatus(null);

    const messagesToSend = [
      ...messages.map((m) => ({
        role: m.role,
        content: m.text,
        tool_calls: m.tool_calls,
        tool_call_id: m.tool_call_id,
      })),
      { role: 'user' as const, content: trimmedPrompt },
    ];

    // Persist user message in the background
    try {
      await addMessageMutation.mutateAsync({
        conversationId: targetConvId,
        role: 'user',
        content: trimmedPrompt,
      });
    } catch (e) {
      console.error('Failed to save user message', e);
    }

    if (streaming) {
      let finalAssistantText = '';
      try {
        const res = await fetch(`${API_BASE}/ai/prompt/stream`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            provider,
            model: selectedModel,
            messages: messagesToSend,
            conversationId: targetConvId,
            temperature,
            maxTokens,
            forceMarkdown,
          }),
        });

        if (!res.ok) {
          throw new Error(`Streaming failed: ${res.status}`);
        }
        if (!res.body) throw new Error('Response body is empty');

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split(/\n\n+/);
          buffer = parts.pop() ?? '';

          for (const part of parts) {
            const lines = part.split(/\r\n|\r|\n/);
            const dataLines: string[] = [];

            for (const line of lines) {
              if (line.startsWith('data:')) {
                let lineContent = line.slice(5);
                if (lineContent.startsWith(' '))
                  lineContent = lineContent.slice(1);
                dataLines.push(lineContent);
              }
            }

            if (dataLines.length === 0) continue;
            if (dataLines.includes('[DONE]')) continue;

            const combinedData = dataLines.join('\n');

            try {
              const parsed = JSON.parse(combinedData);

              if (parsed.type === 'metadata') {
                if (parsed.bankIds) {
                  setActiveSources(parsed.bankIds);
                }
                continue;
              }

              if (parsed.type === 'tool_call') {
                if (parsed.name === 'get_spending_summary') {
                  setToolStatus('מנתח סיכום הוצאות...');
                } else if (parsed.name === 'query_transactions') {
                  setToolStatus('מחפש תנועות רלוונטיות...');
                } else if (parsed.name === 'find_merchants_by_topic') {
                  setToolStatus('ממפה בתי עסק לפי נושא...');
                } else {
                  setToolStatus('מפעיל כלי ניתוח...');
                }
                continue;
              }

              if (parsed.type === 'text' && parsed.content) {
                setToolStatus(null);
                const textChunk = parsed.content;
                finalAssistantText += textChunk;
                setMessages((prev) =>
                  prev.map((message) =>
                    message.id === assistantId
                      ? { ...message, text: message.text + textChunk }
                      : message,
                  ),
                );
              }
            } catch (e) {
              console.error('Failed to parse stream chunk', e, combinedData);
            }
          }
        }
      } catch (streamError: any) {
        setError(streamError.message || 'Stream connection failed');
      }

      setIsLoading(false);
      setActiveSources([]);
      setToolStatus(null);

      // Invalidate query to sync final saved assistant message from DB
      if (targetConvId) {
        void queryClient.invalidateQueries({
          queryKey: ['ai-conversation', targetConvId],
        });
        void queryClient.invalidateQueries({
          queryKey: ['ai-conversations'],
        });
      }
      return;
    }

    // Non-streaming logic
    try {
      const response = await api.post<{ text: string }>('/ai/prompt', {
        provider,
        model: selectedModel,
        messages: messagesToSend,
        conversationId: targetConvId,
        temperature,
        maxTokens,
        forceMarkdown,
      });

      setMessages((prev) =>
        prev.map((message) =>
          message.id === assistantId
            ? { ...message, text: response.text ?? '' }
            : message,
        ),
      );
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'שליחת ההודעה נכשלה',
      );
      setMessages((prev) =>
        prev.map((message) =>
          message.id === assistantId
            ? { ...message, text: 'אירעה שגיאה בקבלת תשובה מהעוזר.' }
            : message,
        ),
      );
    } finally {
      setIsLoading(false);
      if (targetConvId) {
        void queryClient.invalidateQueries({
          queryKey: ['ai-conversation', targetConvId],
        });
        void queryClient.invalidateQueries({
          queryKey: ['ai-conversations'],
        });
      }
    }
  };

  return {
    messages,
    setMessages,
    isLoading,
    setIsLoading,
    error,
    setError,
    activeSources,
    setActiveSources,
    toolStatus,
    setToolStatus,
    activeConversationIdRef,
    processSubmit,
  };
}
