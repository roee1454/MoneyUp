export type AiProvider = 'openai' | 'claude' | 'gemini' | 'ollama' | 'openrouter';

export type MessageRole = 'user' | 'assistant' | 'system' | 'tool';

export interface AiMessage {
  id?: string;
  role: MessageRole;
  content: string;
  tool_calls?: AiToolCall[];
  tool_call_id?: string;
  createdAt?: string;
}

export interface Conversation {
  id: string;
  title: string;
  updatedAt: string;
  createdAt: string;
}

export interface ConversationDetail {
  conversation: Conversation;
  messages: AiMessage[];
}

export interface AiToolCall {
  id: string;
  name: string;
  arguments: Record<string, any>;
  thoughtSignature?: string;
  thought_signature?: string;
}

export interface AiToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

export type StructuredResponse =
  | { type: 'text'; content: string }
  | { type: 'tool_calls'; tool_calls: AiToolCall[]; content?: string };
