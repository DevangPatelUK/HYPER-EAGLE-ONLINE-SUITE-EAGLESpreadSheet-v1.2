'use client';

import React from 'react';
import { Cell } from './Cell';
import { indexToCoordinate } from '@/app/lib/formula-engine';
import { SpreadsheetData } from '@/app/lib/formula-engine';
import { cn } from '@/lib/utils';

interface GridProps {
  rows: number;
  cols: number;
  data: SpreadsheetData;
  selectedCell: string | null;
  selectionRange: string[];
  editingCell: string | null;
  editingValue: string | null;
  onMouseDown: (coord: string, shiftKey: boolean) => void;
  onMouseEnter: (coord: string) => void;
  onMouseUp: () => void;
  onDoubleClick: (coord: string) => void;
  onUpdate: (coord: string, value: string) => void;
  onFinishEdit: (nextKey?: string) => void;
  onSelectRow: (row: number, shift: boolean) => void;
  onSelectCol: (col: number, shift: boolean) => void;
}

export const Grid: React.FC<GridProps> = ({
  rows,
  cols,
  data,
  selectedCell,
  selectionRange,
  editingCell,
  editingValue,
  onMouseDown,
  onMouseEnter,
  onMouseUp,
  onDoubleClick,
  onUpdate,
  onFinishEdit,
  onSelectRow,
  onSelectCol,
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
    <div 
      className="flex-1 overflow-auto bg-white select-none"
      role="grid"
      aria-rowcount={rows + 1}
      aria-colcount={cols + 1}
      aria-label="Spreadsheet Grid"
    >
      <div 
        className="grid sticky top-0 left-0 z-30"
        style={{ gridTemplateColumns: `40px repeat(${cols}, 120px)` }}
        role="row"
      >
        <div 
          className="bg-muted h-8 border-r border-b border-border flex items-center justify-center" 
          role="columnheader"
          aria-label="Select All"
        />
        {Array.from({ length: cols }).map((_, i) => (
          <div
            key={i}
            onClick={(e) => onSelectCol(i, e.shiftKey)}
            className={cn(
              "bg-muted h-8 border-r border-b border-border flex items-center justify-center text-xs font-medium text-muted-foreground cursor-pointer hover:bg-muted-foreground/10 transition-colors",
              selectionRange.includes(indexToCoordinate(0, i)) && selectionRange.includes(indexToCoordinate(rows - 1, i)) && "bg-primary/20 text-primary font-bold"
            )}
            role="columnheader"
            aria-label={`Column ${getColHeader(i)}`}
          >
            {getColHeader(i)}
          </div>
        ))}
      </div>

      <div className="grid" style={{ gridTemplateColumns: `40px repeat(${cols}, 120px)` }}>
        {Array.from({ length: rows }).map((_, r) => (
          <React.Fragment key={r}>
            <div 
              onClick={(e) => onSelectRow(r, e.shiftKey)}
              className={cn(
                "bg-muted border-r border-b border-border flex items-center justify-center text-xs font-medium text-muted-foreground sticky left-0 z-20 cursor-pointer hover:bg-muted-foreground/10 transition-colors",
                selectionRange.includes(indexToCoordinate(r, 0)) && selectionRange.includes(indexToCoordinate(r, cols - 1)) && "bg-primary/20 text-primary font-bold"
              )}
              role="rowheader"
              aria-label={`Row ${r + 1}`}
            >
              {r + 1}
            </div>
            {Array.from({ length: cols }).map((_, c) => {
              const coord = indexToCoordinate(r, c);
              return (
                <div key={coord} role="row">
                  <Cell
                    coord={coord}
                    data={data[coord]}
                    isActive={selectedCell === coord}
                    isInRange={selectionRange.includes(coord)}
                    isEditing={editingCell === coord}
                    initialValue={editingCell === coord ? editingValue : null}
                    onMouseDown={(coord, shift) => onMouseDown(coord, shift)}
                    onMouseEnter={onMouseEnter}
                    onDoubleClick={onDoubleClick}
                    onUpdate={onUpdate}
                    onFinishEdit={onFinishEdit}
                  />
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};
