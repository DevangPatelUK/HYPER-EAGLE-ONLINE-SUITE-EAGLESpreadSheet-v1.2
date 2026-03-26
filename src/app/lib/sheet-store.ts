'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { SpreadsheetData, evaluateFormula, indexToCoordinate, coordinateToIndex } from './formula-engine';

export function useSheetStore(rows: number, cols: number, initialData: SpreadsheetData = {}) {
  const [data, setData] = useState<SpreadsheetData>(initialData);
  const [selectionAnchor, setSelectionAnchor] = useState<string | null>(null);
  const [selectionFocus, setSelectionFocus] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState<string | null>(null);
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
      setIsDragging(true);
    } else {
      if (selectedCell === coord) {
        // Second click on the same cell: Enter edit mode
        setEditingCell(coord);
        setEditingValue(null);
        setIsDragging(false);
      } else {
        setSelectionAnchor(coord);
        setSelectionFocus(coord);
        setEditingCell(null);
        setEditingValue(null);
        setIsDragging(true);
      }
    }
  };

  const handleMouseEnter = (coord: string) => {
    if (isDragging && !editingCell) {
      setSelectionFocus(coord);
    }
  };

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, [handleMouseUp]);

  const handleCellDoubleClick = (coord: string) => {
    setEditingCell(coord);
    setEditingValue(null);
  };

  const moveSelection = useCallback((direction: 'up' | 'down' | 'left' | 'right') => {
    if (!selectedCell) return;
    const current = coordinateToIndex(selectedCell);
    if (!current) return;

    let { row, col } = current;
    switch (direction) {
      case 'up': if (row > 0) row--; break;
      case 'down': if (row < rows - 1) row++; break;
      case 'left': if (col > 0) col--; break;
      case 'right': if (col < cols - 1) col++; break;
    }

    const next = indexToCoordinate(row, col);
    setSelectionAnchor(next);
    setSelectionFocus(next);
  }, [selectedCell, rows, cols]);

  const selectRow = (rowIdx: number, shiftKey: boolean = false) => {
    const startCoord = indexToCoordinate(rowIdx, 0);
    const endCoord = indexToCoordinate(rowIdx, cols - 1);
    
    if (shiftKey && selectionAnchor) {
      setSelectionFocus(endCoord);
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
      setSelectionFocus(endCoord);
    } else {
      setSelectionAnchor(startCoord);
      setSelectionFocus(endCoord);
    }
    setEditingCell(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (editingCell) return;
    if (!selectedCell) return;

    // Handle navigation
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab', 'Enter'].includes(e.key)) {
      if (e.key === 'ArrowUp') moveSelection('up');
      if (e.key === 'ArrowDown' || e.key === 'Enter') moveSelection('down');
      if (e.key === 'ArrowLeft') moveSelection('left');
      if (e.key === 'ArrowRight' || e.key === 'Tab') moveSelection('right');
      e.preventDefault();
      return;
    }

    // Handle deletion
    if (e.key === 'Backspace' || e.key === 'Delete') {
      selectionRange.forEach(coord => updateCell(coord, { value: '', formula: '' }));
      e.preventDefault();
      return;
    }

    // Start typing to edit
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      setEditingCell(selectedCell);
      setEditingValue(e.key);
      e.preventDefault();
    }
  };

  return {
    data,
    setData,
    selectedCell,
    selectionRange,
    editingCell,
    setEditingCell,
    editingValue,
    setEditingValue,
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
    moveSelection,
  };
}
