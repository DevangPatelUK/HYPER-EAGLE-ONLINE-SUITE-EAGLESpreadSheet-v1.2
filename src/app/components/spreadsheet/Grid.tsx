'use client';

import React, { useMemo, useState, useEffect, memo } from 'react';
import { Cell } from './Cell';
import { indexToCoordinate, Sheet, coordinateToIndex } from '@/app/lib/formula-engine';
import { cn } from '@/lib/utils';

interface GridProps {
  rows: number;
  cols: number;
  activeSheet: Sheet;
  selectedCell: string | null;
  selectionRange: string[];
  editingCell: string | null;
  editingValue: string | null;
  onMouseDown: (coord: string, shift: boolean) => void;
  onMouseEnter: (coord: string) => void;
  onMouseUp: () => void;
  onDoubleClick: (coord: string) => void;
  onUpdate: (coord: string, value: string) => void;
  onUpdateRowHeight: (row: number, height: number) => void;
  onUpdateColWidth: (col: number, width: number) => void;
  onAutoUpdateRowHeight: (row: number) => void;
  onAutoUpdateColWidth: (col: number) => void;
  onFinishEdit: (nextKey?: string) => void;
  onSelectRow: (row: number, shift: boolean) => void;
  onSelectCol: (col: number, shift: boolean) => void;
  onFillStart?: (coord: string) => void;
  isFilling?: boolean;
  fillRange?: string[];
}

