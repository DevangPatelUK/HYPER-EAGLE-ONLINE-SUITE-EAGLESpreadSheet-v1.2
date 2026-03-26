'use client';

import React, { useState, useEffect } from 'react';
import { Toolbar } from './components/spreadsheet/Toolbar';
import { FormulaBar } from './components/spreadsheet/FormulaBar';
import { Grid } from './components/spreadsheet/Grid';
import { AIAssistant } from './components/spreadsheet/AIAssistant';
import { useSheetStore } from './lib/sheet-store';
import { evaluateFormula } from './lib/formula-engine';
import { toast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';

export default function SpreadsheetPage() {
  const rows = 50;
  const cols = 26;
  const {
    data,
    setData,
    selectedCell,
    setSelectedCell,
    editingCell,
    setEditingCell,
    updateCell,
    handleCellSelect,
    handleCellDoubleClick,
    handleKeyDown,
    sheetName,
    setSheetName,
  } = useSheetStore();

  const [aiOpen, setAiOpen] = useState(false);

  // Persistence: Auto-save to localStorage
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
    if (selectedCell) {
      const current = data[selectedCell] || { value: '', formula: '' };
      updateCell(selectedCell, { bold: !current.bold });
    }
  };

  const handleAlign = (align: 'left' | 'center' | 'right') => {
    if (selectedCell) {
      updateCell(selectedCell, { align });
    }
  };

  const handleUpdate = (coord: string, val: string) => {
    if (val.startsWith('=')) {
      updateCell(coord, { formula: val, value: evaluateFormula(val, data) });
    } else {
      updateCell(coord, { value: val, formula: '' });
    }
  };

  const handleApplyFormula = (formula: string) => {
    if (selectedCell) {
      handleUpdate(selectedCell, formula);
      setAiOpen(false);
      toast({ title: 'Applied', description: 'Formula applied to cell.' });
    }
  };

  return (
    <div 
      className="flex flex-col h-screen overflow-hidden bg-background"
      onKeyDown={(e) => handleKeyDown(e, rows, cols)}
      tabIndex={0}
    >
      <Toolbar
        sheetName={sheetName}
        onNameChange={setSheetName}
        onBold={handleFormatBold}
        onAlign={handleAlign}
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
          editingCell={editingCell}
          onSelect={handleCellSelect}
          onDoubleClick={handleCellDoubleClick}
          onUpdate={handleUpdate}
          onFinishEdit={() => setEditingCell(null)}
        />
      </div>

      <AIAssistant
        open={aiOpen}
        onOpenChange={setAiOpen}
        selectedRange={selectedCell}
        selectedRangeData={[]} // In a fuller implementation, capture a range. For now, empty or single cell.
        onApplyFormula={handleApplyFormula}
      />
      
      <Toaster />

      {/* Footer Info */}
      <div className="h-6 bg-primary text-[10px] text-white flex items-center px-4 justify-between uppercase tracking-widest font-bold">
        <span>SheetFlow v1.0</span>
        <span>Ready</span>
      </div>
    </div>
  );
}
