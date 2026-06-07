export interface AiMessage {
  id?: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  tool_calls?: AiToolCall[];
  tool_call_id?: string;
}

export interface AiToolCall {
  id: string;
  name: string;
  arguments: Record<string, any>;
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
