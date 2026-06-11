import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAppStore } from '@/store';

import type { AiMessage, Conversation, ConversationDetail } from '@money-up/types';

export type Message = AiMessage;
export type { Conversation, ConversationDetail };

/**
 * Fetches all AI conversation sessions for the current user.
 *
 * @returns The React Query result containing the list of AI conversations.
 */
export function useConversations() {
  const session = useAppStore((s) => s.session);
  return useQuery({
    queryKey: ['ai-conversations'],
    queryFn: () => api.get<Conversation[]>('/ai/conversations'),
    enabled: !!session,
  });
}

/**
 * Fetches the detail of a specific AI conversation by its ID, including all its messages.
 *
 * @param id - The unique identifier of the AI conversation, or null if none is selected.
 * @returns The React Query result containing the conversation detail.
 */
export function useConversation(id: string | null) {
  const session = useAppStore((s) => s.session);
  return useQuery({
    queryKey: ['ai-conversation', id],
    queryFn: () => api.get<ConversationDetail>(`/ai/conversations/${id}`),
    enabled: !!session && !!id,
  });
}

/**
 * Creates a new AI conversation session and invalidates the conversations list query.
 *
 * @returns The React Query mutation object for creating a conversation.
 */
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

/**
 * Adds a message to an existing AI conversation and invalidates related queries.
 *
 * @returns The React Query mutation object for adding a message.
 */
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

/**
 * Deletes a specific AI conversation session and invalidates the conversations list query.
 *
 * @returns The React Query mutation object for deleting a conversation.
 */
export function useDeleteConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/ai/conversations/${id}`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['ai-conversations'] });
    },
  });
}

/**
 * Truncates an AI conversation from a specific message ID onwards and invalidates related queries.
 *
 * @returns The React Query mutation object for truncating the conversation.
 */
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
