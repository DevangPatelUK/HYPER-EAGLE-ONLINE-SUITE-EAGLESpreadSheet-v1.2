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
import { Plus, X, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function SpreadsheetPage() {
  const rows = 50;
  const cols = 26;
  const {
    workbook,
    setWorkbook,
    activeSheetId,
    setActiveSheetId,
    data,
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
    handleKeyDown,
    addSheet,
    renameSheet,
    removeSheet,
    selectRow,
    selectCol,
  } = useSheetStore(rows, cols);

  const [aiOpen, setAiOpen] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('sheet-flow-workbook');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setWorkbook(parsed.workbook);
        setActiveSheetId(parsed.activeSheetId || Object.keys(parsed.workbook)[0]);
      } catch (e) {
        console.error('Failed to load saved workbook');
      }
    }
  }, [setWorkbook, setActiveSheetId]);

  const handleSave = () => {
    localStorage.setItem('sheet-flow-workbook', JSON.stringify({ workbook, activeSheetId }));
    toast({ title: 'Saved', description: 'Workbook saved successfully.' });
  };

  const handleUpdate = (coord: string, val: string) => {
    if (val.startsWith('=')) {
      updateCell(coord, { formula: val, value: evaluateFormula(coord, val, workbook, activeSheetId) });
    } else {
      updateCell(coord, { value: val, formula: '' });
    }
  };

  const activeSheet = workbook[activeSheetId];

  return (
    <div 
      className="flex flex-col h-screen overflow-hidden bg-background outline-none"
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      <Toolbar
        sheetName={activeSheet?.name || ''}
        onNameChange={(name) => renameSheet(activeSheetId, name)}
        onBold={() => selectionRange.forEach(c => updateCell(c, { bold: !(data[c]?.bold) }))}
        onAlign={(align) => selectionRange.forEach(c => updateCell(c, { align }))}
        onFormat={(format) => selectionRange.forEach(c => updateCell(c, { format }))}
        onBgColor={(backgroundColor) => selectionRange.forEach(c => updateCell(c, { backgroundColor }))}
        onNew={addSheet}
        onSave={handleSave}
        onDelete={() => removeSheet(activeSheetId)}
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
          onDoubleClick={(c) => { setEditingCell(c); setEditingValue(null); }}
          onUpdate={handleUpdate}
          onFinishEdit={(key) => {
            setEditingCell(null);
            setEditingValue(null);
          }}
          onSelectRow={(r) => selectRow(r)}
          onSelectCol={(c) => selectCol(c)}
        />
      </div>

      {/* Sheet Tabs Bar */}
      <div className="h-10 bg-white border-t border-border flex items-center px-2 gap-1 overflow-x-auto scrollbar-hide shrink-0">
        {Object.values(workbook).map((sheet) => (
          <div
            key={sheet.id}
            className={cn(
              "group flex items-center h-full px-4 text-xs font-semibold cursor-pointer border-r border-border transition-all min-w-[120px] justify-between",
              activeSheetId === sheet.id 
                ? "bg-primary text-white" 
                : "bg-secondary/20 text-muted-foreground hover:bg-secondary/40"
            )}
            onClick={() => setActiveSheetId(sheet.id)}
          >
            <span className="truncate">{sheet.name}</span>
            {Object.keys(workbook).length > 1 && (
              <X 
                className={cn("h-3 w-3 ml-2 opacity-0 group-hover:opacity-100 hover:text-red-400 transition-opacity", activeSheetId === sheet.id && "text-white/70 hover:text-white")} 
                onClick={(e) => { e.stopPropagation(); removeSheet(sheet.id); }}
              />
            )}
          </div>
        ))}
        <Button variant="ghost" size="icon" className="h-8 w-8 ml-1" onClick={addSheet}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <Toaster />

      <div className="h-6 bg-primary text-[10px] text-white flex items-center px-4 justify-between uppercase tracking-widest font-bold">
        <div className="flex items-center gap-2">
          <span>SheetFlow v1.1</span>
          <ChevronRight className="h-3 w-3" />
          <span>{activeSheet?.name}</span>
        </div>
        <span>{selectionRange.length > 1 ? `${selectionRange.length} cells selected` : 'Ready'}</span>
      </div>

      <AIAssistant
        open={aiOpen}
        onOpenChange={setAiOpen}
        selectedRange={selectedCell}
        selectedRangeData={[]} // Selection range data extraction could be added if needed
        onApplyFormula={(f) => selectedCell && handleUpdate(selectedCell, f)}
      />
    </div>
  );
}
