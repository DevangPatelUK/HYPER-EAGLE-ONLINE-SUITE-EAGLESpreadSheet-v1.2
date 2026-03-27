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
  CellData,
  parseRange
} from './formula-engine';

const HISTORY_LIMIT = 50;
const STORAGE_KEY = 'hypreagle_v1_workbook';

interface ClipboardData {
  cells: Record<string, CellData>;
}

export function useSheetStore(rowsCount: number, colsCount: number) {
  const [workbook, setWorkbook] = useState<WorkbookData>({
    'sheet-1': { id: 'sheet-1', name: 'EAGLESpreadSheet', data: {}, rowHeights: {}, colWidths: {}, charts: [], hiddenRows: {}, hiddenCols: {}, frozenRows: 0, frozenCols: 0, isProtected: false }
  });
  const [activeSheetId, setActiveSheetId] = useState('sheet-1');
  const [past, setPast] = useState<WorkbookData[]>([]);
  const [future, setFuture] = useState<WorkbookData[]>([]);
  
  const isDirty = useRef(false);
  const [selectionAnchor, setSelectionAnchor] = useState<string | null>('A1');
  const [selectionFocus, setSelectionFocus] = useState<string | null>('A1');
  const [hoveredCell, setHoveredCell] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  const [isFilling, setIsFilling] = useState(false);
  const [fillAnchor, setFillAnchor] = useState<string | null>(null);
  const [fillFocus, setFillFocus] = useState<string | null>(null);

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
    try {
      return parseRange(`${selectionAnchor}:${selectionFocus}`);
    } catch (e) {
      return [selectionAnchor!];
    }
  }, [selectionAnchor, selectionFocus]);

  const fillRange = useMemo(() => {
    if (!isFilling || !fillAnchor || !fillFocus) return [];
    try {
      return parseRange(`${fillAnchor}:${fillFocus}`);
    } catch (e) {
      return [];
    }
  }, [isFilling, fillAnchor, fillFocus]);

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

  const updateCells = useCallback((coords: string[], updates: Partial<CellData>) => {
    const newWb = JSON.parse(JSON.stringify(workbook));
    const sheet = newWb[activeSheetId];
    coords.forEach(coord => {
      sheet.data[coord] = { ...(sheet.data[coord] || { value: '', formula: '' }), ...updates };
    });
    commitChange(recalculateAll(newWb));
  }, [activeSheetId, workbook, commitChange, recalculateAll]);

  const handleFillEnd = useCallback(() => {
    if (!isFilling || !fillAnchor || !fillFocus) return;

    const sourceRange = selectionRange;
    const targetRange = fillRange;

    // Filter out cells that are already in the source range
    const cellsToFill = targetRange.filter(c => !sourceRange.includes(c));
    if (cellsToFill.length === 0) {
      setIsFilling(false);
      return;
    }

    const newWb = JSON.parse(JSON.stringify(workbook));
    const sheet = newWb[activeSheetId];

    // Identify source boundaries
    const sourceStart = coordinateToIndex(selectionAnchor!)!;
    const sourceEnd = coordinateToIndex(selectionFocus!)!;
    const minRow = Math.min(sourceStart.row, sourceEnd.row);
    const maxRow = Math.max(sourceStart.row, sourceEnd.row);
    const minCol = Math.min(sourceStart.col, sourceEnd.col);
    const maxCol = Math.max(sourceStart.col, sourceEnd.col);

    // For each column in the selection, calculate and apply the fill
    for (let c = minCol; c <= maxCol; c++) {
      const colValues: number[] = [];
      let allNumbers = true;

      for (let r = minRow; r <= maxRow; r++) {
        const val = parseFloat(sheet.data[indexToCoordinate(r, c)]?.value || '');
        if (isNaN(val)) {
          allNumbers = false;
          break;
        }
        colValues.push(val);
      }

      // If source is multiple numbers, detect linear progression
      let step = 0;
      if (allNumbers && colValues.length > 1) {
        const diffs = [];
        for (let i = 1; i < colValues.length; i++) {
          diffs.push(colValues[i] - colValues[i-1]);
        }
        // Check if all differences are the same
        const firstDiff = diffs[0];
        const consistent = diffs.every(d => d === firstDiff);
        if (consistent) step = firstDiff;
        else step = 0; // Fallback to repeating if not linear
      } else if (allNumbers && colValues.length === 1) {
        step = 0; // Repeat the single number
      }

      // Apply fill to target cells in this column
      const targetFocusIdx = coordinateToIndex(fillFocus)!;
      const targetMinRow = Math.min(minRow, targetFocusIdx.row);
      const targetMaxRow = Math.max(maxRow, targetFocusIdx.row);

      for (let r = targetMinRow; r <= targetMaxRow; r++) {
        if (r >= minRow && r <= maxRow) continue; // Skip source range

        const targetCoord = indexToCoordinate(r, c);
        const lastVal = colValues[colValues.length - 1];
        
        if (allNumbers) {
          const offset = r > maxRow ? (r - maxRow) : (r - minRow);
          const newVal = step === 0 ? lastVal : lastVal + (offset * step);
          sheet.data[targetCoord] = { 
            ...(sheet.data[indexToCoordinate(maxRow, c)] || { value: '', formula: '' }),
            value: newVal.toString(), 
            formula: '' 
          };
        } else {
          // Repeating non-numeric content
          const sourceRow = minRow + ((r - targetMinRow) % (maxRow - minRow + 1));
          const sourceCoord = indexToCoordinate(sourceRow, c);
          sheet.data[targetCoord] = JSON.parse(JSON.stringify(sheet.data[sourceCoord] || { value: '', formula: '' }));
        }
      }
    }

    commitChange(recalculateAll(newWb));
    setIsFilling(false);
    setFillAnchor(null);
    setFillFocus(null);
  }, [isFilling, fillAnchor, fillFocus, selectionRange, fillRange, workbook, activeSheetId, selectionAnchor, selectionFocus, commitChange, recalculateAll]);

  const formatAsTable = useCallback(() => {
    if (!selectionAnchor || !selectionFocus) return;
    const start = coordinateToIndex(selectionAnchor)!;
    const end = coordinateToIndex(selectionFocus)!;
    
    const minRow = Math.min(start.row, end.row);
    const maxRow = Math.max(start.row, end.row);
    const minCol = Math.min(start.col, end.col);
    const maxCol = Math.max(start.col, end.col);

    const newWb = JSON.parse(JSON.stringify(workbook));
    const sheet = newWb[activeSheetId];

    for (let r = minRow; r <= maxRow; r++) {
      for (let c = minCol; c <= maxCol; c++) {
        const coord = indexToCoordinate(r, c);
        const cell = sheet.data[coord] || { value: '', formula: '' };
        
        if (r === minRow) {
          // Header Style
          cell.backgroundColor = '#16a34a'; // Emerald 600
          cell.textColor = '#ffffff';
          cell.bold = true;
          cell.align = 'center';
        } else {
          // Zebra Striping
          cell.backgroundColor = (r - minRow) % 2 === 0 ? '#f0fdf4' : ''; 
          cell.textColor = '';
          cell.bold = false;
        }
        sheet.data[coord] = cell;
      }
    }
    commitChange(newWb);
  }, [activeSheetId, workbook, selectionAnchor, selectionFocus, commitChange]);

  const moveSelection = useCallback((key: string, ctrl = false, shift = false) => {
    if (!selectionFocus) return;
    const curr = coordinateToIndex(selectionFocus)!;
    let { row, col } = curr;

    if (key === 'ArrowUp') row = ctrl ? 0 : Math.max(0, row - 1);
    if (key === 'ArrowDown' || key === 'Enter') row = ctrl ? rowsCount - 1 : Math.min(rowsCount - 1, row + 1);
    if (key === 'ArrowLeft') col = ctrl ? 0 : Math.max(0, col - 1);
    if (key === 'ArrowRight' || key === 'Tab') col = ctrl ? colsCount - 1 : Math.min(colsCount - 1, col + 1);

    const next = indexToCoordinate(row, col);
    setHoveredCell(null);

    if (shift) setSelectionFocus(next);
    else { setSelectionAnchor(next); setSelectionFocus(next); }
  }, [selectionFocus, rowsCount, colsCount]);

  const onFinishEdit = (nextKey?: string) => {
    setEditingCell(null);
    setEditingValue(null);
    if (nextKey) moveSelection(nextKey);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (editingCell) return;
    const cmd = e.metaKey || e.ctrlKey;

    if (cmd && e.key === 'c') {
      const cells: Record<string, CellData> = {};
      selectionRange.forEach(c => { if (data[c]) cells[c] = { ...data[c] }; });
      setClipboard({ cells });
      e.preventDefault();
    } else if (cmd && e.key === 'v' && clipboard) {
      if (activeSheet.isProtected) return;
      const target = coordinateToIndex(selectionAnchor!)!;
      const newWb = JSON.parse(JSON.stringify(workbook));
      const sheet = newWb[activeSheetId];
      const coords = Object.keys(clipboard.cells).sort();
      if (coords.length > 0) {
        const sourceAnchor = coordinateToIndex(coords[0])!;
        Object.entries(clipboard.cells).forEach(([coord, cell]) => {
          const sIdx = coordinateToIndex(coord)!;
          const tRow = target.row + (sIdx.row - sourceAnchor.row);
          const tCol = target.col + (sIdx.col - sourceAnchor.col);
          if (tRow < rowsCount && tCol < colsCount) {
            sheet.data[indexToCoordinate(tRow, tCol)] = { ...cell };
          }
        });
        commitChange(recalculateAll(newWb));
      }
      e.preventDefault();
    } else if (cmd && e.key === 't') {
      if (!activeSheet.isProtected) {
        formatAsTable();
      }
      e.preventDefault();
    } else if (e.key === 'Backspace' || e.key === 'Delete') {
      if (activeSheet.isProtected) return;
      const newWb = JSON.parse(JSON.stringify(workbook));
      selectionRange.forEach(c => { 
        if (newWb[activeSheetId].data[c]) {
          newWb[activeSheetId].data[c] = { ...newWb[activeSheetId].data[c], value: '', formula: '' }; 
        }
      });
      commitChange(recalculateAll(newWb));
      e.preventDefault();
    } else if (cmd && e.key === 'z') { 
      if (e.shiftKey) { 
        if (future.length) { setPast([...past, workbook]); setWorkbook(future[0]); setFuture(future.slice(1)); } 
      } else { 
        if (past.length) { setFuture([workbook, ...future]); setWorkbook(past[past.length - 1]); setPast(past.slice(0, -1)); } 
      } 
      e.preventDefault(); 
    } else if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab', 'Enter'].includes(e.key)) { 
      moveSelection(e.key, cmd, e.shiftKey); 
      e.preventDefault(); 
    } else if (e.key.length === 1 && !cmd && !e.altKey) { 
      if (activeSheet.isProtected) return;
      const targetCell = hoveredCell || selectionAnchor;
      if (targetCell) {
        setEditingCell(targetCell); 
        setEditingValue(e.key);
        setSelectionAnchor(targetCell);
        setSelectionFocus(targetCell);
      }
      e.preventDefault(); 
    }
  };

  return {
    workbook, setWorkbook, activeSheetId, setActiveSheetId, activeSheet, data,
    selectedCell: selectionAnchor, selectionRange, editingCell, setEditingCell, editingValue, setEditingValue,
    hoveredCell, setHoveredCell,
    isFilling, fillRange,
    handleFillStart: (coord: string) => {
      setIsFilling(true);
      setFillAnchor(coord);
      setFillFocus(coord);
    },
    updateCell, updateCells, formatAsTable, handleKeyDown, onFinishEdit, moveSelection, isDirty,
    handleMouseDown: (c: string, shift: boolean) => { 
      if (shift) setSelectionFocus(c); 
      else { setSelectionAnchor(c); setSelectionFocus(c); setEditingCell(null); } 
      setIsDragging(true); 
    },
    handleMouseEnter: (c: string) => { 
      setHoveredCell(c);
      if (isDragging) setSelectionFocus(c); 
      if (isFilling) setFillFocus(c);
    },
    handleMouseUp: () => {
      if (isDragging) setIsDragging(false);
      if (isFilling) handleFillEnd();
    },
    addSheet: () => { 
      const id = `sheet-${Date.now()}`; 
      commitChange({ ...workbook, [id]: { id, name: `EagleSheet${Object.keys(workbook).length + 1}`, data: {}, rowHeights: {}, colWidths: {}, charts: [], hiddenRows: {}, hiddenCols: {}, frozenRows: 0, frozenCols: 0, isProtected: false } }); 
      setActiveSheetId(id); 
    },
    renameSheet: (id: string, name: string) => { 
      const n = JSON.parse(JSON.stringify(workbook)); 
      n[id].name = name; 
      commitChange(n);
    },
    removeSheet: (id: string) => { 
      if (Object.keys(workbook).length > 1) { 
        const n = { ...workbook }; 
        delete n[id]; 
        commitChange(recalculateAll(n)); 
        setActiveSheetId(Object.keys(n)[0]); 
      } 
    },
    updateRowHeight: (r: number, h: number) => { 
      const n = { ...workbook }; 
      n[activeSheetId].rowHeights = { ...n[activeSheetId].rowHeights, [r]: h }; 
      setWorkbook(n); 
      isDirty.current = true; 
    },
    updateColWidth: (c: number, w: number) => { 
      const n = { ...workbook }; 
      n[activeSheetId].colWidths = { ...n[activeSheetId].colWidths, [c]: w }; 
      setWorkbook(n); 
      isDirty.current = true; 
    },
    autoUpdateColWidth: (c: number) => {
      const sheet = workbook[activeSheetId];
      let maxChars = 0;
      Object.keys(sheet.data).forEach(coord => {
        const idx = coordinateToIndex(coord);
        if (idx && idx.col === c) {
          const val = sheet.data[coord].value || '';
          maxChars = Math.max(maxChars, val.length);
        }
      });
      const newWidth = Math.max(120, (maxChars * 8) + 24);
      const n = JSON.parse(JSON.stringify(workbook));
      n[activeSheetId].colWidths = { ...(n[activeSheetId].colWidths || {}), [c]: newWidth };
      commitChange(n);
    },
    autoUpdateRowHeight: (r: number) => {
      const sheet = workbook[activeSheetId];
      let maxLines = 1;
      Object.keys(sheet.data).forEach(coord => {
        const idx = coordinateToIndex(coord);
        if (idx && idx.row === r) {
          const cell = sheet.data[coord];
          if (cell.wrapText) {
            const val = cell.value || '';
            const colWidth = (sheet.colWidths && sheet.colWidths[idx.col]) || 120;
            const charsPerLine = Math.floor(colWidth / 8);
            maxLines = Math.max(maxLines, Math.ceil(val.length / charsPerLine));
          }
        }
      });
      const newHeight = Math.max(32, (maxLines * 20) + 8);
      const n = JSON.parse(JSON.stringify(workbook));
      n[activeSheetId].rowHeights = { ...(n[activeSheetId].rowHeights || {}), [r]: newHeight };
      commitChange(n);
    },
    insertRow: () => {
      if (!selectionAnchor) return;
      const { row } = coordinateToIndex(selectionAnchor)!;
      const newWb = JSON.parse(JSON.stringify(workbook));
      const sheet = newWb[activeSheetId];
      
      const newData: SpreadsheetData = {};
      Object.entries(sheet.data).forEach(([coord, cell]) => {
        const idx = coordinateToIndex(coord)!;
        if (idx.row >= row) newData[indexToCoordinate(idx.row + 1, idx.col)] = cell;
        else newData[coord] = cell;
      });
      sheet.data = newData;

      const newRowHeights: Record<number, number> = {};
      Object.entries(sheet.rowHeights || {}).forEach(([r, h]) => {
        const ri = parseInt(r);
        if (ri >= row) newRowHeights[ri + 1] = h as number;
        else newRowHeights[ri] = h as number;
      });
      sheet.rowHeights = newRowHeights;
      commitChange(recalculateAll(newWb));
    },
    deleteRow: () => {
      if (!selectionAnchor) return;
      const { row } = coordinateToIndex(selectionAnchor)!;
      const newWb = JSON.parse(JSON.stringify(workbook));
      const sheet = newWb[activeSheetId];

      const newData: SpreadsheetData = {};
      Object.entries(sheet.data).forEach(([coord, cell]) => {
        const idx = coordinateToIndex(coord)!;
        if (idx.row === row) return;
        if (idx.row > row) newData[indexToCoordinate(idx.row - 1, idx.col)] = cell;
        else newData[coord] = cell;
      });
      sheet.data = newData;

      const newRowHeights: Record<number, number> = {};
      Object.entries(sheet.rowHeights || {}).forEach(([r, h]) => {
        const ri = parseInt(r);
        if (ri === row) return;
        if (ri > row) newRowHeights[ri - 1] = h as number;
        else newRowHeights[ri] = h as number;
      });
      sheet.rowHeights = newRowHeights;

      commitChange(recalculateAll(newWb));
    },
    insertCol: () => {
      if (!selectionAnchor) return;
      const { col } = coordinateToIndex(selectionAnchor)!;
      const newWb = JSON.parse(JSON.stringify(workbook));
      const sheet = newWb[activeSheetId];
      
      const newData: SpreadsheetData = {};
      Object.entries(sheet.data).forEach(([coord, cell]) => {
        const idx = coordinateToIndex(coord)!;
        if (idx.col >= col) newData[indexToCoordinate(idx.row, idx.col + 1)] = cell;
        else newData[coord] = cell;
      });
      sheet.data = newData;
      commitChange(recalculateAll(newWb));
    },
    deleteCol: () => {
      if (!selectionAnchor) return;
      const { col } = coordinateToIndex(selectionAnchor)!;
      const newWb = JSON.parse(JSON.stringify(workbook));
      const sheet = newWb[activeSheetId];

      const newData: SpreadsheetData = {};
      Object.entries(sheet.data).forEach(([coord, cell]) => {
        const idx = coordinateToIndex(coord)!;
        if (idx.col === col) return;
        if (idx.col > col) newData[indexToCoordinate(idx.row, idx.col - 1)] = cell;
        else newData[coord] = cell;
      });
      sheet.data = newData;
      commitChange(recalculateAll(newWb));
    },
    freezeRows: (n: number) => {
      const next = JSON.parse(JSON.stringify(workbook));
      next[activeSheetId].frozenRows = n;
      commitChange(next);
    },
    freezeCols: (n: number) => {
      const next = JSON.parse(JSON.stringify(workbook));
      next[activeSheetId].frozenCols = n;
      commitChange(next);
    },
    hideRows: () => {
      const next = JSON.parse(JSON.stringify(workbook));
      const sheet = next[activeSheetId];
      selectionRange.forEach(c => {
        const idx = coordinateToIndex(c);
        if (idx) sheet.hiddenRows = { ...sheet.hiddenRows, [idx.row]: true };
      });
      commitChange(next);
    },
    hideCols: () => {
      const next = JSON.parse(JSON.stringify(workbook));
      const sheet = next[activeSheetId];
      selectionRange.forEach(c => {
        const idx = coordinateToIndex(c);
        if (idx) sheet.hiddenCols = { ...sheet.hiddenCols, [idx.col]: true };
      });
      commitChange(next);
    },
    unhideAll: () => {
      const next = JSON.parse(JSON.stringify(workbook));
      next[activeSheetId].hiddenRows = {};
      next[activeSheetId].hiddenCols = {};
      commitChange(next);
    },
    toggleProtectSheet: () => {
      const next = JSON.parse(JSON.stringify(workbook));
      next[activeSheetId].isProtected = !next[activeSheetId].isProtected;
      commitChange(next);
    },
    sortRange: (dir: 'asc' | 'desc') => {
      if (!selectionAnchor || !selectionFocus) return;
      const next = JSON.parse(JSON.stringify(workbook));
      const sheet = next[activeSheetId];
      
      const start = coordinateToIndex(selectionAnchor)!;
      const end = coordinateToIndex(selectionFocus)!;
      const minRow = Math.min(start.row, end.row);
      const maxRow = Math.max(start.row, end.row);
      const minCol = Math.min(start.col, end.col);
      const maxCol = Math.max(start.col, end.col);

      const rowsToSort: { index: number; data: Record<string, CellData>; sortValue: string }[] = [];
      for (let r = minRow; r <= maxRow; r++) {
        const rowData: Record<string, CellData> = {};
        for (let c = minCol; c <= maxCol; c++) {
          const coord = indexToCoordinate(r, c);
          rowData[coord] = sheet.data[coord] || { value: '', formula: '' };
        }
        const firstColValue = rowData[indexToCoordinate(r, minCol)]?.value || '';
        rowsToSort.push({ index: r, data: rowData, sortValue: firstColValue });
      }

      rowsToSort.sort((a, b) => {
        const va = a.sortValue, vb = b.sortValue;
        const res = va.localeCompare(vb, undefined, { numeric: true });
        return dir === 'asc' ? res : -res;
      });

      rowsToSort.forEach((rowObj, sortedIdx) => {
        const targetRow = minRow + sortedIdx;
        for (let c = minCol; c <= maxCol; c++) {
          const targetCoord = indexToCoordinate(targetRow, c);
          sheet.data[targetCoord] = rowObj.data[indexToCoordinate(rowObj.index, c)];
        }
      });

      commitChange(recalculateAll(next));
    },
    mergeCells: () => {
      if (selectionRange.length < 2) return;
      const next = JSON.parse(JSON.stringify(workbook));
      const sheet = next[activeSheetId];
      const anchorCoord = selectionAnchor!;
      
      const start = coordinateToIndex(selectionAnchor!)!;
      const end = coordinateToIndex(selectionFocus!)!;
      const rowSpan = Math.abs(end.row - start.row) + 1;
      const colSpan = Math.abs(end.col - start.col) + 1;

      selectionRange.forEach(c => {
        if (c === anchorCoord) {
          sheet.data[c] = { ...(sheet.data[c] || { value: '', formula: '' }), rowSpan, colSpan };
        } else {
          sheet.data[c] = { ...(sheet.data[c] || { value: '', formula: '' }), hiddenByMerge: anchorCoord };
        }
      });
      commitChange(next);
    },
    unmergeCells: () => {
      const next = JSON.parse(JSON.stringify(workbook));
      const sheet = next[activeSheetId];
      selectionRange.forEach(c => {
        const cell = sheet.data[c];
        if (cell?.rowSpan || cell?.colSpan) {
          delete cell.rowSpan;
          delete cell.colSpan;
        }
        if (cell?.hiddenByMerge) {
          delete cell.hiddenByMerge;
        }
      });
      commitChange(next);
    },
    addChart: (type: ChartType) => { 
      const range = `${selectionAnchor}:${selectionFocus}`; 
      const n = JSON.parse(JSON.stringify(workbook)); 
      n[activeSheetId].charts.push({ 
        id: `ch-${Date.now()}`, 
        type, 
        range, 
        title: `Eagle Insight ${range}`, 
        position: { x: 100, y: 100, width: 400, height: 300 } 
      }); 
      commitChange(n);
    },
    removeChart: (id: string) => { 
      const n = JSON.parse(JSON.stringify(workbook)); 
      n[activeSheetId].charts = n[activeSheetId].charts.filter((c: any) => c.id !== id); 
      commitChange(n);
    },
    undo: () => { if (past.length) { setFuture([workbook, ...future]); setWorkbook(past[past.length - 1]); setPast(past.slice(0, -1)); } },
    redo: () => { if (future.length) { setPast([...past, workbook]); setWorkbook(future[0]); setFuture(future.slice(1)); } },
    canUndo: past.length > 0, 
    canRedo: future.length > 0
  };
}