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

  const mergeSelection = useCallback(() => {
    if (selectionRange.length < 2) return;
    const startIdx = coordinateToIndex(selectionRange[0])!;
    const endIdx = coordinateToIndex(selectionRange[selectionRange.length - 1])!;
    const minRow = Math.min(startIdx.row, endIdx.row);
    const maxRow = Math.max(startIdx.row, endIdx.row);
    const minCol = Math.min(startIdx.col, endIdx.col);
    const maxCol = Math.max(startIdx.col, endIdx.col);

    const primaryCoord = indexToCoordinate(minRow, minCol);
    const newWb = { ...workbook };
    const sheet = newWb[activeSheetId];
    const newData = { ...sheet.data };

    const rowSpan = maxRow - minRow + 1;
    const colSpan = maxCol - minCol + 1;

    for (let r = minRow; r <= maxRow; r++) {
      for (let c = minCol; c <= maxCol; c++) {
        const coord = indexToCoordinate(r, c);
        if (coord === primaryCoord) {
          newData[coord] = { ...(newData[coord] || { value: '', formula: '' }), rowSpan, colSpan, hiddenByMerge: undefined };
        } else {
          newData[coord] = { ...(newData[coord] || { value: '', formula: '' }), hiddenByMerge: primaryCoord, value: '', formula: '' };
        }
      }
    }

    newWb[activeSheetId] = { ...sheet, data: newData };
    pushToHistory(recalculateAll(newWb));
  }, [selectionRange, activeSheetId, workbook, recalculateAll, pushToHistory]);

  const unmergeSelection = useCallback(() => {
    const newWb = { ...workbook };
    const sheet = newWb[activeSheetId];
    const newData = { ...sheet.data };
    let changed = false;

    selectionRange.forEach(coord => {
      const cell = newData[coord];
      if (cell?.rowSpan || cell?.colSpan || cell?.hiddenByMerge) {
        newData[coord] = { ...cell, rowSpan: undefined, colSpan: undefined, hiddenByMerge: undefined };
        changed = true;
      }
    });

    if (changed) {
      newWb[activeSheetId] = { ...sheet, data: newData };
      pushToHistory(recalculateAll(newWb));
    }
  }, [selectionRange, activeSheetId, workbook, recalculateAll, pushToHistory]);

  const insertRow = useCallback((afterRowIndex: number) => {
    const newWb = { ...workbook };
    const sheet = newWb[activeSheetId];
    if (!sheet) return;
    const newData: SpreadsheetData = {};
    Object.entries(sheet.data).forEach(([coord, cell]) => {
      const { row, col } = coordinateToIndex(coord)!;
      if (row >= afterRowIndex) {
        newData[indexToCoordinate(row + 1, col)] = cell;
      } else {
        newData[coord] = cell;
      }
    });
    
    // Shift row heights and hidden states
    const newRowHeights: Record<number, number> = {};
    if (sheet.rowHeights) {
      Object.entries(sheet.rowHeights).forEach(([r, h]) => {
        const rowIdx = parseInt(r);
        if (rowIdx >= afterRowIndex) newRowHeights[rowIdx + 1] = h;
        else newRowHeights[rowIdx] = h;
      });
    }
    
    const newHiddenRows: Record<number, boolean> = {};
    if (sheet.hiddenRows) {
      Object.entries(sheet.hiddenRows).forEach(([r, hidden]) => {
        const rowIdx = parseInt(r);
        if (rowIdx >= afterRowIndex) newHiddenRows[rowIdx + 1] = hidden;
        else newHiddenRows[rowIdx] = hidden;
      });
    }

    newWb[activeSheetId] = { 
      ...sheet, 
      data: newData, 
      rowHeights: newRowHeights, 
      hiddenRows: newHiddenRows 
    };
    pushToHistory(recalculateAll(newWb));
  }, [activeSheetId, workbook, recalculateAll, pushToHistory]);

  const deleteRow = useCallback((rowIndex: number) => {
    const newWb = { ...workbook };
    const sheet = newWb[activeSheetId];
    if (!sheet) return;
    const newData: SpreadsheetData = {};
    Object.entries(sheet.data).forEach(([coord, cell]) => {
      const { row, col } = coordinateToIndex(coord)!;
      if (row === rowIndex) return;
      if (row > rowIndex) {
        newData[indexToCoordinate(row - 1, col)] = cell;
      } else {
        newData[coord] = cell;
      }
    });

    // Shift row heights and hidden states
    const newRowHeights: Record<number, number> = {};
    if (sheet.rowHeights) {
      Object.entries(sheet.rowHeights).forEach(([r, h]) => {
        const rowIdx = parseInt(r);
        if (rowIdx === rowIndex) return;
        if (rowIdx > rowIndex) newRowHeights[rowIdx - 1] = h;
        else newRowHeights[rowIdx] = h;
      });
    }

    const newHiddenRows: Record<number, boolean> = {};
    if (sheet.hiddenRows) {
      Object.entries(sheet.hiddenRows).forEach(([r, hidden]) => {
        const rowIdx = parseInt(r);
        if (rowIdx === rowIndex) return;
        if (rowIdx > rowIndex) newHiddenRows[rowIdx - 1] = hidden;
        else newHiddenRows[rowIdx] = hidden;
      });
    }

    newWb[activeSheetId] = { 
      ...sheet, 
      data: newData, 
      rowHeights: newRowHeights, 
      hiddenRows: newHiddenRows 
    };
    pushToHistory(recalculateAll(newWb));
  }, [activeSheetId, workbook, recalculateAll, pushToHistory]);

  const insertCol = useCallback((afterColIndex: number) => {
    const newWb = { ...workbook };
    const sheet = newWb[activeSheetId];
    if (!sheet) return;
    const newData: SpreadsheetData = {};
    Object.entries(sheet.data).forEach(([coord, cell]) => {
      const { row, col } = coordinateToIndex(coord)!;
      if (col >= afterColIndex) {
        newData[indexToCoordinate(row, col + 1)] = cell;
      } else {
        newData[coord] = cell;
      }
    });

    // Shift col widths and hidden states
    const newColWidths: Record<number, number> = {};
    if (sheet.colWidths) {
      Object.entries(sheet.colWidths).forEach(([c, w]) => {
        const colIdx = parseInt(c);
        if (colIdx >= afterColIndex) newColWidths[colIdx + 1] = w;
        else newColWidths[colIdx] = w;
      });
    }

    const newHiddenCols: Record<number, boolean> = {};
    if (sheet.hiddenCols) {
      Object.entries(sheet.hiddenCols).forEach(([c, hidden]) => {
        const colIdx = parseInt(c);
        if (colIdx >= afterColIndex) newHiddenCols[colIdx + 1] = hidden;
        else newHiddenCols[colIdx] = hidden;
      });
    }

    newWb[activeSheetId] = { 
      ...sheet, 
      data: newData, 
      colWidths: newColWidths, 
      hiddenCols: newHiddenCols 
    };
    pushToHistory(recalculateAll(newWb));
  }, [activeSheetId, workbook, recalculateAll, pushToHistory]);

  const deleteCol = useCallback((colIndex: number) => {
    const newWb = { ...workbook };
    const sheet = newWb[activeSheetId];
    if (!sheet) return;
    const newData: SpreadsheetData = {};
    Object.entries(sheet.data).forEach(([coord, cell]) => {
      const { row, col } = coordinateToIndex(coord)!;
      if (col === colIndex) return;
      if (col > colIndex) {
        newData[indexToCoordinate(row, col - 1)] = cell;
      } else {
        newData[coord] = cell;
      }
    });

    // Shift col widths and hidden states
    const newColWidths: Record<number, number> = {};
    if (sheet.colWidths) {
      Object.entries(sheet.colWidths).forEach(([c, w]) => {
        const colIdx = parseInt(c);
        if (colIdx === colIndex) return;
        if (colIdx > colIndex) newColWidths[colIdx - 1] = w;
        else newColWidths[colIdx] = w;
      });
    }

    const newHiddenCols: Record<number, boolean> = {};
    if (sheet.hiddenCols) {
      Object.entries(sheet.hiddenCols).forEach(([c, hidden]) => {
        const colIdx = parseInt(c);
        if (colIdx === colIndex) return;
        if (colIdx > colIndex) newHiddenCols[colIdx - 1] = hidden;
        else newHiddenCols[colIdx] = hidden;
      });
    }

    newWb[activeSheetId] = { 
      ...sheet, 
      data: newData, 
      colWidths: newColWidths, 
      hiddenCols: newHiddenCols 
    };
    pushToHistory(recalculateAll(newWb));
  }, [activeSheetId, workbook, recalculateAll, pushToHistory]);

  const hideRows = useCallback((rowIndices: number[], hide: boolean) => {
    const newWb = { ...workbook };
    const sheet = newWb[activeSheetId];
    if (!sheet) return;
    const newHiddenRows = { ...(sheet.hiddenRows || {}) };
    rowIndices.forEach(idx => {
      if (hide) newHiddenRows[idx] = true;
      else delete newHiddenRows[idx];
    });
    newWb[activeSheetId] = { ...sheet, hiddenRows: newHiddenRows };
    pushToHistory(newWb);
  }, [activeSheetId, workbook, pushToHistory]);

  const hideCols = useCallback((colIndices: number[], hide: boolean) => {
    const newWb = { ...workbook };
    const sheet = newWb[activeSheetId];
    if (!sheet) return;
    const newHiddenCols = { ...(sheet.hiddenCols || {}) };
    colIndices.forEach(idx => {
      if (hide) newHiddenCols[idx] = true;
      else delete newHiddenCols[idx];
    });
    newWb[activeSheetId] = { ...sheet, hiddenCols: newHiddenCols };
    pushToHistory(newWb);
  }, [activeSheetId, workbook, pushToHistory]);

  const sortRange = useCallback((direction: 'asc' | 'desc') => {
    if (selectionRange.length < 2) return;
    const start = coordinateToIndex(selectionRange[0])!;
    const end = coordinateToIndex(selectionRange[selectionRange.length - 1])!;
    const minRow = Math.min(start.row, end.row);
    const maxRow = Math.max(start.row, end.row);
    const minCol = Math.min(start.col, end.col);
    const maxCol = Math.max(start.col, end.col);

    const newWb = { ...workbook };
    const sheet = newWb[activeSheetId];
    const newData = { ...sheet.data };

    const rowsToSort: any[][] = [];
    for (let r = minRow; r <= maxRow; r++) {
      const rowData = [];
      for (let c = minCol; c <= maxCol; c++) {
        rowData.push(newData[indexToCoordinate(r, c)] || { value: '', formula: '' });
      }
      rowsToSort.push(rowData);
    }

    rowsToSort.sort((a, b) => {
      const valA = a[0].value || '';
      const valB = b[0].value || '';
      if (!isNaN(parseFloat(valA)) && !isNaN(parseFloat(valB))) {
        return direction === 'asc' ? parseFloat(valA) - parseFloat(valB) : parseFloat(valB) - parseFloat(valA);
      }
      return direction === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
    });

    rowsToSort.forEach((rowData, rIdx) => {
      rowData.forEach((cellData, cIdx) => {
        newData[indexToCoordinate(minRow + rIdx, minCol + cIdx)] = cellData;
      });
    });

    newWb[activeSheetId] = { ...sheet, data: newData };
    pushToHistory(recalculateAll(newWb));
  }, [selectionRange, activeSheetId, workbook, recalculateAll, pushToHistory]);

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
    
    // Auto-expand selection to include the primary cell if clicking a hidden cell
    const cell = data[coord];
    const effectiveCoord = cell?.hiddenByMerge || coord;

    if (shiftKey && selectionAnchor) {
      setSelectionFocus(effectiveCoord);
    } else {
      if (selectionAnchor === effectiveCoord) {
        setEditingCell(effectiveCoord);
        setEditingValue(null);
      } else {
        setSelectionAnchor(effectiveCoord);
        setSelectionFocus(effectiveCoord);
        setEditingCell(null);
      }
    }
    setIsDragging(true);
  };

  const handleMouseEnter = (coord: string) => {
    if (isDragging && !editingCell) {
      const cell = data[coord];
      setSelectionFocus(cell?.hiddenByMerge || coord);
    }
  };

  const handleMouseUp = useCallback(() => setIsDragging(false), []);

  useEffect(() => {
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, [handleMouseUp]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (editingCell) return;

    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
      if (e.shiftKey) redo();
      else undo();
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
    mergeSelection,
    unmergeSelection,
    insertRow,
    deleteRow,
    insertCol,
    deleteCol,
    hideRows,
    hideCols,
    sortRange,
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