import { Question } from '@phosphor-icons/react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface HelpTooltipProps {
  content: string;
  side?: 'top' | 'right' | 'bottom' | 'left';
  delayDuration?: number;
}

export function HelpTooltip({
  content,
  side = 'top',
  delayDuration = 200,
}: HelpTooltipProps) {
  return (
    <TooltipProvider>
      <Tooltip delayDuration={delayDuration}>
        <TooltipTrigger asChild>
          <span className="cursor-help text-muted-foreground/60 hover:text-foreground transition-colors">
            <Question className="h-3.5 w-3.5" weight="bold" />
          </span>
        </TooltipTrigger>
        <TooltipContent
          className="max-w-[280px] text-xs leading-relaxed text-right p-3 bg-card border border-border text-foreground shadow-md rounded-none font-semibold"
          side={side}
        >
          {content}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
