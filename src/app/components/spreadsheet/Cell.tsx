'use client';

import React, { useRef, useEffect, useState, memo } from 'react';
import { cn } from '@/lib/utils';
import { CellData, formatCellValue, evaluateConditionalFormatting } from '@/app/lib/formula-engine';
import { Lock } from 'lucide-react';

interface CellProps {
  coord: string;
  data?: CellData;
  isActive: boolean;
  isInRange: boolean;
  isEditing: boolean;
  initialValue?: string | null;
  onMouseDown: (coord: string, shift: boolean) => void;
  onMouseEnter: (coord: string) => void;
  onDoubleClick: (coord: string) => void;
  onUpdate: (coord: string, value: string) => void;
  onFinishEdit: (nextKey?: string) => void;
}

export const Cell = memo(({
  coord, data, isActive, isInRange, isEditing, initialValue,
  onMouseDown, onMouseEnter, onDoubleClick, onUpdate, onFinishEdit,
}: CellProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [localValue, setLocalValue] = useState('');

  useEffect(() => {
    if (!isEditing) setLocalValue(data?.formula || data?.value || '');
    else if (initialValue !== null) setLocalValue(initialValue);
  }, [data?.formula, data?.value, isEditing, initialValue]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      if (initialValue === null) inputRef.current.select();
      else inputRef.current.setSelectionRange(inputRef.current.value.length, inputRef.current.value.length);
    }
  }, [isEditing, initialValue]);

  const handleCommit = (nextKey?: string) => {
    if (isEditing) {
      onUpdate(coord, localValue);
      onFinishEdit(nextKey);
    }
  };

  const dynamicStyle = {
    backgroundColor: evaluateConditionalFormatting(data || { value: '', formula: '' }).backgroundColor || data?.backgroundColor,
    color: evaluateConditionalFormatting(data || { value: '', formula: '' }).textColor || data?.textColor,
    fontWeight: data?.bold ? 'bold' : 'normal',
    fontStyle: data?.italic ? 'italic' : 'normal',
    textDecoration: data?.underline ? 'underline' : 'none',
    textAlign: data?.align || 'left'
  };

  return (
    <div
      className={cn(
        "relative h-full border-r border-b border-border min-w-[120px] flex items-center px-2 text-xs overflow-hidden select-none transition-colors",
        isInRange && "bg-primary/5",
        isActive && "ring-2 ring-primary ring-inset z-10 bg-primary/10",
        isEditing && "shadow-xl z-20 bg-white",
        data?.isLocked && "bg-muted/30 cursor-not-allowed",
        data?.wrapText ? "whitespace-normal break-words py-1" : "whitespace-nowrap"
      )}
      style={dynamicStyle as React.CSSProperties}
      onMouseDown={(e) => onMouseDown(coord, e.shiftKey)}
      onMouseEnter={() => onMouseEnter(coord)}
      onDoubleClick={() => !data?.isLocked && onDoubleClick(coord)}
    >
      {isEditing ? (
        <input
          ref={inputRef}
          className="absolute inset-0 w-full h-full border-none focus:ring-0 outline-none px-2 bg-white text-primary"
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          onBlur={() => handleCommit()}
          onKeyDown={(e) => {
            if (['Enter', 'Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
              e.preventDefault();
              handleCommit(e.key);
            } else if (e.key === 'Escape') {
              onFinishEdit();
            }
          }}
        />
      ) : (
        <span className={cn("block w-full", !data?.wrapText && "truncate")}>
          {formatCellValue(data?.value || '', data?.format)}
        </span>
      )}
      {data?.isLocked && <div className="absolute bottom-0 right-0 p-0.5 opacity-20"><Lock className="h-2 w-2" /></div>}
    </div>
  );
});

Cell.displayName = 'Cell';