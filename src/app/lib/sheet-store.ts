'use client';

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { 
  SpreadsheetData, 
  evaluateFormula, 
  indexToCoordinate, 
  coordinateToIndex, 
  Sheet, 
  WorkbookData,
  Filter,
  ChartType,
  SpreadsheetChart,
  CellData,
  parseRange
} from './formula-engine';

const HISTORY_LIMIT = 30;
const STORAGE_KEY_WORKBOOK = 'sheetflow_current_workbook';
const STORAGE_KEY_PAST = 'sheetflow_history_past';
const STORAGE_KEY_FUTURE = 'sheetflow_history_future';

interface ClipboardData {
  rows: number;
  cols: number;
  cells: Record<string, CellData>;
}

export function useSheetStore(rowsCount: number, colsCount: number) {
  const [workbook, setWorkbook] = useState<WorkbookData>({
    'sheet-1': { id: 'sheet-1', name: 'Sheet1', data: {}, charts: [] }
  });
  const [activeSheetId, setActiveSheetId] = useState('sheet-1');
  const [past, setPast] = useState<WorkbookData[]>([]);
  const [future, setFuture] = useState<WorkbookData[]>([]);
  
  const isDirty = useRef(false);
  
  const [selectionAnchor, setSelectionAnchor] = useState<string | null>(null);
  const [selectionFocus, setSelectionFocus] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState<string | null>(null);
  const [clipboard, setClipboard] = useState<ClipboardData | null>(null);

  const activeSheet = workbook[activeSheetId];
  const data = activeSheet?.data || {};

  // Hydration from LocalStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const savedWorkbook = localStorage.getItem(STORAGE_KEY_WORKBOOK);
    const savedPast = localStorage.getItem(STORAGE_KEY_PAST);
    const savedFuture = localStorage.getItem(STORAGE_KEY_FUTURE);

    if (savedWorkbook) {
      try { 
        const parsed = JSON.parse(savedWorkbook);
        setWorkbook(parsed);
        const firstId = Object.keys(parsed)[0];
        if (firstId) setActiveSheetId(firstId);
      } catch (e) { console.error('Recovery failed:', e); }
    }
    if (savedPast) setPast(JSON.parse(savedPast));
    if (savedFuture) setFuture(JSON.parse(savedFuture));
  }, []);

  // Persistence to LocalStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEY_WORKBOOK, JSON.stringify(workbook));
    localStorage.setItem(STORAGE_KEY_PAST, JSON.stringify(past));
    localStorage.setItem(STORAGE_KEY_FUTURE, JSON.stringify(future));
  }, [workbook, past, future]);

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

  const recalculateAll = useCallback((wb: WorkbookData) => {
    const updatedWb = JSON.parse(JSON.stringify(wb));
    Object.keys(updatedWb).forEach(sheetId => {
      const sheet = updatedWb[sheetId];
      const newData = { ...sheet.data };
      Object.keys(newData).forEach(coord => {
        const cell = newData[coord];
        if (cell.formula?.startsWith('=')) {
          newData[coord] = { ...cell, value: evaluateFormula(coord, cell.formula, updatedWb, sheetId) };
        }
      });
      updatedWb[sheetId] = { ...sheet, data: newData };
    });
    return updatedWb;
  }, []);

  const pushToHistory = useCallback((newWb: WorkbookData) => {
    setPast(prev => [...prev, workbook].slice(-HISTORY_LIMIT));
    setFuture([]);
    setWorkbook(newWb);
    isDirty.current = true;
  }, [workbook]);

  const updateCell = useCallback((coord: string, updates: Partial<CellData>) => {
    const newWb = JSON.parse(JSON.stringify(workbook));
    const sheet = newWb[activeSheetId];
    if (!sheet) return;
    sheet.data[coord] = { ...(sheet.data[coord] || { value: '', formula: '' }), ...updates };
    pushToHistory(recalculateAll(newWb));
  }, [activeSheetId, workbook, recalculateAll, pushToHistory]);

  const moveSelection = useCallback((key: string, ctrl: boolean = false, shift: boolean = false) => {
    if (!selectionFocus) return;
    const current = coordinateToIndex(selectionFocus)!;
    let { row, col } = current;

    if (ctrl) {
      if (key === 'ArrowUp') row = 0;
      if (key === 'ArrowDown') row = rowsCount - 1;
      if (key === 'ArrowLeft') col = 0;
      if (key === 'ArrowRight') col = colsCount - 1;
    } else {
      if (key === 'ArrowUp') row = Math.max(0, row - 1);
      if (key === 'ArrowDown' || key === 'Enter') row = Math.min(rowsCount - 1, row + 1);
      if (key === 'ArrowLeft') col = Math.max(0, col - 1);
      if (key === 'ArrowRight' || key === 'Tab') col = Math.min(colsCount - 1, col + 1);
    }

    const next = indexToCoordinate(row, col);
    if (shift) {
      setSelectionFocus(next);
    } else {
      setSelectionAnchor(next);
      setSelectionFocus(next);
    }
  }, [selectionFocus, rowsCount, colsCount]);

  const finishEdit = useCallback((nextKey?: string) => {
    setEditingCell(null);
    setEditingValue(null);
    if (nextKey) {
      moveSelection(nextKey);
    }
  }, [moveSelection]);

  const handleMouseDown = (coord: string, shiftKey: boolean = false) => {
    if (editingCell === coord) return;
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
    if (isDragging && !editingCell) setSelectionFocus(data[coord]?.hiddenByMerge || coord);
  };

  const handleMouseUp = useCallback(() => setIsDragging(false), []);

  useEffect(() => {
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, [handleMouseUp]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (editingCell) return;
    const cmdKey = e.metaKey || e.ctrlKey;
    
    // Copy/Paste
    if (cmdKey && e.key.toLowerCase() === 'c') {
      const selection = selectionRange;
      if (selection.length > 0) {
        const start = coordinateToIndex(selectionAnchor!)!;
        const end = coordinateToIndex(selectionFocus!)!;
        const minRow = Math.min(start.row, end.row);
        const minCol = Math.min(start.col, end.col);
        const maxRow = Math.max(start.row, end.row);
        const maxCol = Math.max(start.col, end.col);

        const cells: Record<string, CellData> = {};
        selection.forEach(c => {
          if (data[c]) cells[c] = { ...data[c] };
        });

        setClipboard({
          rows: maxRow - minRow + 1,
          cols: maxCol - minCol + 1,
          cells
        });
      }
      e.preventDefault();
      return;
    }

    if (cmdKey && e.key.toLowerCase() === 'v' && clipboard) {
      const targetAnchor = coordinateToIndex(selectionAnchor!)!;
      const newWb = JSON.parse(JSON.stringify(workbook));
      const sheet = newWb[activeSheetId];
      
      const sourceAnchor = coordinateToIndex(Object.keys(clipboard.cells)[0])!;
      
      Object.entries(clipboard.cells).forEach(([coord, cell]) => {
        const sourceIdx = coordinateToIndex(coord)!;
        const rowOffset = sourceIdx.row - sourceAnchor.row;
        const colOffset = sourceIdx.col - sourceAnchor.col;
        const targetCoord = indexToCoordinate(targetAnchor.row + rowOffset, targetAnchor.col + colOffset);
        sheet.data[targetCoord] = { ...cell };
      });

      pushToHistory(recalculateAll(newWb));
      e.preventDefault();
      return;
    }

    // Undo/Redo
    if (cmdKey && e.key.toLowerCase() === 'z') { 
      e.shiftKey ? redo() : undo(); 
      e.preventDefault(); 
      return; 
    }
    
    if (!selectionAnchor) return;

    // Clear content
    if (e.key === 'Backspace' || e.key === 'Delete') {
      if (selectionRange.length > 0) {
        const newWb = JSON.parse(JSON.stringify(workbook));
        const sheet = newWb[activeSheetId];
        let changed = false;
        selectionRange.forEach(c => {
          if (sheet.data[c]) {
            sheet.data[c] = { ...sheet.data[c], value: '', formula: '' };
            changed = true;
          }
        });
        if (changed) pushToHistory(recalculateAll(newWb));
        e.preventDefault();
      }
      return;
    }

    // Navigation
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab', 'Enter'].includes(e.key)) {
      moveSelection(e.key, cmdKey, e.shiftKey);
      e.preventDefault();
    } else if (e.key.length === 1 && !cmdKey && !e.altKey) {
      setEditingCell(selectionAnchor);
      setEditingValue(e.key);
      e.preventDefault();
    }
  };

  const undo = () => { if (past.length) { setFuture([workbook, ...future]); setWorkbook(past[past.length - 1]); setPast(past.slice(0, -1)); } };
  const redo = () => { if (future.length) { setPast([...past, workbook]); setWorkbook(future[0]); setFuture(future.slice(1)); } };

  const insertRow = (idx: number) => {
    const newWb = JSON.parse(JSON.stringify(workbook));
    const sheet = newWb[activeSheetId];
    const newData: SpreadsheetData = {};
    Object.entries(sheet.data as SpreadsheetData).forEach(([coord, cell]) => {
      const pos = coordinateToIndex(coord)!;
      if (pos.row >= idx) {
        newData[indexToCoordinate(pos.row + 1, pos.col)] = cell;
      } else {
        newData[coord] = cell;
      }
    });
    sheet.data = newData;
    pushToHistory(recalculateAll(newWb));
  };

  const deleteRow = (idx: number) => {
    const newWb = JSON.parse(JSON.stringify(workbook));
    const sheet = newWb[activeSheetId];
    const newData: SpreadsheetData = {};
    Object.entries(sheet.data as SpreadsheetData).forEach(([coord, cell]) => {
      const pos = coordinateToIndex(coord)!;
      if (pos.row > idx) {
        newData[indexToCoordinate(pos.row - 1, pos.col)] = cell;
      } else if (pos.row < idx) {
        newData[coord] = cell;
      }
    });
    sheet.data = newData;
    pushToHistory(recalculateAll(newWb));
  };

  const sortRange = (dir: 'asc' | 'desc') => {
    if (!selectionAnchor || !selectionFocus) return;
    const start = coordinateToIndex(selectionAnchor)!;
    const end = coordinateToIndex(selectionFocus)!;
    const minRow = Math.min(start.row, end.row);
    const maxRow = Math.max(start.row, end.row);
    const col = start.col;

    const newWb = JSON.parse(JSON.stringify(workbook));
    const sheet = newWb[activeSheetId];
    
    const rowIndices = Array.from({ length: maxRow - minRow + 1 }, (_, i) => minRow + i);
    rowIndices.sort((a, b) => {
      const valA = sheet.data[indexToCoordinate(a, col)]?.value || '';
      const valB = sheet.data[indexToCoordinate(b, col)]?.value || '';
      return dir === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
    });

    const tempRows: Record<number, Record<string, CellData>> = {};
    rowIndices.forEach((oldIdx, newIdxOffset) => {
      const newRowIdx = minRow + newIdxOffset;
      const rowData: Record<string, CellData> = {};
      for (let c = 0; c < colsCount; c++) {
        const coord = indexToCoordinate(oldIdx, c);
        if (sheet.data[coord]) rowData[coord] = sheet.data[coord];
      }
      tempRows[newRowIdx] = rowData;
    });

    Object.keys(tempRows).forEach(r => {
      const rowIdx = parseInt(r);
      for (let c = 0; c < colsCount; c++) {
        delete sheet.data[indexToCoordinate(rowIdx, c)];
      }
      Object.entries(tempRows[rowIdx]).forEach(([coord, cell]) => {
        const pos = coordinateToIndex(coord)!;
        sheet.data[indexToCoordinate(rowIdx, pos.col)] = cell;
      });
    });

    pushToHistory(recalculateAll(newWb));
  };

  const addChart = (type: ChartType) => {
    if (!selectionAnchor || !selectionFocus) return;
    const range = `${selectionAnchor}:${selectionFocus}`;
    const newWb = JSON.parse(JSON.stringify(workbook));
    const sheet = newWb[activeSheetId];
    const newChart: SpreadsheetChart = {
      id: `chart-${Date.now()}`,
      type,
      range,
      title: `Chart of ${range}`,
      position: { x: 100, y: 100, width: 400, height: 300 }
    };
    sheet.charts = [...(sheet.charts || []), newChart];
    setWorkbook(newWb);
    isDirty.current = true;
  };

  const removeChart = (id: string) => {
    const newWb = JSON.parse(JSON.stringify(workbook));
    const sheet = newWb[activeSheetId];
    sheet.charts = sheet.charts.filter((c: any) => c.id !== id);
    setWorkbook(newWb);
    isDirty.current = true;
  };

  return {
    workbook, setWorkbook, activeSheetId, setActiveSheetId, data,
    selectedCell: selectionAnchor, selectionRange, editingCell, setEditingCell, editingValue, setEditingValue,
    updateCell, handleMouseDown, handleMouseEnter, handleMouseUp, handleKeyDown, onFinishEdit: finishEdit,
    addSheet: () => pushToHistory({ ...workbook, [`sheet-${Date.now()}`]: { id: `sheet-${Date.now()}`, name: `Sheet${Object.keys(workbook).length + 1}`, data: {}, charts: [] } }),
    renameSheet: (id: string, name: string) => { const nwb = { ...workbook }; nwb[id].name = name; setWorkbook(nwb); isDirty.current = true; },
    removeSheet: (id: string) => { if (Object.keys(workbook).length > 1) { const nwb = { ...workbook }; delete nwb[id]; setWorkbook(recalculateAll(nwb)); if (activeSheetId === id) setActiveSheetId(Object.keys(nwb)[0]); isDirty.current = true; } },
    undo, redo, canUndo: past.length > 0, canRedo: future.length > 0, isDirty,
    selectRow: (r: number) => { setSelectionAnchor(indexToCoordinate(r, 0)); setSelectionFocus(indexToCoordinate(r, colsCount - 1)); },
    selectCol: (c: number) => { setSelectionAnchor(indexToCoordinate(0, c)); setSelectionFocus(indexToCoordinate(rowsCount - 1, c)); },
    insertRow, deleteRow, insertCol: (c: number) => {}, deleteCol: (c: number) => {},
    hideRows: (r: number[], h: boolean) => {
      const newWb = { ...workbook };
      const sheet = newWb[activeSheetId];
      const hidden = { ...sheet.hiddenRows };
      r.forEach(idx => hidden[idx] = h);
      newWb[activeSheetId] = { ...sheet, hiddenRows: hidden };
      setWorkbook(newWb);
      isDirty.current = true;
    },
    hideCols: (c: number[], h: boolean) => {
      const newWb = { ...workbook };
      const sheet = newWb[activeSheetId];
      const hidden = { ...sheet.hiddenCols };
      c.forEach(idx => hidden[idx] = h);
      newWb[activeSheetId] = { ...sheet, hiddenCols: hidden };
      setWorkbook(newWb);
      isDirty.current = true;
    },
    setFrozenState: (r?: number, c?: number) => {
      const newWb = { ...workbook };
      const sheet = newWb[activeSheetId];
      if (r !== undefined) sheet.frozenRows = r;
      if (c !== undefined) sheet.frozenCols = c;
      setWorkbook(newWb);
      isDirty.current = true;
    },
    sortRange,
    applyFilter: (col: number, op: any, val: string) => {
      const newWb = { ...workbook };
      const sheet = newWb[activeSheetId];
      const filters = [...(sheet.filters || []), { colIndex: col, operator: op, value: val }];
      
      const filtered: Record<number, boolean> = {};
      for (let r = 0; r < rowsCount; r++) {
        let isFiltered = false;
        filters.forEach(f => {
          const cellVal = sheet.data[indexToCoordinate(r, f.colIndex)]?.value || '';
          if (f.operator === 'contains' && !cellVal.includes(f.value)) isFiltered = true;
          if (f.operator === 'eq' && cellVal !== f.value) isFiltered = true;
        });
        if (isFiltered) filtered[r] = true;
      }

      newWb[activeSheetId] = { ...sheet, filters, filteredRows: filtered };
      setWorkbook(newWb);
      isDirty.current = true;
    },
    clearFilters: () => {
      const newWb = { ...workbook };
      const sheet = newWb[activeSheetId];
      newWb[activeSheetId] = { ...sheet, filters: [], filteredRows: {} };
      setWorkbook(newWb);
      isDirty.current = true;
    },
    addChart,
    removeChart,
    mergeSelection: () => {}, unmergeSelection: () => {}, unhideAll: () => {
      const newWb = { ...workbook };
      const sheet = newWb[activeSheetId];
      newWb[activeSheetId] = { ...sheet, hiddenRows: {}, hiddenCols: {}, filteredRows: {} };
      setWorkbook(newWb);
      isDirty.current = true;
    }
  };
}
