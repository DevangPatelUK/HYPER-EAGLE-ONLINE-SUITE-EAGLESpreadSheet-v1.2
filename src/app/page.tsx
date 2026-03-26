'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Toolbar } from './components/spreadsheet/Toolbar';
import { FormulaBar } from './components/spreadsheet/FormulaBar';
import { Grid } from './components/spreadsheet/Grid';
import { AIAssistant } from './components/spreadsheet/AIAssistant';
import { useSheetStore } from './lib/sheet-store';
import { evaluateFormula, coordinateToIndex } from './lib/formula-engine';
import { toast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';

export default function SpreadsheetPage() {
  const rows = 50;
  const cols = 26;
  const {
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
  } = useSheetStore(rows, cols);

  const [aiOpen, setAiOpen] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('sheet-flow-current');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setData(parsed.data || {});
        setSheetName(parsed.name || 'Untitled Sheet');
      } catch (e) {
        console.error('Failed to load saved sheet');
      }
    }
  }, [setData, setSheetName]);

  const handleSave = () => {
    localStorage.setItem('sheet-flow-current', JSON.stringify({ data, name: sheetName }));
    toast({ title: 'Saved', description: 'Sheet saved successfully.' });
  };

  const handleNew = () => {
    if (confirm('Create a new sheet? Current changes will be lost.')) {
      setData({});
      setSheetName('Untitled Sheet');
      localStorage.removeItem('sheet-flow-current');
    }
  };

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this sheet?')) {
      setData({});
      setSheetName('Untitled Sheet');
      localStorage.removeItem('sheet-flow-current');
      toast({ title: 'Deleted', description: 'Sheet data cleared.', variant: 'destructive' });
    }
  };

  const handleFormatBold = () => {
    selectionRange.forEach(coord => {
      const current = data[coord] || { value: '', formula: '' };
      updateCell(coord, { bold: !current.bold });
    });
  };

  const handleAlign = (align: 'left' | 'center' | 'right') => {
    selectionRange.forEach(coord => {
      updateCell(coord, { align });
    });
  };

  const handleFormatType = (format: 'number' | 'currency' | 'percent' | 'text') => {
    selectionRange.forEach(coord => {
      updateCell(coord, { format });
    });
  };

  const handleBgColor = (backgroundColor: string) => {
    selectionRange.forEach(coord => {
      updateCell(coord, { backgroundColor });
    });
  };

  const handleUpdate = (coord: string, val: string) => {
    if (val.startsWith('=')) {
      updateCell(coord, { formula: val, value: evaluateFormula(coord, val, data) });
    } else {
      updateCell(coord, { value: val, formula: '' });
    }
  };

  const handleFinishEdit = (nextKey?: string) => {
    setEditingCell(null);
    setEditingValue(null);
    
    if (nextKey === 'Enter') {
      moveSelection('down');
    } else if (nextKey === 'Tab') {
      moveSelection('right');
    }
  };

  const handleApplyFormula = (formula: string) => {
    if (selectedCell) {
      handleUpdate(selectedCell, formula);
      setAiOpen(false);
      toast({ title: 'Applied', description: 'Formula applied to cell.' });
    }
  };

  const selectedRangeData = useMemo(() => {
    if (selectionRange.length === 0) return [];
    
    const indices = selectionRange.map(c => coordinateToIndex(c)).filter(Boolean) as {row: number, col: number}[];
    if (indices.length === 0) return [];

    const minRow = Math.min(...indices.map(i => i.row));
    const maxRow = Math.max(...indices.map(i => i.row));
    const minCol = Math.min(...indices.map(i => i.col));
    const maxCol = Math.max(...indices.map(i => i.col));

    const grid: string[][] = [];
    for (let r = minRow; r <= maxRow; r++) {
      const rowArr: string[] = [];
      for (let c = minCol; c <= maxCol; c++) {
        const matchingIndex = indices.find(i => i.row === r && i.col === c);
        if (matchingIndex) {
          const coord = selectionRange.find(src => {
            const sIdx = coordinateToIndex(src);
            return sIdx?.row === r && sIdx?.col === c;
          }) || '';
          rowArr.push(data[coord]?.value || '');
        } else {
          rowArr.push('');
        }
      }
      grid.push(rowArr);
    }
    return grid;
  }, [selectionRange, data]);

  const selectedRangeString = useMemo(() => {
    if (selectionRange.length <= 1) return selectionRange[0] || null;
    return `${selectionRange[0]}:${selectionRange[selectionRange.length - 1]}`;
  }, [selectionRange]);

  return (
    <div 
      className="flex flex-col h-screen overflow-hidden bg-background outline-none"
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      <Toolbar
        sheetName={sheetName}
        onNameChange={setSheetName}
        onBold={handleFormatBold}
        onAlign={handleAlign}
        onFormat={handleFormatType}
        onBgColor={handleBgColor}
        onNew={handleNew}
        onSave={handleSave}
        onDelete={handleDelete}
        onAI={() => setAiOpen(true)}
      />
      
      <FormulaBar
        selectedCoord={selectedCell}
        formula={selectedCell ? (data[selectedCell]?.formula || data[selectedCell]?.value || '') : ''}
        onChange={(val) => selectedCell && handleUpdate(selectedCell, val)}
      />

      <div className="flex-1 overflow-hidden flex flex-col relative border-t border-border">
        <Grid
          rows={rows}
          cols={cols}
          data={data}
          selectedCell={selectedCell}
          selectionRange={selectionRange}
          editingCell={editingCell}
          editingValue={editingValue}
          onMouseDown={handleMouseDown}
          onMouseEnter={handleMouseEnter}
          onMouseUp={handleMouseUp}
          onDoubleClick={handleCellDoubleClick}
          onUpdate={handleUpdate}
          onFinishEdit={handleFinishEdit}
          onSelectRow={selectRow}
          onSelectCol={selectCol}
        />
      </div>

      <AIAssistant
        open={aiOpen}
        onOpenChange={setAiOpen}
        selectedRange={selectedRangeString}
        selectedRangeData={selectedRangeData}
        onApplyFormula={handleApplyFormula}
      />
      
      <Toaster />

      <div className="h-6 bg-primary text-[10px] text-white flex items-center px-4 justify-between uppercase tracking-widest font-bold">
        <span>SheetFlow v1.0</span>
        <span>{selectionRange.length > 1 ? `${selectionRange.length} cells selected` : 'Ready'}</span>
      </div>
    </div>
  );
}
