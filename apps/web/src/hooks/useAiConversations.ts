import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAppStore } from '@/store';

import type { AiMessage, Conversation, ConversationDetail } from '@money-up/types';

export type Message = AiMessage;
export type { Conversation, ConversationDetail };

export function useConversations() {
  const session = useAppStore((s) => s.session);
  return useQuery({
    queryKey: ['ai-conversations'],
    queryFn: () => api.get<Conversation[]>('/ai/conversations'),
    enabled: !!session,
  });
}

export function useConversation(id: string | null) {
  const session = useAppStore((s) => s.session);
  return useQuery({
    queryKey: ['ai-conversation', id],
    queryFn: () => api.get<ConversationDetail>(`/ai/conversations/${id}`),
    enabled: !!session && !!id,
  });
}

export function useCreateConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (title: string) =>
      api.post<Conversation>('/ai/conversations', { title }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['ai-conversations'] });
    },
  });
}

export function useAddMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      conversationId,
      role,
      content,
    }: {
      conversationId: string;
      role: 'user' | 'assistant' | 'system';
      content: string;
    }) =>
      api.post<Message>(`/ai/conversations/${conversationId}/messages`, {
        role,
        content,
      }),
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({ queryKey: ['ai-conversations'] });
      await queryClient.invalidateQueries({
        queryKey: ['ai-conversation', variables.conversationId],
      });
    },
  });
}

export function useDeleteConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/ai/conversations/${id}`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['ai-conversations'] });
    },
  });
}

export function useTruncateConversationMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      conversationId,
      messageId,
    }: {
      conversationId: string;
      messageId: string;
    }) => api.delete(`/ai/conversations/${conversationId}/messages/${messageId}/truncate`),
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({ queryKey: ['ai-conversations'] });
      await queryClient.invalidateQueries({
        queryKey: ['ai-conversation', variables.conversationId],
      });
    },
  });
}
