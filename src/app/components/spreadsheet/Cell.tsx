'use client';

import React, { useRef, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { CellData, formatCellValue, evaluateConditionalFormatting, validateValue } from '@/app/lib/formula-engine';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from '@/hooks/use-toast';

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

export const Cell: React.FC<CellProps> = ({
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
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [localValue, setLocalValue] = useState(data?.formula || data?.value || '');

  useEffect(() => {
    if (!isEditing) {
      setLocalValue(data?.formula || data?.value || '');
    } else {
      if (initialValue !== null && initialValue !== undefined) {
        setLocalValue(initialValue);
      } else {
        setLocalValue(data?.formula || data?.value || '');
      }
    }
  }, [data?.formula, data?.value, isEditing, initialValue]);

  useEffect(() => {
    if (isEditing && data?.type !== 'checkbox' && data?.type !== 'select') {
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          if (initialValue === null || initialValue === undefined) {
            inputRef.current.select();
          }
        }
      }, 0);
    }
  }, [isEditing, initialValue, data?.type]);

  const handleBlur = () => {
    if (isEditing) {
      const validation = validateValue(localValue, data?.validation);
      if (!validation.valid) {
        toast({ title: 'Invalid Input', description: validation.message, variant: 'destructive' });
        setLocalValue(data?.formula || data?.value || '');
      } else {
        onUpdate(coord, localValue);
      }
      onFinishEdit();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === 'Tab') {
      const validation = validateValue(localValue, data?.validation);
      if (!validation.valid) {
        toast({ title: 'Invalid Input', description: validation.message, variant: 'destructive' });
        e.preventDefault();
        return;
      }
      onUpdate(coord, localValue);
      onFinishEdit(e.key);
      e.preventDefault();
    } else if (e.key === 'Escape') {
      setLocalValue(data?.formula || data?.value || '');
      onFinishEdit();
      e.preventDefault();
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    onMouseDown(coord, e.shiftKey);
  };

  const handleCheckboxToggle = (checked: boolean) => {
    onUpdate(coord, checked ? 'TRUE' : 'FALSE');
  };

  const displayValue = formatCellValue(data?.value || '', data?.format);
  const conditionalStyle = data ? evaluateConditionalFormatting(data) : {};

  const renderEditor = () => {
    if (data?.type === 'select') {
      return (
        <select
          className="absolute inset-0 w-full h-full border-none focus:ring-0 outline-none px-2 bg-white text-primary text-sm"
          value={localValue}
          onChange={(e) => {
            onUpdate(coord, e.target.value);
            onFinishEdit();
          }}
          onBlur={handleBlur}
          autoFocus
        >
          <option value="">Select...</option>
          {data.options?.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      );
    }

    return (
      <input
        ref={inputRef}
        type={data?.type === 'date' ? 'date' : data?.type === 'number' ? 'number' : 'text'}
        aria-label={`Editing cell ${coord}`}
        className="absolute inset-0 w-full h-full border-none focus:ring-0 outline-none px-2 bg-white text-primary"
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
      />
    );
  };

  const cellContent = (
    <div
      role="gridcell"
      aria-selected={isActive || isInRange}
      aria-readonly={!isEditing}
      aria-label={`Cell ${coord}, value: ${displayValue}${data?.comment ? `, comment: ${data.comment}` : ''}`}
      className={cn(
        "relative h-full border-r border-b border-border min-w-[120px] flex items-center px-2 text-sm overflow-hidden select-none cursor-cell transition-colors",
        isInRange && "bg-primary/10",
        isActive && "ring-2 ring-primary ring-inset z-10 bg-primary/5",
        isEditing && data?.type !== 'checkbox' && "shadow-lg z-20 bg-white",
        (data?.bold || conditionalStyle.bold) && "font-bold",
        data?.italic && "italic",
        data?.underline && "underline underline-offset-2",
        data?.strikethrough && "line-through",
        data?.align === 'center' && "justify-center",
        data?.align === 'right' && "justify-end",
        data?.align === 'left' && "justify-start"
      )}
      style={{ 
        backgroundColor: conditionalStyle.backgroundColor || data?.backgroundColor || undefined,
        color: conditionalStyle.textColor || data?.textColor || undefined 
      }}
      onMouseDown={handleMouseDown}
      onMouseEnter={() => onMouseEnter(coord)}
      onDoubleClick={() => onDoubleClick(coord)}
    >
      {/* Comment Indicator */}
      {data?.comment && (
        <div className="absolute top-0 right-0 w-0 h-0 border-t-[6px] border-t-accent border-l-[6px] border-l-transparent z-10" />
      )}

      {isEditing && data?.type !== 'checkbox' ? (
        renderEditor()
      ) : data?.type === 'checkbox' ? (
        <div className="flex w-full justify-center">
          <Checkbox 
            checked={data?.value?.toUpperCase() === 'TRUE'} 
            onCheckedChange={handleCheckboxToggle}
            className="h-4 w-4"
          />
        </div>
      ) : (
        <span className="truncate pointer-events-none">
          {displayValue}
        </span>
      )}
    </div>
  );

  if (data?.comment) {
    return (
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            {cellContent}
          </TooltipTrigger>
          <TooltipContent className="bg-popover text-popover-foreground border border-border shadow-md p-2 text-xs max-w-[200px] break-words">
            <p className="font-semibold mb-1 text-[10px] text-muted-foreground uppercase tracking-wider">Note</p>
            {data.comment}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return cellContent;
};
