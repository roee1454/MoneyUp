import { useEffect, useMemo, useState } from 'react';
import { CircleNotch, Warning } from '@phosphor-icons/react';
import {
  useFetchAiModels,
  useConversation,
  useSaveAiConfig,
} from '@/hooks/useAi';
import { useOllamaRunningModels, useStartOllamaModel } from '@/hooks/useAiConfig';
import { useAiStream } from './AiConversation/useAiStream';
import { AiMessageList } from './AiConversation/AiMessageList';
import { AiInputPanel } from './AiConversation/AiInputPanel';
import { OpenAiModels, GeminiModels, AgentProvider, ClaudeModels, resolveAutoModel } from '@money-up/common';
import { toast } from 'sonner';
import { useNavigate } from '@tanstack/react-router';
import { useAiStore } from '@/store/aiStore';

interface AiConversationProps {
  userProfile?: {
    configuredProviders?: string[] | null;
    aiProviderConfigs?: Record<string, any> | null;
    forceMarkdown?: boolean;
  } | null;
  conversationId: string | null;
  onConversationCreated: (id: string) => void;
  onConnectClick?: () => void;
}

const ModelsByProvider: Record<string, string[]> = {
  openai: OpenAiModels,
  claude: ClaudeModels,
  gemini: GeminiModels,
  ollama: [],
};

