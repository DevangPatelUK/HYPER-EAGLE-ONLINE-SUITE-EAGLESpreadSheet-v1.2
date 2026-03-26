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

  // Reset local value when we start editing or when data externally changes
  useEffect(() => {
    if (isEditing) {
      setLocalValue(data?.formula || data?.value || '');
      // Focus the input
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [isEditing, data?.formula, data?.value]);

  const handleBlur = () => {
    if (isEditing) {
      onUpdate(coord, localValue);
      onFinishEdit();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onUpdate(coord, localValue);
      onFinishEdit();
    } else if (e.key === 'Escape') {
      setLocalValue(data?.formula || data?.value || '');
      onFinishEdit();
    }
  };

  return (
    <div
      className={cn(
        "relative h-8 border-r border-b border-border min-w-[100px] flex items-center px-2 text-sm overflow-hidden select-none cursor-cell transition-colors",
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
          className="w-full h-full border-none focus:ring-0 outline-none px-2 bg-white text-primary"
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
