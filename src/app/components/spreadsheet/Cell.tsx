'use client';

import React, { useRef, useEffect, useState, memo } from 'react';
import { cn } from '@/lib/utils';
import { CellData, formatCellValue, evaluateConditionalFormatting, validateValue } from '@/app/lib/formula-engine';
import { Lock } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from '@/hooks/use-toast';
import { FormulaAutocomplete } from './FormulaAutocomplete';

interface CellProps {
  coord: string;
  data?: CellData;
  isActive: boolean;
  isInRange: boolean;
  isEditing: boolean;
  initialValue?: string | null;
  onMouseDown: (coord: string, shiftKey: boolean) => void;
  onMouseEnter: (coord: string) => void;
  onDoubleClick: (coord: string) => void;
  onUpdate: (coord: string, value: string) => void;
  onFinishEdit: (nextKey?: string) => void;
}

export const Cell = memo(({
  coord,
  data,
  isActive,
  isInRange,
  isEditing,
  initialValue,
  onMouseDown,
  onMouseEnter,
  onDoubleClick,
  onUpdate,
  onFinishEdit,
}: CellProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [localValue, setLocalValue] = useState('');
  const [showAutocomplete, setShowAutocomplete] = useState(false);

  useEffect(() => {
    if (!isEditing) {
      setLocalValue(data?.formula || data?.value || '');
    } else if (initialValue !== null) {
      setLocalValue(initialValue);
    }
  }, [data?.formula, data?.value, isEditing, initialValue]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      if (initialValue === null) {
        inputRef.current.select();
      } else {
        inputRef.current.setSelectionRange(inputRef.current.value.length, inputRef.current.value.length);
      }
    }
  }, [isEditing, initialValue]);

  const handleFinish = (nextKey?: string) => {
    if (isEditing) {
      const validation = validateValue(localValue, data?.validation);
      if (validation.valid) {
        onUpdate(coord, localValue);
        onFinishEdit(nextKey);
      } else {
        toast({ title: 'Invalid Input', description: validation.message, variant: 'destructive' });
        inputRef.current?.focus();
      }
    }
  };

  const handleBlur = () => {
    if (isEditing) {
       const validation = validateValue(localValue, data?.validation);
       if (validation.valid) onUpdate(coord, localValue);
       onFinishEdit();
    }
  };

  const cellContent = (
    <div
      className={cn(
        "relative h-full border-r border-b border-border min-w-[120px] flex items-center px-2 text-xs overflow-hidden select-none cursor-cell transition-colors",
        isInRange && "bg-primary/5",
        isActive && "ring-2 ring-primary ring-inset z-10 bg-primary/10",
        isEditing && "shadow-lg z-20 bg-white",
        data?.isLocked && "bg-muted/30 cursor-not-allowed"
      )}
      style={{ 
        backgroundColor: evaluateConditionalFormatting(data || { value: '', formula: '' }).backgroundColor || data?.backgroundColor,
        color: evaluateConditionalFormatting(data || { value: '', formula: '' }).textColor || data?.textColor,
        fontWeight: data?.bold ? 'bold' : 'normal'
      }}
      onMouseDown={(e) => onMouseDown(coord, e.shiftKey)}
      onMouseEnter={() => onMouseEnter(coord)}
      onDoubleClick={() => !data?.isLocked && onDoubleClick(coord)}
    >
      {data?.comment && <div className="absolute top-0 right-0 border-t-[6px] border-t-accent border-l-[6px] border-l-transparent" />}
      {data?.isLocked && <div className="absolute bottom-0 right-0 p-0.5 opacity-30"><Lock className="h-2 w-2" /></div>}

      {isEditing ? (
        <div className="w-full h-full relative">
          <input
            ref={inputRef}
            className="absolute inset-0 w-full h-full border-none focus:ring-0 outline-none px-2 bg-white"
            value={localValue}
            onChange={(e) => { 
              setLocalValue(e.target.value); 
              setShowAutocomplete(e.target.value.startsWith('=')); 
            }}
            onBlur={handleBlur}
            onKeyDown={(e) => { 
              if (['Enter', 'Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                // For formulas, we might want arrows to select cells, but per user request, arrows commit and move
                e.preventDefault();
                handleFinish(e.key);
              } else if (e.key === 'Escape') {
                e.preventDefault();
                onFinishEdit();
              }
            }}
          />
          <FormulaAutocomplete 
            inputValue={localValue} 
            isOpen={showAutocomplete} 
            onSelect={(f) => { setLocalValue(`=${f}(`); setShowAutocomplete(false); }} 
            onClose={() => setShowAutocomplete(false)} 
          />
        </div>
      ) : (
        <span className="truncate">{formatCellValue(data?.value || '', data?.format)}</span>
      )}
    </div>
  );

  return data?.comment ? (
    <TooltipProvider delayDuration={200}>
      <Tooltip><TooltipTrigger asChild>{cellContent}</TooltipTrigger><TooltipContent>{data.comment}</TooltipContent></Tooltip>
    </TooltipProvider>
  ) : cellContent;
});

Cell.displayName = 'Cell';
