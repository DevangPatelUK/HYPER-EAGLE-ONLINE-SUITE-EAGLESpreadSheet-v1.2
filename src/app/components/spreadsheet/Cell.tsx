'use client';

import React, { useRef, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { CellData, formatCellValue } from '@/app/lib/formula-engine';

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
    if (isEditing) {
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          if (initialValue === null || initialValue === undefined) {
            inputRef.current.select();
          }
        }
      }, 0);
    }
  }, [isEditing, initialValue]);

  const handleBlur = () => {
    if (isEditing) {
      onUpdate(coord, localValue);
      onFinishEdit();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === 'Tab') {
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

  const displayValue = formatCellValue(data?.value || '', data?.format);

  return (
    <div
      className={cn(
        "relative h-8 border-r border-b border-border min-w-[120px] flex items-center px-2 text-sm overflow-hidden select-none cursor-cell transition-colors",
        isInRange && "bg-primary/10",
        isActive && "ring-2 ring-primary ring-inset z-10 bg-primary/5",
        isEditing && "shadow-lg z-20 bg-white",
        data?.bold && "font-bold",
        data?.align === 'center' && "justify-center",
        data?.align === 'right' && "justify-end",
        data?.align === 'left' && "justify-start"
      )}
      style={{ backgroundColor: data?.backgroundColor || undefined }}
      onMouseDown={handleMouseDown}
      onMouseEnter={() => onMouseEnter(coord)}
      onDoubleClick={() => onDoubleClick(coord)}
    >
      {isEditing ? (
        <input
          ref={inputRef}
          className="absolute inset-0 w-full h-full border-none focus:ring-0 outline-none px-2 bg-white text-primary"
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
        />
      ) : (
        <span className="truncate pointer-events-none">
          {displayValue}
        </span>
      )}
    </div>
  );
};
