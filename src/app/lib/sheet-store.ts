'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { 
  SpreadsheetData, 
  evaluateFormula, 
  indexToCoordinate, 
  coordinateToIndex, 
  Sheet, 
  WorkbookData 
} from './formula-engine';

export function useSheetStore(rows: number, cols: number) {
  const [workbook, setWorkbook] = useState<WorkbookData>({
    'sheet-1': { id: 'sheet-1', name: 'Sheet1', data: {} }
  });
  const [activeSheetId, setActiveSheetId] = useState('sheet-1');
  
  // Undo/Redo History
  const [past, setPast] = useState<WorkbookData[]>([]);
  const [future, setFuture] = useState<WorkbookData[]>([]);

  const [selectionAnchor, setSelectionAnchor] = useState<string | null>(null);
  const [selectionFocus, setSelectionFocus] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState<string | null>(null);

  const activeSheet = workbook[activeSheetId];
  const data = activeSheet?.data || {};

  const selectionRange = useMemo(() => {
    if (!selectionAnchor || !selectionFocus) return selectionAnchor ? [selectionAnchor] : [];
    const start = coordinateToIndex(selectionAnchor);
    const end = coordinateToIndex(selectionFocus);
    if (!start || !end) return [selectionAnchor];

    const coords: string[] = [];
    for (let r = Math.min(start.row, end.row); r <= Math.max(start.row, end.row); r++) {
      for (let c = Math.min(start.col, end.col); c <= Math.max(start.col, end.col); c++) {
        coords.push(indexToCoordinate(r, c));
      }
    }
    return coords;
  }, [selectionAnchor, selectionFocus]);

  const recalculateAll = useCallback((wb: WorkbookData) => {
    const updatedWb = { ...wb };
    for (let i = 0; i < 3; i++) {
      Object.keys(updatedWb).forEach(sheetId => {
        const sheet = updatedWb[sheetId];
        const newData = { ...sheet.data };
        let changed = false;
        Object.keys(newData).forEach(coord => {
          const cell = newData[coord];
          if (cell.formula?.startsWith('=')) {
            const newValue = evaluateFormula(coord, cell.formula, updatedWb, sheetId);
            if (newValue !== cell.value) {
              newData[coord] = { ...cell, value: newValue };
              changed = true;
            }
          }
        });
        if (changed) {
          updatedWb[sheetId] = { ...sheet, data: newData };
        }
      });
    }
    return updatedWb;
  }, []);

  const pushToHistory = useCallback((newWb: WorkbookData) => {
    setPast(prev => [...prev, workbook]);
    setFuture([]);
    setWorkbook(newWb);
  }, [workbook]);

  const undo = useCallback(() => {
    if (past.length === 0) return;
    const previous = past[past.length - 1];
    const newPast = past.slice(0, past.length - 1);
    
    setFuture(prev => [workbook, ...prev]);
    setPast(newPast);
    setWorkbook(previous);
  }, [past, workbook]);

  const redo = useCallback(() => {
    if (future.length === 0) return;
    const next = future[0];
    const newFuture = future.slice(1);

    setPast(prev => [...prev, workbook]);
    setFuture(newFuture);
    setWorkbook(next);
  }, [future, workbook]);

  const updateCell = useCallback((coord: string, updates: Partial<SpreadsheetData[string]>) => {
    const newWb = { ...workbook };
    const sheet = newWb[activeSheetId];
    if (!sheet) return;
    const newData = { ...sheet.data };
    const current = newData[coord] || { value: '', formula: '' };
    newData[coord] = { ...current, ...updates };
    newWb[activeSheetId] = { ...sheet, data: newData };
    const finalWb = recalculateAll(newWb);
    pushToHistory(finalWb);
  }, [activeSheetId, workbook, recalculateAll, pushToHistory]);

  const addSheet = () => {
    const id = `sheet-${Date.now()}`;
    const name = `Sheet${Object.keys(workbook).length + 1}`;
    const newWb = {
      ...workbook,
      [id]: { id, name, data: {} }
    };
    pushToHistory(newWb);
    setActiveSheetId(id);
  };

  const renameSheet = (id: string, newName: string) => {
    if (!workbook[id]) return;
    const newWb = {
      ...workbook,
      [id]: { ...workbook[id], name: newName }
    };
    pushToHistory(newWb);
  };

  const removeSheet = (id: string) => {
    if (Object.keys(workbook).length <= 1) return;
    const newWb = { ...workbook };
    delete newWb[id];
    const finalWb = recalculateAll(newWb);
    pushToHistory(finalWb);
    if (activeSheetId === id) {
      setActiveSheetId(Object.keys(workbook).find(k => k !== id)!);
    }
  };

  const handleMouseDown = (coord: string, shiftKey: boolean = false) => {
    if (editingCell === coord) return;
    if (shiftKey && selectionAnchor) {
      setSelectionFocus(coord);
    } else {
      if (selectionAnchor === coord) {
        setEditingCell(coord);
        setEditingValue(null);
      } else {
        setSelectionAnchor(coord);
        setSelectionFocus(coord);
        setEditingCell(null);
      }
    }
    setIsDragging(true);
  };

  const handleMouseEnter = (coord: string) => {
    if (isDragging && !editingCell) setSelectionFocus(coord);
  };

  const handleMouseUp = useCallback(() => setIsDragging(false), []);

  useEffect(() => {
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, [handleMouseUp]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (editingCell) return;

    // Undo/Redo Shortcuts
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
      if (e.shiftKey) {
        redo();
      } else {
        undo();
      }
      e.preventDefault();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
      redo();
      e.preventDefault();
      return;
    }

    if (!selectionAnchor) return;

    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab', 'Enter'].includes(e.key)) {
      const current = coordinateToIndex(selectionAnchor)!;
      let { row, col } = current;
      if (e.key === 'ArrowUp' && row > 0) row--;
      if ((e.key === 'ArrowDown' || e.key === 'Enter') && row < rows - 1) row++;
      if (e.key === 'ArrowLeft' && col > 0) col--;
      if ((e.key === 'ArrowRight' || e.key === 'Tab') && col < cols - 1) col++;
      const next = indexToCoordinate(row, col);
      setSelectionAnchor(next);
      setSelectionFocus(next);
      e.preventDefault();
    } else if (e.key === 'Backspace' || e.key === 'Delete') {
      const newWb = { ...workbook };
      const sheet = newWb[activeSheetId];
      if (!sheet) return;
      const newData = { ...sheet.data };
      selectionRange.forEach(c => {
        newData[c] = { ...newData[c], value: '', formula: '' };
      });
      newWb[activeSheetId] = { ...sheet, data: newData };
      pushToHistory(recalculateAll(newWb));
      e.preventDefault();
    } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
      setEditingCell(selectionAnchor);
      setEditingValue(e.key);
      e.preventDefault();
    }
  };

  return {
    workbook,
    setWorkbook,
    activeSheetId,
    setActiveSheetId,
    data,
    selectedCell: selectionAnchor,
    selectionRange,
    editingCell,
    setEditingCell,
    editingValue,
    setEditingValue,
    updateCell,
    handleMouseDown,
    handleMouseEnter,
    handleMouseUp,
    handleKeyDown,
    addSheet,
    renameSheet,
    removeSheet,
    undo,
    redo,
    canUndo: past.length > 0,
    canRedo: future.length > 0,
    selectRow: (r: number) => {
      setSelectionAnchor(indexToCoordinate(r, 0));
      setSelectionFocus(indexToCoordinate(r, cols - 1));
    },
    selectCol: (c: number) => {
      setSelectionAnchor(indexToCoordinate(0, c));
      setSelectionFocus(indexToCoordinate(rows - 1, c));
    },
  };
}
