import React, { useMemo, useState } from 'react';
// ... existing code ...
import { Button } from '../ui/button';
// ... existing code ...
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
// ... existing code ...
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '../ui/command';
// ... existing code ...
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
// ... existing code ...
import { Check, Loader2, Sparkle } from 'lucide-react';
// ... existing code ...
import { cn } from '../../lib/utils';
// ... existing code ...
import type { ChatModelOption } from '../../types/open-chat-component';

const contextFormatter = new Intl.NumberFormat('en-US');
const costFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 6,
});

export type ModelComboboxProps = {
  value?: string;
  options: ChatModelOption[];
  onSelect: (value: string) => void;
  disabled?: boolean;
  loading?: boolean;
  error?: string;
};

export const ModelCombobox: React.FC<ModelComboboxProps> = ({
  value,
  options,
  onSelect,
  disabled,
  loading,
  error,
}) => {
  const [open, setOpen] = useState(false);

  const currentOption = useMemo(
    () => options.find((option) => option.id === value),
    [options, value],
  );

  const handleSelect = (next: string) => {
    setOpen(false);
    if (next !== value) {
      onSelect(next);
    }
  };

  const canInteract = !disabled && (options.length > 0 || loading);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={cn(
                'gap-2 px-3 h-9 transition-none',
                !currentOption && 'text-muted-foreground',
              )}
              disabled={!canInteract}
            >
              <Sparkle className="h-4 w-4 text-muted-foreground" />
              <span className="max-w-[140px] truncate text-xs font-medium">
                {currentOption?.label ?? (loading ? 'Loading models…' : 'Select model')}
              </span>
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>
          <p>Model selector</p>
        </TooltipContent>
      </Tooltip>

      <PopoverContent className="p-0 w-72">
        <Command>
          <CommandInput placeholder="Search models…" disabled={loading} />
          <CommandList>
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Loading models…</span>
              </div>
            ) : (
              <>
                <CommandEmpty>No models found.</CommandEmpty>
                <CommandGroup>
                  {options.map((option) => {
                    const promptCost = option.promptCostPerToken;
                    const completionCost = option.completionCostPerToken;

                    return (
                      <CommandItem
                        key={option.id}
                        value={option.label}
                        onSelect={() => handleSelect(option.id)}
                      >
                        <div className="flex flex-1 flex-col gap-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium text-sm">{option.label}</span>
                            <Check
                              className={cn(
                                'h-4 w-4 text-muted-foreground opacity-0 transition-opacity',
                                option.id === value && 'opacity-100',
                              )}
                            />
                          </div>
                          {option.description ? (
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {option.description}
                            </p>
                          ) : null}
                          <div className="flex flex-wrap gap-x-2 gap-y-1 text-[11px] text-muted-foreground font-mono">
                            {option.contextLength ? (
                              <span>{contextFormatter.format(option.contextLength)} context</span>
                            ) : null}
                            {promptCost !== undefined || completionCost !== undefined ? (
                              <span>
                                {promptCost !== undefined ? `${costFormatter.format(promptCost)} prompt` : null}
                                {promptCost !== undefined && completionCost !== undefined ? ' · ' : null}
                                {completionCost !== undefined
                                  ? `${costFormatter.format(completionCost)} completion`
                                  : null}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
        {error ? (
          <div className="border-t px-3 py-2 text-xs text-destructive">{error}</div>
        ) : null}
      </PopoverContent>
    </Popover>
  );
};