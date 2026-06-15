import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectItem } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { PremiumInput } from '@/components/ui/premium-input';
import { PremiumButton } from '@/components/ui/premium-button';

interface AiSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  modelOverride: string;
  setModelOverride: (val: string) => void;
  availableModels: string[];
  streaming: boolean;
  setStreaming: (val: boolean) => void;
  forceMarkdown: boolean;
  onForceMarkdownChange: (val: boolean) => void;
  temperature: number;
  setTemperature: (val: number) => void;
  maxTokens: number;
  setMaxTokens: (val: number) => void;
}

export function AiSettingsDialog({
  open,
  onOpenChange,
  modelOverride,
  setModelOverride,
  availableModels,
  streaming,
  setStreaming,
  forceMarkdown,
  onForceMarkdownChange,
  temperature,
  setTemperature,
  maxTokens,
  setMaxTokens,
}: AiSettingsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-md bg-card border border-border rounded-none shadow-2xl text-right"
        dir="rtl"
        showCloseButton={true}
      >
        <DialogHeader className="text-right border-b border-border pb-4">
          <DialogTitle className="text-lg font-black uppercase tracking-tight text-foreground">
            הגדרות דיבאג מתקדמות
          </DialogTitle>
          <DialogDescription className="text-xs font-semibold text-muted-foreground">
            שנה פרמטרי מודל ומשתני שיחה בזמן אמת.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-5 text-xs font-semibold text-foreground/80 max-h-96 overflow-y-auto pr-1">
          <div className="space-y-2 text-right">
            <Label className="text-[11px] font-black text-muted-foreground">
              Model Override
            </Label>
            <Select
              value={modelOverride}
              onValueChange={(val) => setModelOverride(val)}
            >
              <SelectItem value="none">Use Profile Default</SelectItem>
              {availableModels.map((model) => (
                <SelectItem key={model} value={model}>
                  {model}
                </SelectItem>
              ))}
            </Select>
          </div>

          <div className="flex items-center justify-between gap-2 py-2 border border-border bg-muted/10 px-3">
            <Label className="font-black text-foreground/70">
              Streaming
            </Label>
            <Switch
              checked={streaming}
              onCheckedChange={(val) => setStreaming(val)}
            />
          </div>

          <div className="flex items-center justify-between gap-2 py-2 border border-border bg-muted/10 px-3">
            <Label className="font-black text-foreground/70">
              Force Markdown
            </Label>
            <Switch
              checked={forceMarkdown}
              onCheckedChange={onForceMarkdownChange}
            />
          </div>

          <div className="space-y-3 text-right border border-border bg-muted/10 p-3">
            <Label className="font-black text-foreground/70">
              Temperature: {temperature.toFixed(1)}
            </Label>
            <Slider
              min={0}
              max={2}
              step={0.1}
              value={temperature}
              onValueChange={(val) => setTemperature(val)}
            />
          </div>

          <div className="space-y-2 text-right">
            <Label className="font-black text-foreground/70">
              Max Tokens
            </Label>
            <PremiumInput
              type="number"
              value={maxTokens}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                setMaxTokens(Number(event.target.value) || 1)
              }
              className="h-10 text-xs"
              min={1}
              dir="ltr"
            />
          </div>
        </div>

        <DialogFooter className="sm:justify-start pt-2 border-t border-border">
          <PremiumButton
            type="button"
            onClick={() => onOpenChange(false)}
            className="w-full"
            size="sm"
          >
            סגור הגדרות
          </PremiumButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
