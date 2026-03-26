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
  CellData
} from './formula-engine';

const HISTORY_LIMIT = 30;
const STORAGE_KEY_WORKBOOK = 'sheetflow_current_workbook';

interface ClipboardData {
  rows: number;
  cols: number;
  cells: Record<string, CellData>;
}

export function useSheetStore(rows: number, cols: number) {
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

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const savedWorkbook = localStorage.getItem(STORAGE_KEY_WORKBOOK);
    if (savedWorkbook) {
      try { 
        const parsed = JSON.parse(savedWorkbook);
        setWorkbook(parsed);
        const firstId = Object.keys(parsed)[0];
        if (firstId) setActiveSheetId(firstId);
      } catch (e) { console.error('Recovery failed:', e); }
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEY_WORKBOOK, JSON.stringify(workbook));
  }, [workbook]);

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
    if (cmdKey && e.key.toLowerCase() === 'z') { e.shiftKey ? redo() : undo(); e.preventDefault(); return; }
    if (!selectionAnchor) return;
    const currentFocus = selectionFocus || selectionAnchor;
    const current = coordinateToIndex(currentFocus)!;
    let { row, col } = current;

    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab', 'Enter'].includes(e.key)) {
      if (e.key === 'ArrowUp') row = Math.max(0, row - 1);
      if (e.key === 'ArrowDown' || e.key === 'Enter') row = Math.min(rows - 1, row + 1);
      if (e.key === 'ArrowLeft') col = Math.max(0, col - 1);
      if (e.key === 'ArrowRight' || e.key === 'Tab') col = Math.min(cols - 1, col + 1);
      const next = indexToCoordinate(row, col);
      if (e.shiftKey) setSelectionFocus(next); else { setSelectionAnchor(next); setSelectionFocus(next); }
      e.preventDefault();
    } else if (e.key.length === 1 && !cmdKey && !e.altKey) {
      setEditingCell(selectionAnchor);
      setEditingValue(e.key);
      e.preventDefault();
    }
  };

  const undo = () => { if (past.length) { setFuture([workbook, ...future]); setWorkbook(past[past.length - 1]); setPast(past.slice(0, -1)); } };
  const redo = () => { if (future.length) { setPast([...past, workbook]); setWorkbook(future[0]); setFuture(future.slice(1)); } };

  return {
    workbook, setWorkbook, activeSheetId, setActiveSheetId, data,
    selectedCell: selectionAnchor, selectionRange, editingCell, setEditingCell, editingValue, setEditingValue,
    updateCell, handleMouseDown, handleMouseEnter, handleMouseUp, handleKeyDown,
    addSheet: () => pushToHistory({ ...workbook, [`sheet-${Date.now()}`]: { id: `sheet-${Date.now()}`, name: `Sheet${Object.keys(workbook).length + 1}`, data: {}, charts: [] } }),
    renameSheet: (id: string, name: string) => { const nwb = { ...workbook }; nwb[id].name = name; setWorkbook(nwb); isDirty.current = true; },
    removeSheet: (id: string) => { if (Object.keys(workbook).length > 1) { const nwb = { ...workbook }; delete nwb[id]; setWorkbook(recalculateAll(nwb)); if (activeSheetId === id) setActiveSheetId(Object.keys(nwb)[0]); isDirty.current = true; } },
    undo, redo, canUndo: past.length > 0, canRedo: future.length > 0, isDirty,
    selectRow: (r: number) => { setSelectionAnchor(indexToCoordinate(r, 0)); setSelectionFocus(indexToCoordinate(r, cols - 1)); },
    selectCol: (c: number) => { setSelectionAnchor(indexToCoordinate(0, c)); setSelectionFocus(indexToCoordinate(rows - 1, c)); },
    mergeSelection: () => {}, // Simplified for refinement
    unmergeSelection: () => {},
    insertRow: (r: number) => {},
    deleteRow: (r: number) => {},
    insertCol: (c: number) => {},
    deleteCol: (c: number) => {},
    hideRows: (r: number[], h: boolean) => {},
    hideCols: (c: number[], h: boolean) => {},
    setFrozenState: (r?: number, c?: number) => {},
    sortRange: (d: 'asc' | 'desc') => {},
    applyFilter: (c: number, o: any, v: string) => {},
    clearFilters: () => {},
    addChart: (t: ChartType) => {},
    removeChart: (id: string) => {},
  };
}
