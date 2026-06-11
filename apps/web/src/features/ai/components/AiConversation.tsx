import { useEffect, useMemo, useState } from 'react';
import { CircleNotch, Warning } from '@phosphor-icons/react';
import {
  useFetchAiModels,
  useConversation,
  useSaveAiConfig,
} from '@/hooks/useAi';
import { useAiStream } from './AiConversation/useAiStream';
import { AiMessageList } from './AiConversation/AiMessageList';
import { AiInputPanel } from './AiConversation/AiInputPanel';
import { OpenAiModels, GeminiModels, AgentProvider, ClaudeModels } from '@money-up/common';
import { toast } from 'sonner';
import { useNavigate } from '@tanstack/react-router';

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
  openrouter: [],
};


export function AiConversation({
  userProfile,
  conversationId,
  onConversationCreated,
  onConnectClick,
}: AiConversationProps) {
  const [prompt, setPrompt] = useState('');
  const navigate = useNavigate();

  const configuredProviders = useMemo(() => {
    return (userProfile?.configuredProviders ?? []) as AgentProvider[];
  }, [userProfile?.configuredProviders]);

  const configs = useMemo(() => {
    return userProfile?.aiProviderConfigs || {};
  }, [userProfile?.aiProviderConfigs]);

  const currentProvider = configuredProviders[0] || AgentProvider.Gemini;

  const [agentProvider, setAgentProvider] = useState<AgentProvider>(() => {
    const saved = localStorage.getItem('moneyup_studio_provider');
    if (saved && configuredProviders.includes(saved)) return saved;
    return currentProvider || AgentProvider.Gemini;
  });

  const [agentModel, setAgentModel] = useState<string>(() => {
    const saved = localStorage.getItem('moneyup_studio_model');
    if (saved) return saved;
    return (
      configs[currentProvider]?.model ||
      ModelsByProvider[currentProvider]?.[0] ||
      'gemini-2.5-flash'
    );
  });

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
  }, [configuredProviders]);

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
    localStorage.setItem('moneyup_studio_provider', provider);
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
    localStorage.setItem('moneyup_studio_model', model);
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

  const { temperature, maxTokens, streaming } = providerConfig;

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
    processSubmit(text);
  };

  const handleSubmitPrompt = (promptValue: string) => {
    if (!promptValue.trim() || isLoading) return;
    processSubmit(promptValue);
    setPrompt('');
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
        onEditSubmit={processEdit}
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
          prompt={prompt}
          setPrompt={setPrompt}
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
        />
      </div>
    </div>
  );
}