export function AiConversation({
  userProfile,
  conversationId,
  onConversationCreated,
  onConnectClick,
}: AiConversationProps) {
  const navigate = useNavigate();

  const {
    setPromptDraft: setPrompt,
    agentProvider,
    setAgentProvider,
    agentModel,
    setAgentModel,
    setIsStartingModel,
  } = useAiStore();

  const { data: runningOllamaModels = [] } = useOllamaRunningModels(agentProvider === 'ollama');
  const startOllamaModel = useStartOllamaModel();

  const configuredProviders = useMemo(() => {
    return (userProfile?.configuredProviders ?? []) as AgentProvider[];
  }, [userProfile?.configuredProviders]);

  const configs = useMemo(() => {
    return userProfile?.aiProviderConfigs || {};
  }, [userProfile?.aiProviderConfigs]);

  const currentProvider = configuredProviders[0] || AgentProvider.Gemini;

  useEffect(() => {
    const saved = localStorage.getItem('moneyup_studio_provider') as AgentProvider | null;
    if (saved && configuredProviders.includes(saved)) {
      setAgentProvider(saved);
    } else if (currentProvider) {
      setAgentProvider(currentProvider);
    }
  }, [configuredProviders, currentProvider, setAgentProvider]);

  useEffect(() => {
    const saved = localStorage.getItem('moneyup_studio_model');
    if (saved) {
      setAgentModel(saved);
    } else {
      setAgentModel(
        configs[currentProvider]?.model ||
        ModelsByProvider[currentProvider]?.[0] ||
        'gemini-2.5-flash'
      );
    }
  }, [currentProvider, configs, setAgentModel]);

  const { data: conversationDetail, isLoading: isLoadingHistory } =
    useConversation(conversationId);
  const saveAiConfig = useSaveAiConfig();

  useEffect(() => {
    if (
      configuredProviders.length > 0 &&
      !configuredProviders.includes(agentProvider)
    ) {
      const prov = configuredProviders[0] as AgentProvider;
      setAgentProvider(prov);
      setAgentModel(
        configs[prov]?.model ||
          ModelsByProvider[prov]?.[0] ||
          'gemini-2.5-flash',
      );
    }
  }, [configuredProviders, agentProvider, setAgentProvider, setAgentModel, configs]);

  const handleAgentProviderChange = (
    provider: AgentProvider,
  ) => {
    if (!configuredProviders.includes(provider)) {
      toast.error(`ספק ${provider.toUpperCase()} אינו מחובר.`, {
        action: {
          label: 'להגדרות',
          onClick: () => void navigate({ to: '/settings/ai' }),
        },
      });
      return;
    }

    setAgentProvider(provider);
    const config = configs[provider] || {
      model: ModelsByProvider[provider][0],
      preset: 'moderate',
    };

    saveAiConfig.mutate(
      {
        provider,
        apiKey: '***',
        config,
      },
      {
        onSuccess: () => {
          toast.success(`ספק AI הוחלף ל-${provider.toUpperCase()}`);
        },
      },
    );
  };

  const handleAgentModelChange = (model: string) => {
    setAgentModel(model);
    const config = configs[agentProvider] || {
      model,
      preset: 'moderate',
    };
    config.model = model;

    saveAiConfig.mutate(
      {
        provider: agentProvider,
        apiKey: '***',
        config,
      },
      {
        onSuccess: () => {
          toast.success(`מודל הוחלף ל-${model}`);
        },
      },
    );
  };

  const providerConfig = useMemo(() => {
    return configs[agentProvider] || {};
  }, [configs, agentProvider]);

  const { temperature, maxTokens, stream } = providerConfig;
  const streaming = stream !== false;

  const [forceMarkdown, setForceMarkdown] = useState(
    userProfile?.forceMarkdown ?? true,
  );

  const modelsQuery = useFetchAiModels(agentProvider);
  const availableModels = useMemo(
    () => modelsQuery.data ?? [],
    [modelsQuery.data],
  );

  const selectedModel = useMemo(() => {
    return (
      agentModel ||
      availableModels[0] ||
      ''
    );
  }, [agentModel, availableModels]);

  const resolvedModel = useMemo(() => {
    if (selectedModel === 'auto') {
      return resolveAutoModel(agentProvider, 'chat', availableModels);
    }
    return selectedModel;
  }, [agentProvider, selectedModel, availableModels]);

  const isModelLoaded = useMemo(() => {
    if (agentProvider !== 'ollama') return true;
    if (!resolvedModel) return false;
    return runningOllamaModels.includes(resolvedModel) ||
      runningOllamaModels.some(r => r.startsWith(resolvedModel + ':') || resolvedModel.startsWith(r + ':'));
  }, [agentProvider, resolvedModel, runningOllamaModels]);

  const handleStartModel = async () => {
    if (agentProvider !== 'ollama' || !resolvedModel) return;
    setIsStartingModel(true);
    try {
      await startOllamaModel.mutateAsync({ model: resolvedModel });
      toast.success(`מודל ${resolvedModel} נטען בהצלחה לזיכרון!`);
    } catch (err: any) {
      toast.error(`שגיאה בטעינת המודל: ${err.message || err}`);
    } finally {
      setIsStartingModel(false);
    }
  };

  useEffect(() => {
    if (userProfile?.forceMarkdown !== undefined) {
      setForceMarkdown(userProfile.forceMarkdown);
    }
  }, [userProfile?.forceMarkdown]);

  // Hook handles AI stream communication and syncing messages from react query
  const {
    messages,
    isLoading,
    error,
    activeSources,
    toolStatus,
    processSubmit,
    processEdit,
  } = useAiStream({
    provider: agentProvider,
    selectedModel,
    temperature,
    maxTokens,
    forceMarkdown,
    streaming,
    conversationId,
    conversationDetail,
    onConversationCreated,
  });

  const defaultPrompts = [
    'כמה בזבזתי על קניות בסופר ואוכל/מסעדות בחודש האחרון?',
    'האם יש מנויים או חיובים מחזוריים שאתה מזהה בחשבון שלי?',
    'מה תזרים המזומנים שלי החודש לעומת חודש שעבר?',
    'מה מצב תיק ההשקעות שלי והאם יש לך המלצות מבוססות ניתוח טכני?',
  ];

  const handlePromptClick = (text: string) => {
    if (!isModelLoaded) {
      toast.error('לא ניתן לשלוח הודעה מכיוון שהמודל אינו טעון בזיכרון.');
      return;
    }
    processSubmit(text);
  };

  const handleSubmitPrompt = (promptValue: string) => {
    if (!promptValue.trim() || isLoading) return;
    if (!isModelLoaded) {
      toast.error('לא ניתן לשלוח הודעה מכיוון שהמודל אינו טעון בזיכרון.');
      return;
    }
    processSubmit(promptValue);
    setPrompt('');
  };

  const handleProcessEdit = (messageId: string, newText: string) => {
    if (!isModelLoaded) {
      toast.error('לא ניתן לשלוח הודעה מכיוון שהמודל אינו טעון בזיכרון.');
      return;
    }
    processEdit(messageId, newText);
  };

  if (isLoadingHistory && conversationId && messages.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-center">
        <CircleNotch className="h-6 w-6 animate-spin text-muted-foreground/60" />
      </div>
    );
  }

  return (
    <div className="h-full min-h-0 flex flex-col gap-3">
      <AiMessageList
        messages={messages}
        isLoading={isLoading}
        toolStatus={toolStatus}
        defaultPrompts={defaultPrompts}
        selectedModel={selectedModel}
        onPromptClick={handlePromptClick}
        onEditSubmit={handleProcessEdit}
        hasAiProvider={configuredProviders.length > 0}
        onConnectClick={onConnectClick}
      />

      {error ? (
        <div className="max-w-5xl mx-auto w-full px-3 md:px-5 shrink-0">
          <div className="flex items-start gap-3 bg-destructive/5 text-destructive border border-destructive/15 px-4 py-3.5 rounded-2xl text-right dir-rtl font-sans">
            <Warning className="h-5 w-5 shrink-0 text-destructive/80 mt-0.5" />
            <p className="text-sm font-medium leading-relaxed">{error}</p>
          </div>
        </div>
      ) : null}

      <div className="max-w-5xl mx-auto w-full px-3 md:px-5 pb-2 shrink-0">
        <AiInputPanel
          onSubmit={handleSubmitPrompt}
          isLoading={isLoading}
          selectedModel={configuredProviders.length > 0 ? selectedModel : ''}
          activeSources={activeSources}
          agentProvider={agentProvider}
          setAgentProvider={handleAgentProviderChange}
          agentModel={agentModel}
          setAgentModel={handleAgentModelChange}
          modelsByProvider={ModelsByProvider}
          configuredProviders={userProfile?.configuredProviders ?? undefined}
          isModelLoaded={isModelLoaded}
          onStartModel={handleStartModel}
        />
      </div>
    </div>
  );
}
