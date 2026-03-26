'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Toolbar } from './components/spreadsheet/Toolbar';
import { FormulaBar } from './components/spreadsheet/FormulaBar';
import { Grid } from './components/spreadsheet/Grid';
import { AIAssistant } from './components/spreadsheet/AIAssistant';
import { useSheetStore } from './lib/sheet-store';
import { evaluateFormula, indexToCoordinate } from './lib/formula-engine';
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
    undo,
    redo,
    canUndo,
    canRedo,
  } = useSheetStore(rows, cols);

  const [aiOpen, setAiOpen] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('sheet-flow-workbook-v2');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.workbook && Object.keys(parsed.workbook).length > 0) {
          setWorkbook(parsed.workbook);
          setActiveSheetId(parsed.activeSheetId || Object.keys(parsed.workbook)[0]);
        }
      } catch (e) {
        console.error('Failed to load saved workbook');
      }
    }
  }, [setWorkbook, setActiveSheetId]);

  const handleSave = () => {
    localStorage.setItem('sheet-flow-workbook-v2', JSON.stringify({ workbook, activeSheetId }));
    toast({ title: 'Saved', description: 'Workbook saved successfully to local storage.' });
  };

  const handleUpdate = (coord: string, val: string) => {
    if (val.startsWith('=')) {
      updateCell(coord, { formula: val, value: evaluateFormula(coord, val, workbook, activeSheetId) });
    } else {
      updateCell(coord, { value: val, formula: '' });
    }
  };

  const handleExportCSV = () => {
    let csv = "";
    for (let r = 0; r < rows; r++) {
      let rowData = [];
      for (let c = 0; c < cols; c++) {
        const coord = indexToCoordinate(r, c);
        const cellData = data[coord];
        let val = cellData?.value || "";
        // Basic escaping for CSV
        if (val.includes(',') || val.includes('"') || val.includes('\n')) {
          val = `"${val.replace(/"/g, '""')}"`;
        }
        rowData.push(val);
      }
      csv += rowData.join(",") + "\n";
    }
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${workbook[activeSheetId]?.name || 'sheet'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Exported', description: 'Sheet exported as CSV.' });
  };

  const handleExportJSON = () => {
    const json = JSON.stringify({ workbook, activeSheetId }, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sheetflow_workbook_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Exported', description: 'Workbook exported as JSON.' });
  };

  const handleImportCSV = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split(/\r?\n/);
      const newSheetData = { ...data };
      
      lines.forEach((line, r) => {
        if (r >= rows) return;
        const values = line.split(','); // Simple split, could be enhanced for quoted commas
        values.forEach((val, c) => {
          if (c >= cols) return;
          const coord = indexToCoordinate(r, c);
          let cleanedVal = val.trim();
          if (cleanedVal.startsWith('"') && cleanedVal.endsWith('"')) {
            cleanedVal = cleanedVal.slice(1, -1).replace(/""/g, '"');
          }
          newSheetData[coord] = { value: cleanedVal, formula: '' };
        });
      });

      // Update the whole sheet in the workbook
      const newWorkbook = { ...workbook };
      newWorkbook[activeSheetId] = {
        ...newWorkbook[activeSheetId],
        data: newSheetData
      };
      setWorkbook(newWorkbook);
      toast({ title: 'Imported', description: `Data imported into ${workbook[activeSheetId].name}` });
    };
    reader.readAsText(file);
  };

  const activeSheet = workbook[activeSheetId];

  return (
    <div 
      className="flex flex-col h-screen overflow-hidden bg-background outline-none"
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="application"
      aria-label="SheetFlow Spreadsheet Application"
    >
      <header role="banner">
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
          onUndo={undo}
          onRedo={redo}
          onImportCSV={handleImportCSV}
          onExportCSV={handleExportCSV}
          onExportJSON={handleExportJSON}
          canUndo={canUndo}
          canRedo={canRedo}
        />
        
        <FormulaBar
          selectedCoord={selectedCell}
          formula={selectedCell ? (data[selectedCell]?.formula || data[selectedCell]?.value || '') : ''}
          onChange={(val) => selectedCell && handleUpdate(selectedCell, val)}
        />
      </header>

      <main className="flex-1 overflow-hidden flex flex-col relative border-t border-border" role="main">
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
          onFinishEdit={() => {
            setEditingCell(null);
            setEditingValue(null);
          }}
          onSelectRow={(r) => selectRow(r)}
          onSelectCol={(c) => selectCol(c)}
        />
      </main>

      <nav className="h-10 bg-white border-t border-border flex items-center px-2 gap-1 overflow-x-auto scrollbar-hide shrink-0 shadow-inner" aria-label="Sheet Selection">
        {Object.values(workbook).map((sheet) => (
          <div
            key={sheet.id}
            className={cn(
              "group flex items-center h-full px-4 text-xs font-semibold cursor-pointer border-r border-border transition-all min-w-[140px] justify-between relative",
              activeSheetId === sheet.id 
                ? "bg-primary text-white z-10" 
                : "bg-secondary/20 text-muted-foreground hover:bg-secondary/40"
            )}
            onClick={() => setActiveSheetId(sheet.id)}
            role="tab"
            aria-selected={activeSheetId === sheet.id}
          >
            <span className="truncate">{sheet.name}</span>
            {Object.keys(workbook).length > 1 && (
              <X 
                className={cn("h-3 w-3 ml-2 opacity-0 group-hover:opacity-100 hover:text-red-400 transition-opacity", activeSheetId === sheet.id && "text-white/70 hover:text-white")} 
                onClick={(e) => { e.stopPropagation(); removeSheet(sheet.id); }}
                aria-label={`Remove sheet ${sheet.name}`}
              />
            )}
            {activeSheetId === sheet.id && (
              <div className="absolute top-0 left-0 w-full h-0.5 bg-accent" />
            )}
          </div>
        ))}
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8 ml-1 hover:bg-primary/10 hover:text-primary" 
          onClick={addSheet}
          aria-label="Add new sheet"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </nav>

      <Toaster />

      <footer className="h-6 bg-primary text-[10px] text-white flex items-center px-4 justify-between uppercase tracking-widest font-bold" role="status" aria-live="polite">
        <div className="flex items-center gap-2">
          <span>SheetFlow v1.5</span>
          <ChevronRight className="h-3 w-3" />
          <span>{activeSheet?.name}</span>
        </div>
        <span>{selectionRange.length > 1 ? `${selectionRange.length} cells selected` : 'Ready'}</span>
      </footer>

      <AIAssistant
        open={aiOpen}
        onOpenChange={setAiOpen}
        selectedRange={selectedCell}
        selectedRangeData={[]} 
        onApplyFormula={(f) => selectedCell && handleUpdate(selectedCell, f)}
      />
    </div>
  );
}
