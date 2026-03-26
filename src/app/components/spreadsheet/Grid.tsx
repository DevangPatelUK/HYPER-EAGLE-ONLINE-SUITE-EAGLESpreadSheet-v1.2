'use client';

import React from 'react';
import { Cell } from './Cell';
import { indexToCoordinate, coordinateToIndex, Sheet } from '@/app/lib/formula-engine';
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
  onMouseUp,
  onDoubleClick,
  onUpdate,
  onFinishEdit,
  onSelectRow,
  onSelectCol,
}) => {
  const data = activeSheet.data;
  const hiddenRows = activeSheet.hiddenRows || {};
  const filteredRows = activeSheet.filteredRows || {};
  const hiddenCols = activeSheet.hiddenCols || {};
  const rowHeights = activeSheet.rowHeights || {};
  const colWidths = activeSheet.colWidths || {};
  const frozenRows = activeSheet.frozenRows || 0;
  const frozenCols = activeSheet.frozenCols || 0;

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

  const colTemplate = `40px ${Array.from({ length: cols })
    .map((_, i) => hiddenCols[i] ? '0px' : `${colWidths[i] || 120}px`)
    .join(' ')}`;

  return (
    <div 
      className="flex-1 overflow-auto bg-white select-none relative"
      role="grid"
      aria-rowcount={rows + 1}
      aria-colcount={cols + 1}
      aria-label="Spreadsheet Grid"
    >
      {/* Column Headers */}
      <div 
        className="grid sticky top-0 left-0 z-40"
        style={{ gridTemplateColumns: colTemplate }}
        role="row"
      >
        <div 
          className="bg-muted h-8 border-r border-b border-border flex items-center justify-center sticky left-0 z-50" 
          role="columnheader"
          aria-label="Select All"
        />
        {Array.from({ length: cols }).map((_, i) => (
          <div
            key={i}
            onClick={(e) => onSelectCol(i, e.shiftKey)}
            className={cn(
              "bg-muted h-8 border-r border-b border-border flex items-center justify-center text-xs font-medium text-muted-foreground cursor-pointer hover:bg-muted-foreground/10 transition-colors overflow-hidden",
              selectionRange.includes(indexToCoordinate(0, i)) && selectionRange.includes(indexToCoordinate(rows - 1, i)) && "bg-primary/20 text-primary font-bold",
              hiddenCols[i] && "hidden",
              i < frozenCols && "sticky left-[40px] z-50"
            )}
            style={{ 
              left: i < frozenCols ? `${40 + (Array.from({ length: i }).reduce((acc, _, idx) => acc + (hiddenCols[idx] ? 0 : (colWidths[idx] || 120)), 0))}px` : undefined 
            }}
            role="columnheader"
            aria-label={`Column ${getColHeader(i)}`}
          >
            {getColHeader(i)}
          </div>
        ))}
      </div>

      <div 
        className="grid relative" 
        style={{ 
          gridTemplateColumns: colTemplate,
        }}
      >
        {Array.from({ length: rows }).map((_, r) => {
          if (hiddenRows[r] || filteredRows[r]) return null;

          const rowHeight = rowHeights[r] || 32;
          const isRowFrozen = r < frozenRows;
          const frozenRowOffset = isRowFrozen ? (Array.from({ length: r }).reduce((acc, _, idx) => acc + (hiddenRows[idx] || filteredRows[idx] ? 0 : (rowHeights[idx] || 32)), 0)) : 0;

          return (
            <React.Fragment key={r}>
              {/* Row Header */}
              <div 
                onClick={(e) => onSelectRow(r, e.shiftKey)}
                className={cn(
                  "bg-muted border-r border-b border-border flex items-center justify-center text-xs font-medium text-muted-foreground sticky left-0 cursor-pointer hover:bg-muted-foreground/10 transition-colors overflow-hidden",
                  selectionRange.includes(indexToCoordinate(r, 0)) && selectionRange.includes(indexToCoordinate(r, cols - 1)) && "bg-primary/20 text-primary font-bold",
                  isRowFrozen ? "z-30 sticky top-0" : "z-20"
                )}
                style={{ 
                  gridRowStart: r + 1, 
                  gridColumnStart: 1,
                  height: rowHeight,
                  top: isRowFrozen ? `${32 + frozenRowOffset}px` : undefined
                }}
                role="rowheader"
                aria-label={`Row ${r + 1}`}
              >
                {r + 1}
              </div>
              {/* Cells in Row */}
              {Array.from({ length: cols }).map((_, c) => {
                if (hiddenCols[c]) return null;

                const isColFrozen = c < frozenCols;
                const coord = indexToCoordinate(r, c);
                const cellData = data[coord];
                
                if (cellData?.hiddenByMerge) return null;

                const frozenColOffset = isColFrozen ? (Array.from({ length: c }).reduce((acc, _, idx) => acc + (hiddenCols[idx] ? 0 : (colWidths[idx] || 120)), 0)) : 0;

                return (
                  <div 
                    key={coord} 
                    role="row"
                    className={cn(
                      isRowFrozen && "sticky top-0 z-30",
                      isColFrozen && "sticky left-[40px] z-30",
                      isRowFrozen && isColFrozen && "z-40"
                    )}
                    style={{ 
                      gridRowStart: r + 1, 
                      gridColumnStart: c + 2,
                      gridRowEnd: cellData?.rowSpan ? `span ${cellData.rowSpan}` : undefined,
                      gridColumnEnd: cellData?.colSpan ? `span ${cellData.colSpan}` : undefined,
                      height: cellData?.rowSpan ? undefined : rowHeight,
                      top: isRowFrozen ? `${32 + frozenRowOffset}px` : undefined,
                      left: isColFrozen ? `${40 + frozenColOffset}px` : undefined
                    }}
                  >
                    <Cell
                      coord={coord}
                      data={cellData}
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
          );
        })}
      </div>
    </div>
  );
};
