import { create } from 'zustand';
import { AgentProvider } from '@money-up/common';

interface AiState {
  promptDraft: string;
  setPromptDraft: (draft: string) => void;
  agentProvider: AgentProvider;
  setAgentProvider: (provider: AgentProvider) => void;
  agentModel: string;
  setAgentModel: (model: string) => void;
  isStartingModel: boolean;
  setIsStartingModel: (isStarting: boolean) => void;
}

export const useAiStore = create<AiState>((set) => ({
  promptDraft: '',
  setPromptDraft: (draft) => set({ promptDraft: draft }),
  agentProvider: (() => {
    const saved = localStorage.getItem('moneyup_studio_provider') as AgentProvider | null;
    return saved || AgentProvider.Gemini;
  })(),
  setAgentProvider: (provider) => {
    localStorage.setItem('moneyup_studio_provider', provider);
    set({ agentProvider: provider });
  },
  agentModel: (() => {
    const saved = localStorage.getItem('moneyup_studio_model');
    return saved || '';
  })(),
  setAgentModel: (model) => {
    localStorage.setItem('moneyup_studio_model', model);
    set({ agentModel: model });
  },
  isStartingModel: false,
  setIsStartingModel: (isStarting) => set({ isStartingModel: isStarting }),
}));
