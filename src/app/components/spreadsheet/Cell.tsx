'use client';

import React, { useRef, useEffect } from 'react';
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

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdate(coord, e.target.value);
  };

  const handleBlur = () => {
    onFinishEdit();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === 'Tab') {
      onFinishEdit();
    }
  };

  return (
    <div
      className={cn(
        "relative h-8 border-r border-b border-border min-w-[100px] flex items-center px-2 text-sm overflow-hidden select-none",
        isSelected && "cell-selected",
        isEditing && "cell-editing",
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
          className="w-full h-full border-none focus:ring-0 outline-none px-2"
          value={data?.formula || data?.value || ''}
          onChange={handleChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
        />
      ) : (
        <span className="truncate">{data?.value || ''}</span>
      )}
    </div>
  );
};
