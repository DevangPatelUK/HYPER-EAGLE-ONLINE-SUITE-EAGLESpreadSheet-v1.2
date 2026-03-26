'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { SpreadsheetData, evaluateFormula, indexToCoordinate, coordinateToIndex } from './formula-engine';

export function useSheetStore(rows: number, cols: number, initialData: SpreadsheetData = {}) {
  const [data, setData] = useState<SpreadsheetData>(initialData);
  const [selectionAnchor, setSelectionAnchor] = useState<string | null>(null);
  const [selectionFocus, setSelectionFocus] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [sheetName, setSheetName] = useState('Untitled Sheet');

  // The "Active" cell is the one where the selection started
  const selectedCell = selectionAnchor;

  const selectionRange = useMemo(() => {
    if (!selectionAnchor || !selectionFocus) return selectionAnchor ? [selectionAnchor] : [];
    
    const start = coordinateToIndex(selectionAnchor);
    const end = coordinateToIndex(selectionFocus);
    if (!start || !end) return [selectionAnchor];

    const coords: string[] = [];
    const minRow = Math.min(start.row, end.row);
    const maxRow = Math.max(start.row, end.row);
    const minCol = Math.min(start.col, end.col);
    const maxCol = Math.max(start.col, end.col);

    for (let r = minRow; r <= maxRow; r++) {
      for (let c = minCol; c <= maxCol; c++) {
        coords.push(indexToCoordinate(r, c));
      }
    }
    return coords;
  }, [selectionAnchor, selectionFocus]);

  const updateCell = useCallback((coord: string, updates: Partial<SpreadsheetData[string]>) => {
    setData((prev) => {
      const newData = { ...prev };
      const current = newData[coord] || { value: '', formula: '' };
      
      let finalFormula = updates.formula !== undefined ? updates.formula : current.formula;
      let finalValue = updates.value !== undefined ? updates.value : current.value;

      newData[coord] = { 
        ...current, 
        ...updates,
        formula: finalFormula,
        value: finalValue
      };

      const updatedData: SpreadsheetData = { ...newData };
      // Recalculate all formulas dependent on changes
      Object.keys(updatedData).forEach((key) => {
        const cell = updatedData[key];
        if (cell.formula?.startsWith('=')) {
          updatedData[key] = {
            ...cell,
            value: evaluateFormula(cell.formula, updatedData)
          };
        }
      });

      return updatedData;
    });
  }, []);

  const handleMouseDown = (coord: string, shiftKey: boolean = false) => {
    if (editingCell === coord) return;
    
    if (shiftKey && selectionAnchor) {
      setSelectionFocus(coord);
    } else {
      setSelectionAnchor(coord);
      setSelectionFocus(coord);
    }
    setIsDragging(true);
    setEditingCell(null);
  };

  const handleMouseEnter = (coord: string) => {
    if (isDragging) {
      setSelectionFocus(coord);
    }
  };

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Use a global listener to ensure dragging stops even if mouse is released outside the grid
  useEffect(() => {
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, [handleMouseUp]);

  const handleCellDoubleClick = (coord: string) => {
    setEditingCell(coord);
  };

  const selectRow = (rowIdx: number, shiftKey: boolean = false) => {
    const startCoord = indexToCoordinate(rowIdx, 0);
    const endCoord = indexToCoordinate(rowIdx, cols - 1);
    
    if (shiftKey && selectionAnchor) {
      const anchorIdx = coordinateToIndex(selectionAnchor);
      if (anchorIdx) {
        setSelectionFocus(endCoord);
      }
    } else {
      setSelectionAnchor(startCoord);
      setSelectionFocus(endCoord);
    }
    setEditingCell(null);
  };

  const selectCol = (colIdx: number, shiftKey: boolean = false) => {
    const startCoord = indexToCoordinate(0, colIdx);
    const endCoord = indexToCoordinate(rows - 1, colIdx);
    
    if (shiftKey && selectionAnchor) {
      const anchorIdx = coordinateToIndex(selectionAnchor);
      if (anchorIdx) {
        setSelectionFocus(endCoord);
      }
    } else {
      setSelectionAnchor(startCoord);
      setSelectionFocus(endCoord);
    }
    setEditingCell(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent, rows: number, cols: number) => {
    if (!selectedCell || editingCell) return;

    const start = coordinateToIndex(selectedCell);
    if (!start) return;
    
    let { row, col } = start;

    switch (e.key) {
      case 'ArrowUp':
        if (row > 0) {
          const next = indexToCoordinate(row - 1, col);
          setSelectionAnchor(next);
          setSelectionFocus(next);
        }
        e.preventDefault();
        break;
      case 'ArrowDown':
        if (row < rows - 1) {
          const next = indexToCoordinate(row + 1, col);
          setSelectionAnchor(next);
          setSelectionFocus(next);
        }
        e.preventDefault();
        break;
      case 'ArrowLeft':
        if (col > 0) {
          const next = indexToCoordinate(row, col - 1);
          setSelectionAnchor(next);
          setSelectionFocus(next);
        }
        e.preventDefault();
        break;
      case 'ArrowRight':
        if (col < cols - 1) {
          const next = indexToCoordinate(row, col + 1);
          setSelectionAnchor(next);
          setSelectionFocus(next);
        }
        e.preventDefault();
        break;
      case 'Enter':
        setEditingCell(selectedCell);
        e.preventDefault();
        break;
      case 'Tab':
        if (col < cols - 1) {
          const next = indexToCoordinate(row, col + 1);
          setSelectionAnchor(next);
          setSelectionFocus(next);
        }
        e.preventDefault();
        break;
      case 'Backspace':
      case 'Delete':
        selectionRange.forEach(coord => updateCell(coord, { value: '', formula: '' }));
        break;
      default:
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
          setEditingCell(selectedCell);
        }
        break;
    }
  };

  return {
    data,
    setData,
    selectedCell,
    selectionRange,
    editingCell,
    setEditingCell,
    updateCell,
    handleMouseDown,
    handleMouseEnter,
    handleMouseUp,
    handleCellDoubleClick,
    handleKeyDown,
    sheetName,
    setSheetName,
    selectRow,
    selectCol,
  };
}
