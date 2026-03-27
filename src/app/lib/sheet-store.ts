'use client';

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { 
  SpreadsheetData, 
  evaluateFormula, 
  indexToCoordinate, 
  coordinateToIndex, 
  Sheet, 
  WorkbookData,
  ChartType,
  SpreadsheetChart,
  CellData,
  parseRange
} from './formula-engine';

const HISTORY_LIMIT = 50;
const STORAGE_KEY = 'hypreagle_v1_workbook';

interface ClipboardData {
  cells: Record<string, CellData>;
  rowCount: number;
  colCount: number;
}

export function useSheetStore(rowsCount: number, colsCount: number) {
  const [workbook, setWorkbook] = useState<WorkbookData>({
    'sheet-1': { id: 'sheet-1', name: 'EAGLESpreadSheet', data: {}, rowHeights: {}, colWidths: {}, charts: [] }
  });
  const [activeSheetId, setActiveSheetId] = useState('sheet-1');
  const [past, setPast] = useState<WorkbookData[]>([]);
  const [future, setFuture] = useState<WorkbookData[]>([]);
  
  const isDirty = useRef(false);
  const [selectionAnchor, setSelectionAnchor] = useState<string | null>('A1');
  const [selectionFocus, setSelectionFocus] = useState<string | null>('A1');
  const [isDragging, setIsDragging] = useState(false);
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState<string | null>(null);
  const [clipboard, setClipboard] = useState<ClipboardData | null>(null);

  const activeSheet = workbook[activeSheetId] || Object.values(workbook)[0];
  const data = activeSheet.data;

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setWorkbook(parsed);
        setActiveSheetId(Object.keys(parsed)[0]);
      } catch (e) {}
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(workbook));
  }, [workbook]);

  const selectionRange = useMemo(() => {
    if (!selectionAnchor || !selectionFocus) return [];
    return parseRange(`${selectionAnchor}:${selectionFocus}`);
  }, [selectionAnchor, selectionFocus]);

  const recalculateAll = useCallback((wb: WorkbookData) => {
    const next = JSON.parse(JSON.stringify(wb));
    Object.keys(next).forEach(sid => {
      const sheet = next[sid];
      Object.keys(sheet.data).forEach(coord => {
        const cell = sheet.data[coord];
        if (cell.formula?.startsWith('=')) {
          cell.value = evaluateFormula(coord, cell.formula, next, sid);
        }
      });
    });
    return next;
  }, []);

  const commitChange = useCallback((newWb: WorkbookData) => {
    setPast(prev => [...prev, workbook].slice(-HISTORY_LIMIT));
    setFuture([]);
    setWorkbook(newWb);
    isDirty.current = true;
  }, [workbook]);

  const updateCell = useCallback((coord: string, updates: Partial<CellData>) => {
    const newWb = JSON.parse(JSON.stringify(workbook));
    const sheet = newWb[activeSheetId];
    sheet.data[coord] = { ...(sheet.data[coord] || { value: '', formula: '' }), ...updates };
    commitChange(recalculateAll(newWb));
  }, [activeSheetId, workbook, commitChange, recalculateAll]);

  const moveSelection = useCallback((key: string, ctrl = false, shift = false) => {
    if (!selectionFocus) return;
    const curr = coordinateToIndex(selectionFocus)!;
    let { row, col } = curr;

    if (key === 'ArrowUp') row = ctrl ? 0 : Math.max(0, row - 1);
    if (key === 'ArrowDown' || key === 'Enter') row = ctrl ? rowsCount - 1 : Math.min(rowsCount - 1, row + 1);
    if (key === 'ArrowLeft') col = ctrl ? 0 : Math.max(0, col - 1);
    if (key === 'ArrowRight' || key === 'Tab') col = ctrl ? colsCount - 1 : Math.min(colsCount - 1, col + 1);

    const next = indexToCoordinate(row, col);
    if (shift) setSelectionFocus(next);
    else { setSelectionAnchor(next); setSelectionFocus(next); }
  }, [selectionFocus, rowsCount, colsCount]);

  const onFinishEdit = (nextKey?: string) => {
    setEditingCell(null);
    setEditingValue(null);
    if (nextKey) setTimeout(() => moveSelection(nextKey), 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (editingCell) return;
    const cmd = e.metaKey || e.ctrlKey;

    if (cmd && e.key === 'c') {
      const cells: Record<string, CellData> = {};
      selectionRange.forEach(c => { if (data[c]) cells[c] = data[c]; });
      setClipboard({ cells, rowCount: 1, colCount: 1 });
      e.preventDefault();
    } else if (cmd && e.key === 'v' && clipboard) {
      const target = coordinateToIndex(selectionAnchor!)!;
      const newWb = JSON.parse(JSON.stringify(workbook));
      const sheet = newWb[activeSheetId];
      const sourceAnchor = coordinateToIndex(Object.keys(clipboard.cells).sort()[0] || 'A1')!;
      
      Object.entries(clipboard.cells).forEach(([coord, cell]) => {
        const sIdx = coordinateToIndex(coord)!;
        const tRow = target.row + (sIdx.row - sourceAnchor.row);
        const tCol = target.col + (sIdx.col - sourceAnchor.col);
        if (tRow < rowsCount && tCol < colsCount) {
          sheet.data[indexToCoordinate(tRow, tCol)] = { ...cell };
        }
      });
      commitChange(recalculateAll(newWb));
      e.preventDefault();
    } else if (e.key === 'Backspace' || e.key === 'Delete') {
      const newWb = JSON.parse(JSON.stringify(workbook));
      selectionRange.forEach(c => { if (newWb[activeSheetId].data[c]) newWb[activeSheetId].data[c] = { ...newWb[activeSheetId].data[c], value: '', formula: '' }; });
      commitChange(recalculateAll(newWb));
      e.preventDefault();
    } else if (cmd && e.key === 'z') { if (e.shiftKey) { if (future.length) { setPast([...past, workbook]); setWorkbook(future[0]); setFuture(future.slice(1)); } } else { if (past.length) { setFuture([workbook, ...future]); setWorkbook(past[past.length - 1]); setPast(past.slice(0, -1)); } } e.preventDefault(); }
    else if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab', 'Enter'].includes(e.key)) { moveSelection(e.key, cmd, e.shiftKey); e.preventDefault(); }
    else if (e.key.length === 1 && !cmd && !e.altKey) { setEditingCell(selectionAnchor); setEditingValue(e.key); e.preventDefault(); }
  };

  return {
    workbook, setWorkbook, activeSheetId, setActiveSheetId, activeSheet, data,
    selectedCell: selectionAnchor, selectionRange, editingCell, setEditingCell, editingValue, setEditingValue,
    updateCell, handleKeyDown, onFinishEdit, moveSelection, isDirty,
    handleMouseDown: (c: string, shift: boolean) => { if (shift) setSelectionFocus(c); else { setSelectionAnchor(c); setSelectionFocus(c); setEditingCell(null); } setIsDragging(true); },
    handleMouseEnter: (c: string) => { if (isDragging) setSelectionFocus(c); },
    handleMouseUp: () => setIsDragging(false),
    addSheet: () => { const id = `sheet-${Date.now()}`; commitChange({ ...workbook, [id]: { id, name: `EagleSheet${Object.keys(workbook).length + 1}`, data: {}, rowHeights: {}, colWidths: {}, charts: [] } }); setActiveSheetId(id); },
    renameSheet: (id: string, name: string) => { const n = { ...workbook }; n[id].name = name; setWorkbook(n); isDirty.current = true; },
    removeSheet: (id: string) => { if (Object.keys(workbook).length > 1) { const n = { ...workbook }; delete n[id]; setWorkbook(recalculateAll(n)); setActiveSheetId(Object.keys(n)[0]); isDirty.current = true; } },
    updateRowHeight: (r: number, h: number) => { const n = { ...workbook }; n[activeSheetId].rowHeights = { ...n[activeSheetId].rowHeights, [r]: h }; setWorkbook(n); isDirty.current = true; },
    updateColWidth: (c: number, w: number) => { const n = { ...workbook }; n[activeSheetId].colWidths = { ...n[activeSheetId].colWidths, [c]: w }; setWorkbook(n); isDirty.current = true; },
    addChart: (type: ChartType) => { const range = `${selectionAnchor}:${selectionFocus}`; const n = JSON.parse(JSON.stringify(workbook)); n[activeSheetId].charts.push({ id: `ch-${Date.now()}`, type, range, title: `Eagle Insight ${range}`, position: { x: 100, y: 100, width: 400, height: 300 } }); setWorkbook(n); isDirty.current = true; },
    removeChart: (id: string) => { const n = JSON.parse(JSON.stringify(workbook)); n[activeSheetId].charts = n[activeSheetId].charts.filter((c: any) => c.id !== id); setWorkbook(n); isDirty.current = true; },
    undo: () => { if (past.length) { setFuture([workbook, ...future]); setWorkbook(past[past.length - 1]); setPast(past.slice(0, -1)); } },
    redo: () => { if (future.length) { setPast([...past, workbook]); setWorkbook(future[0]); setFuture(future.slice(1)); } },
    canUndo: past.length > 0, canRedo: future.length > 0
  };
}