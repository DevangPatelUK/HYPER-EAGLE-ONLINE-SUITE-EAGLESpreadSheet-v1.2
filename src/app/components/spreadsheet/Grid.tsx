'use client';

import React from 'react';
import { Cell } from './Cell';
import { indexToCoordinate } from '@/app/lib/formula-engine';
import { SpreadsheetData } from '@/app/lib/formula-engine';

interface GridProps {
  rows: number;
  cols: number;
  data: SpreadsheetData;
  selectedCell: string | null;
  editingCell: string | null;
  onSelect: (coord: string) => void;
  onDoubleClick: (coord: string) => void;
  onUpdate: (coord: string, value: string) => void;
  onFinishEdit: () => void;
}

export const Grid: React.FC<GridProps> = ({
  rows,
  cols,
  data,
  selectedCell,
  editingCell,
  onSelect,
  onDoubleClick,
  onUpdate,
  onFinishEdit,
}) => {
  const getColHeader = (col: number) => {
    let header = '';
    let c = col + 1;
    while (c > 0) {
      let remainder = (c - 1) % 26;
      header = String.fromCharCode(65 + remainder) + header;
      c = Math.floor((c - 1) / 26);
    }
    return header;
  };

  return (
    <div className="flex-1 overflow-auto bg-white">
      <div 
        className="grid sticky top-0 left-0 z-30"
        style={{ gridTemplateColumns: `40px repeat(${cols}, 120px)` }}
      >
        {/* Top Left Corner */}
        <div className="bg-muted h-8 border-r border-b border-border flex items-center justify-center" />
        {/* Column Headers */}
        {Array.from({ length: cols }).map((_, i) => (
          <div
            key={i}
            className="bg-muted h-8 border-r border-b border-border flex items-center justify-center text-xs font-medium text-muted-foreground"
          >
            {getColHeader(i)}
          </div>
        ))}
      </div>

      <div className="grid" style={{ gridTemplateColumns: `40px repeat(${cols}, 120px)` }}>
        {Array.from({ length: rows }).map((_, r) => (
          <React.Fragment key={r}>
            {/* Row Header */}
            <div className="bg-muted border-r border-b border-border flex items-center justify-center text-xs font-medium text-muted-foreground sticky left-0 z-20">
              {r + 1}
            </div>
            {/* Cells */}
            {Array.from({ length: cols }).map((_, c) => {
              const coord = indexToCoordinate(r, c);
              return (
                <Cell
                  key={coord}
                  coord={coord}
                  data={data[coord]}
                  isSelected={selectedCell === coord}
                  isEditing={editingCell === coord}
                  onSelect={onSelect}
                  onDoubleClick={onDoubleClick}
                  onUpdate={onUpdate}
                  onFinishEdit={onFinishEdit}
                />
              );
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};
