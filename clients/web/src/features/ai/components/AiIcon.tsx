import { useState } from 'react';

export type AiProvider = 'openai' | 'claude' | 'gemini';
export type AiIconShape = 'circle' | 'rounded-square';

interface AiIconProps {
  provider: AiProvider;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  shape?: AiIconShape;
  fill?: boolean;
  className?: string;
}

const AI_ICON_BY_PROVIDER: Record<AiProvider, string> = {
  openai: '/ai-providers/gpt.jpeg',
  claude: '/ai-providers/claude.png',
  gemini: '/ai-providers/gemini.png',
};

const AI_LABEL_BY_PROVIDER: Record<AiProvider, string> = {
  openai: 'OpenAI',
  claude: 'Anthropic Claude',
  gemini: 'Gemini',
};

const sizeClassByVariant: Record<NonNullable<AiIconProps['size']>, string> = {
  sm: 'h-8 w-8 text-[10px]',
  md: 'h-10 w-10 text-xs',
  lg: 'h-16 w-16 text-lg',
  xl: 'h-20 w-20 text-xl',
};

export function AiIcon({
  provider,
  size = 'md',
  shape,
  fill,
  className = '',
}: AiIconProps) {
  const [failed, setFailed] = useState(false);
  const src = AI_ICON_BY_PROVIDER[provider];
  const label = AI_LABEL_BY_PROVIDER[provider];
  const fallback = label.slice(0, 1);

  const resolvedShape = shape ?? 'circle';
  const shouldFill = fill ?? true;
  const shapeClass =
    resolvedShape === 'rounded-square' ? 'rounded-md' : 'rounded-full';

  if (!src || failed) {
    return (
      <div
        className={`${sizeClassByVariant[size]} ${shapeClass} border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center font-black text-zinc-600 dark:text-zinc-300 ${className}`}
      >
        {fallback}
      </div>
    );
  }

  return (
    <div
      className={`${sizeClassByVariant[size]} ${shapeClass} border border-zinc-200 dark:border-zinc-200 bg-white overflow-hidden ${className}`}
    >
      <img
        src={src}
        alt={label}
        className={`h-full w-full ${shouldFill ? 'object-cover' : 'object-contain'}`}
        loading="lazy"
        onError={() => setFailed(true)}
      />
    </div>
  );
}
