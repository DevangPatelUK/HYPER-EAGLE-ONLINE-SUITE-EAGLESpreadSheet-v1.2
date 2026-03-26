'use client';

import React, { useRef, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { CellData } from '@/app/lib/formula-engine';

interface CellProps {
  coord: string;
  data?: CellData;
  isSelected: boolean;
  isEditing: boolean;
  onSelect: (coord: string) => void;
  onDoubleClick: (coord: string) => void;
  onUpdate: (coord: string, value: string) => void;
  onFinishEdit: () => void;
}

export const Cell: React.FC<CellProps> = ({
  coord,
  data,
  isSelected,
  isEditing,
  onSelect,
  onDoubleClick,
  onUpdate,
  onFinishEdit,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [localValue, setLocalValue] = useState(data?.formula || data?.value || '');

  // Keep local value in sync with external data when not editing
  useEffect(() => {
    if (!isEditing) {
      setLocalValue(data?.formula || data?.value || '');
    }
  }, [data?.formula, data?.value, isEditing]);

  // Focus and select text when editing starts
  useEffect(() => {
    if (isEditing) {
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select();
        }
      }, 0);
    }
  }, [isEditing]);

  const handleBlur = () => {
    if (isEditing) {
      onUpdate(coord, localValue);
      onFinishEdit();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === 'Tab') {
      onUpdate(coord, localValue);
      onFinishEdit();
      // We don't preventDefault here so the global handler can pick up the navigation
    } else if (e.key === 'Escape') {
      setLocalValue(data?.formula || data?.value || '');
      onFinishEdit();
      e.preventDefault();
    }
  };

  return (
    <div
      className={cn(
        "relative h-8 border-r border-b border-border min-w-[120px] flex items-center px-2 text-sm overflow-hidden select-none cursor-cell transition-colors",
        isSelected && "cell-selected bg-primary/5",
        isEditing && "cell-editing shadow-lg",
        data?.bold && "font-bold",
        data?.align === 'center' && "justify-center",
        data?.align === 'right' && "justify-end"
      )}
      onClick={() => onSelect(coord)}
      onDoubleClick={() => onDoubleClick(coord)}
    >
      {isEditing ? (
        <input
          ref={inputRef}
          className="absolute inset-0 w-full h-full border-none focus:ring-0 outline-none px-2 bg-white text-primary z-30"
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
        />
      ) : (
        <span className="truncate pointer-events-none">
          {data?.value || ''}
        </span>
      )}
    </div>
  );
};
