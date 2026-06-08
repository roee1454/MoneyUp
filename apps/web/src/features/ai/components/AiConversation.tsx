import { useEffect, useMemo, useState } from 'react';
import { CircleNotch, Warning } from '@phosphor-icons/react';
import {
  useFetchAiModels,
  useConversation,
  useSaveAiConfig,
} from '@/hooks/useAi';
import { useUpdateAiSettings } from '@/hooks/useUsers';
import { useAiStream } from './AiConversation/useAiStream';
import { AiMessageList } from './AiConversation/AiMessageList';
import { AiInputPanel } from './AiConversation/AiInputPanel';
import { AiSettingsDialog } from './AiConversation/AiSettingsDialog';
import { OPENAI_MODELS, GEMINI_MODELS } from '@money-up/common';
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
}

const MODELS_BY_PROVIDER: Record<string, string[]> = {
  openai: OPENAI_MODELS,
  claude: [
    'claude-3-5-sonnet-20241022',
    'claude-3-5-haiku-20241022',
    'claude-3-opus-20240229',
  ],
  gemini: GEMINI_MODELS,
  ollama: [
    'qwen2.5:14b-instruct',
    'llama3.1:8b',
    'mistral',
    'gemma2',
  ],
  openrouter: [
    'meta-llama/llama-3.1-8b-instruct:free',
    'google/gemini-2.5-flash',
    'deepseek/deepseek-chat',
    'anthropic/claude-3.5-sonnet',
  ],
};

const debugEnabled = import.meta.env.VITE_DEBUG_AI_CHAT === 'true';

export function AiConversation({
  userProfile,
  conversationId,
  onConversationCreated,
}: AiConversationProps) {
  const [prompt, setPrompt] = useState('');
  const navigate = useNavigate();

  const configuredProviders = useMemo(() => {
    return (userProfile?.configuredProviders ?? []) as string[];
  }, [userProfile?.configuredProviders]);

  const configs = useMemo(() => {
    return userProfile?.aiProviderConfigs || {};
  }, [userProfile?.aiProviderConfigs]);

  const currentProvider = configuredProviders[0] || 'gemini';

  const [agentProvider, setAgentProvider] = useState<'openai' | 'claude' | 'gemini' | 'ollama' | 'openrouter'>(() => {
    const saved = localStorage.getItem('moneyup_studio_provider');
    if (saved && configuredProviders.includes(saved)) return saved as any;
    return (currentProvider as any) || 'gemini';
  });

  const [agentModel, setAgentModel] = useState<string>(() => {
    const saved = localStorage.getItem('moneyup_studio_model');
    if (saved) return saved;
    return configs[currentProvider]?.model || MODELS_BY_PROVIDER[currentProvider]?.[0] || 'gemini-2.5-flash';
  });

  const { data: conversationDetail, isLoading: isLoadingHistory } =
    useConversation(conversationId);
  const updateAiSettingsMutation = useUpdateAiSettings();
  const saveAiConfig = useSaveAiConfig();

  useEffect(() => {
    if (configuredProviders.length > 0 && !configuredProviders.includes(agentProvider)) {
      const prov = configuredProviders[0] as 'openai' | 'claude' | 'gemini' | 'ollama' | 'openrouter';
      setAgentProvider(prov);
      setAgentModel(
        configs[prov]?.model ||
        MODELS_BY_PROVIDER[prov]?.[0] ||
        'gemini-2.5-flash'
      );
    }
  }, [configuredProviders]);

  const handleAgentProviderChange = (provider: 'openai' | 'claude' | 'gemini' | 'ollama' | 'openrouter') => {
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
      model: MODELS_BY_PROVIDER[provider][0],
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

  const [streaming, setStreaming] = useState(providerConfig.stream ?? false);
  const [forceMarkdown, setForceMarkdown] = useState(
    userProfile?.forceMarkdown ?? true,
  );
  const [temperature, setTemperature] = useState(
    providerConfig.temperature ?? 0.7,
  );
  const [maxTokens, setMaxTokens] = useState(providerConfig.maxTokens ?? 1024);
  const [modelOverride, setModelOverride] = useState('');
  const [showDebug, setShowDebug] = useState(false);

  const modelsQuery = useFetchAiModels(agentProvider);
  const availableModels = useMemo(
    () => modelsQuery.data ?? [],
    [modelsQuery.data],
  );

  const selectedModel = useMemo(() => {
    return (
      (modelOverride && modelOverride !== 'none'
        ? modelOverride
        : agentModel) ||
      availableModels[0] ||
      ''
    );
  }, [modelOverride, agentModel, availableModels]);

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
    'כמה בזבזתי על קניות ומזון בחודש האחרון?',
    'האם יש מנויים או חיובים מחזוריים שאתה מזהה בחשבון שלי?',
    'מה תזרים המזומנים שלי החודש לעומת חודש שעבר?',
    'תראה לי את התנועות הכי גדולות שלי בכרטיס אשראי',
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
      />

      {error ? (
        <div className="max-w-3xl mx-auto w-full px-3 md:px-5 shrink-0">
          <div className="flex items-start gap-3 bg-destructive/5 text-destructive border border-destructive/15 px-4 py-3.5 rounded-2xl text-right dir-rtl font-sans">
            <Warning className="h-5 w-5 shrink-0 text-destructive/80 mt-0.5" />
            <p className="text-sm font-medium leading-relaxed">
              {error}
            </p>
          </div>
        </div>
      ) : null}

      <div className="max-w-3xl mx-auto w-full px-3 md:px-5 pb-2 shrink-0">
        <AiInputPanel
          prompt={prompt}
          setPrompt={setPrompt}
          onSubmit={handleSubmitPrompt}
          isLoading={isLoading}
          selectedModel={selectedModel}
          debugEnabled={debugEnabled}
          activeSources={activeSources}
          onShowDebug={() => setShowDebug(true)}
          agentProvider={agentProvider}
          setAgentProvider={handleAgentProviderChange}
          agentModel={agentModel}
          setAgentModel={handleAgentModelChange}
          modelsByProvider={MODELS_BY_PROVIDER}
          configuredProviders={userProfile?.configuredProviders ?? undefined}
        />
      </div>

      {debugEnabled && (
        <AiSettingsDialog
          open={showDebug}
          onOpenChange={setShowDebug}
          modelOverride={modelOverride}
          setModelOverride={setModelOverride}
          availableModels={availableModels}
          streaming={streaming}
          setStreaming={setStreaming}
          forceMarkdown={forceMarkdown}
          onForceMarkdownChange={(val) => {
            setForceMarkdown(val);
            updateAiSettingsMutation.mutate({ forceMarkdown: val });
          }}
          temperature={temperature}
          setTemperature={setTemperature}
          maxTokens={maxTokens}
          setMaxTokens={setMaxTokens}
        />
      )}
    </div>
  );
}