export const Grid = memo(({
  rows, cols, activeSheet, selectedCell, selectionRange, editingCell, editingValue,
  onMouseDown, onMouseEnter, onMouseUp, onDoubleClick, onUpdate, 
  onUpdateRowHeight, onUpdateColWidth, onAutoUpdateRowHeight, onAutoUpdateColWidth, onFinishEdit, onSelectRow, onSelectCol,
  onFillStart, isFilling, fillRange
}: GridProps) => {
  const { rowHeights = {}, colWidths = {}, frozenRows = 0, frozenCols = 0, hiddenRows = {}, hiddenCols = {} } = activeSheet;
  const [resizing, setResizing] = useState<{ type: 'col' | 'row', index: number, startPos: number, startSize: number } | null>(null);

  // Find the bottom-right corner of the selection range for the fill handle
  const fillCornerCoord = useMemo(() => {
    if (selectionRange.length === 0) return null;
    let maxRow = -1;
    let maxCol = -1;
    let corner = selectionRange[0];

    selectionRange.forEach(coord => {
      const idx = coordinateToIndex(coord);
      if (idx) {
        if (idx.row > maxRow || (idx.row === maxRow && idx.col > maxCol)) {
          maxRow = idx.row;
          maxCol = idx.col;
          corner = coord;
        }
      }
    });
    return corner;
  }, [selectionRange]);

  const colOffsets = useMemo(() => {
    const offsets = [40];
    let current = 40;
    for (let i = 0; i < cols; i++) {
      const w = hiddenCols[i] ? 0 : (colWidths[i] || 120);
      current += w;
      offsets.push(current);
    }
    return offsets;
  }, [cols, colWidths, hiddenCols]);

  const rowOffsets = useMemo(() => {
    const offsets = [32];
    let current = 32;
    for (let i = 0; i < rows; i++) {
      const h = hiddenRows[i] ? 0 : (rowHeights[i] || 32);
      current += h;
      offsets.push(current);
    }
    return offsets;
  }, [rows, rowHeights, hiddenRows]);

  const gridTemplate = useMemo(() => 
    `40px ${Array.from({ length: cols }).map((_, i) => hiddenCols[i] ? '0px' : `${colWidths[i] || 120}px`).join(' ')}`,
    [cols, colWidths, hiddenCols]
  );

  useEffect(() => {
    if (!resizing) return;
    const hMove = (e: MouseEvent) => {
      const delta = (resizing.type === 'col' ? e.clientX : e.clientY) - resizing.startPos;
      const size = Math.max(20, resizing.startSize + delta);
      if (resizing.type === 'col') onUpdateColWidth(resizing.index, size);
      else onUpdateRowHeight(resizing.index, size);
    };
    const hUp = () => setResizing(null);
    window.addEventListener('mousemove', hMove); window.addEventListener('mouseup', hUp);
    return () => { window.removeEventListener('mousemove', hMove); window.removeEventListener('mouseup', hUp); };
  }, [resizing, onUpdateColWidth, onUpdateRowHeight]);

  return (
    <div 
      className="flex-1 overflow-auto bg-background select-none relative h-full w-full scrollbar-hide transition-colors duration-300"
      onMouseUp={onMouseUp}
    >
      <div className="grid sticky top-0 z-40" style={{ gridTemplateColumns: gridTemplate }}>
        <div className="bg-muted h-8 border-r border-b sticky left-0 z-50 flex items-center justify-center" />
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className={cn("relative bg-muted h-8 border-r border-b flex items-center justify-center text-[10px] font-bold text-muted-foreground", i < frozenCols && "sticky z-50", hiddenCols[i] && "hidden")} style={{ left: i < frozenCols ? `${colOffsets[i]}px` : undefined }}>
            {String.fromCharCode(65 + (i % 26))}
            <div 
              className="absolute right-0 top-0 w-1 h-full cursor-col-resize hover:bg-primary/50 z-50" 
              onMouseDown={(e) => { e.preventDefault(); setResizing({ type: 'col', index: i, startPos: e.clientX, startSize: colWidths[i] || 120 }); }} 
              onDoubleClick={(e) => { e.stopPropagation(); onAutoUpdateColWidth(i); }}
            />
          </div>
        ))}
      </div>

      <div className="grid" style={{ gridTemplateColumns: gridTemplate }}>
        {Array.from({ length: rows }).map((_, r) => (
          <React.Fragment key={r}>
            {!hiddenRows[r] && (
              <div className={cn("relative bg-muted border-r border-b flex items-center justify-center text-[10px] font-bold text-muted-foreground sticky left-0", r < frozenRows ? "z-40 sticky top-0" : "z-20")} style={{ height: rowHeights[r] || 32, top: r < frozenRows ? `${rowOffsets[r]}px` : undefined }}>
                {r + 1}
                <div 
                  className="absolute bottom-0 left-0 w-full h-1 cursor-row-resize hover:bg-primary/50 z-50" 
                  onMouseDown={(e) => { e.preventDefault(); setResizing({ type: 'row', index: r, startPos: e.clientY, startSize: rowHeights[r] || 32 }); }} 
                  onDoubleClick={(e) => { e.stopPropagation(); onAutoUpdateRowHeight(r); }}
                />
              </div>
            )}
            {Array.from({ length: cols }).map((_, c) => {
              const coord = indexToCoordinate(r, c);
              if (hiddenRows[r] || hiddenCols[c]) return null;
              
              const isCellInFillRange = isFilling && fillRange?.includes(coord);

              return (
                <div 
                  key={coord} 
                  className={cn(
                    r < frozenRows && "sticky z-30", 
                    c < frozenCols && "sticky z-30",
                    isCellInFillRange && "ring-1 ring-primary ring-dashed ring-inset bg-primary/5 z-20"
                  )} 
                  style={{ 
                    gridRowStart: r + 1, 
                    gridColumnStart: c + 2, 
                    height: rowHeights[r] || 32, 
                    top: r < frozenRows ? `${rowOffsets[r]}px` : undefined, 
                    left: c < frozenCols ? `${colOffsets[c]}px` : undefined 
                  }}
                >
                  <Cell
                    coord={coord} data={activeSheet.data[coord]} isActive={selectedCell === coord}
                    isInRange={selectionRange.includes(coord)} isEditing={editingCell === coord}
                    isFillCorner={coord === fillCornerCoord}
                    initialValue={editingCell === coord ? editingValue : null}
                    onMouseDown={onMouseDown} onMouseEnter={onMouseEnter} onDoubleClick={onDoubleClick}
                    onUpdate={onUpdate} onFinishEdit={onFinishEdit}
                    onFillStart={() => onFillStart?.(coord)}
                  />
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
});

Grid.displayName = 'Grid';