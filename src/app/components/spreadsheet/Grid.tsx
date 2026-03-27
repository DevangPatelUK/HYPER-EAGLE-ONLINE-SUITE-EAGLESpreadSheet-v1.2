'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { Cell } from './Cell';
import { indexToCoordinate, Sheet } from '@/app/lib/formula-engine';
import { cn } from '@/lib/utils';

interface GridProps {
  rows: number;
  cols: number;
  activeSheet: Sheet;
  selectedCell: string | null;
  selectionRange: string[];
  editingCell: string | null;
  editingValue: string | null;
  onMouseDown: (coord: string, shiftKey: boolean) => void;
  onMouseEnter: (coord: string) => void;
  onMouseUp: () => void;
  onDoubleClick: (coord: string) => void;
  onUpdate: (coord: string, value: string) => void;
  onUpdateRowHeight: (row: number, height: number) => void;
  onUpdateColWidth: (col: number, width: number) => void;
  onFinishEdit: (nextKey?: string) => void;
  onSelectRow: (row: number, shift: boolean) => void;
  onSelectCol: (col: number, shift: boolean) => void;
}

export const Grid: React.FC<GridProps> = ({
  rows,
  cols,
  activeSheet,
  selectedCell,
  selectionRange,
  editingCell,
  editingValue,
  onMouseDown,
  onMouseEnter,
  onDoubleClick,
  onUpdate,
  onUpdateRowHeight,
  onUpdateColWidth,
  onFinishEdit,
  onSelectRow,
  onSelectCol,
}) => {
  const { hiddenRows = {}, filteredRows = {}, hiddenCols = {}, rowHeights = {}, colWidths = {}, frozenRows = 0, frozenCols = 0 } = activeSheet;

  const [resizing, setResizing] = useState<{ type: 'col' | 'row', index: number, startPos: number, startSize: number } | null>(null);

  const colOffsets = useMemo(() => {
    const offsets = [40];
    for (let i = 0; i < cols; i++) {
      offsets.push(offsets[i] + (hiddenCols[i] ? 0 : (colWidths[i] || 120)));
    }
    return offsets;
  }, [cols, hiddenCols, colWidths]);

  const rowOffsets = useMemo(() => {
    const offsets = [32];
    for (let i = 0; i < rows; i++) {
      offsets.push(offsets[i] + (hiddenRows[i] || filteredRows[i] ? 0 : (rowHeights[i] || 32)));
    }
    return offsets;
  }, [rows, hiddenRows, filteredRows, rowHeights]);

  const colTemplate = useMemo(() => 
    `40px ${Array.from({ length: cols }).map((_, i) => hiddenCols[i] ? '0px' : `${colWidths[i] || 120}px`).join(' ')}`,
    [cols, hiddenCols, colWidths]
  );

  const handleResizeStart = (e: React.MouseEvent, type: 'col' | 'row', index: number, initialSize: number) => {
    e.stopPropagation();
    e.preventDefault();
    setResizing({
      type,
      index,
      startPos: type === 'col' ? e.clientX : e.clientY,
      startSize: initialSize
    });
  };

  useEffect(() => {
    if (!resizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const delta = (resizing.type === 'col' ? e.clientX : e.clientY) - resizing.startPos;
      const newSize = Math.max(20, resizing.startSize + delta);
      if (resizing.type === 'col') {
        onUpdateColWidth(resizing.index, newSize);
      } else {
        onUpdateRowHeight(resizing.index, newSize);
      }
    };

    const handleMouseUp = () => {
      setResizing(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizing, onUpdateColWidth, onUpdateRowHeight]);

  return (
    <div className="flex-1 overflow-auto bg-white select-none relative" role="grid">
      <div className="grid sticky top-0 left-0 z-40" style={{ gridTemplateColumns: colTemplate }}>
        <div className="bg-muted h-8 border-r border-b border-border flex items-center justify-center sticky left-0 z-50" />
        {Array.from({ length: cols }).map((_, i) => {
          if (hiddenCols[i]) return null;
          return (
            <div
              key={i}
              onClick={(e) => onSelectCol(i, e.shiftKey)}
              className={cn(
                "relative bg-muted h-8 border-r border-b border-border flex items-center justify-center text-[10px] font-bold text-muted-foreground cursor-pointer hover:bg-primary/10 transition-colors",
                i < frozenCols && "sticky left-[40px] z-50"
              )}
              style={{ left: i < frozenCols ? `${colOffsets[i]}px` : undefined }}
            >
              {String.fromCharCode(65 + (i % 26))}
              {/* Column Resize Handle */}
              <div
                className="absolute right-0 top-0 w-1.5 h-full cursor-col-resize hover:bg-primary/50 z-50"
                onMouseDown={(e) => handleResizeStart(e, 'col', i, colWidths[i] || 120)}
              />
            </div>
          );
        })}
      </div>

      <div className="grid relative" style={{ gridTemplateColumns: colTemplate }}>
        {Array.from({ length: rows }).map((_, r) => {
          if (hiddenRows[r] || filteredRows[r]) return null;
          const isRowFrozen = r < frozenRows;
          return (
            <React.Fragment key={r}>
              <div 
                onClick={(e) => onSelectRow(r, e.shiftKey)}
                className={cn("relative bg-muted border-r border-b border-border flex items-center justify-center text-[10px] font-bold text-muted-foreground sticky left-0 cursor-pointer hover:bg-primary/10", isRowFrozen ? "z-30 sticky top-0" : "z-20")}
                style={{ gridRowStart: r + 1, height: rowHeights[r] || 32, top: isRowFrozen ? `${rowOffsets[r]}px` : undefined }}
              >
                {r + 1}
                {/* Row Resize Handle */}
                <div
                  className="absolute bottom-0 left-0 w-full h-1.5 cursor-row-resize hover:bg-primary/50 z-50"
                  onMouseDown={(e) => handleResizeStart(e, 'row', r, rowHeights[r] || 32)}
                />
              </div>
              {Array.from({ length: cols }).map((_, c) => {
                if (hiddenCols[c]) return null;
                const coord = indexToCoordinate(r, c);
                const cellData = activeSheet.data[coord];
                if (cellData?.hiddenByMerge) return null;
                return (
                  <div 
                    key={coord} 
                    className={cn(isRowFrozen && "sticky top-0 z-30", c < frozenCols && "sticky left-[40px] z-30")}
                    style={{ gridRowStart: r + 1, gridColumnStart: c + 2, height: rowHeights[r] || 32, top: isRowFrozen ? `${rowOffsets[r]}px` : undefined, left: c < frozenCols ? `${colOffsets[c]}px` : undefined }}
                  >
                    <Cell
                      coord={coord} data={cellData} isActive={selectedCell === coord}
                      isInRange={selectionRange.includes(coord)} isEditing={editingCell === coord}
                      initialValue={editingCell === coord ? editingValue : null}
                      onMouseDown={onMouseDown} onMouseEnter={onMouseEnter}
                      onDoubleClick={onDoubleClick} onUpdate={onUpdate} onFinishEdit={onFinishEdit}
                    />
                  </div>
                );
              })}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
