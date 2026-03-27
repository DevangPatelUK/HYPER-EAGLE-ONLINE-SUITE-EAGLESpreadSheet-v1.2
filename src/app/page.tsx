'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Toolbar } from './components/spreadsheet/Toolbar';
import { FormulaBar } from './components/spreadsheet/FormulaBar';
import { Grid } from './components/spreadsheet/Grid';
import { AIAssistant } from './components/spreadsheet/AIAssistant';
import { HelpDialog } from './components/spreadsheet/HelpDialog';
import { ChartOverlay } from './components/spreadsheet/ChartOverlay';
import { PrintSettingsDialog } from './components/spreadsheet/PrintSettings';
import { useSheetStore } from './lib/sheet-store';
import { evaluateFormula, coordinateToIndex, PrintSettings } from './lib/formula-engine';
import { toast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';
import { Plus, X, ChevronRight, LogIn, UserCircle, Wifi, WifiOff, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useUser, useFirestore } from '@/firebase';
import { doc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { format } from 'date-fns';

const DEFAULT_PRINT_SETTINGS: PrintSettings = {
  orientation: 'portrait',
  margins: 'standard',
  showGridlines: true,
  showHeaders: true,
};

export default function SpreadsheetPage() {
  const rows = 50;
  const cols = 26;
  const { user } = useUser();
  const db = useFirestore();
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isRemoteUpdate = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
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
    updateRowHeight,
    updateColWidth,
    mergeSelection,
    unmergeSelection,
    insertRow,
    deleteRow,
    insertCol,
    deleteCol,
    hideRows,
    hideCols,
    setFrozenState,
    sortRange,
    applyFilter,
    clearFilters,
    addChart,
    removeChart,
    handleMouseDown,
    handleMouseEnter,
    handleMouseUp,
    handleKeyDown,
    onFinishEdit,
    addSheet,
    renameSheet,
    removeSheet,
    undo,
    redo,
    canUndo,
    canRedo,
    selectRow,
    selectCol,
    isDirty,
  } = useSheetStore(rows, cols);

  const [aiOpen, setAiOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const activeSheet = workbook[activeSheetId];
  const printSettings = activeSheet?.printSettings || DEFAULT_PRINT_SETTINGS;

  useEffect(() => {
    if (!editingCell && containerRef.current) {
      containerRef.current.focus();
    }
  }, [editingCell]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (!user || !db) return;
    const userDocRef = doc(db, 'workbooks', user.uid);
    const unsubscribe = onSnapshot(userDocRef, (snapshot) => {
      if (snapshot.exists()) {
        const cloudData = snapshot.data();
        if (cloudData.workbookData) {
          isRemoteUpdate.current = true;
          setWorkbook(cloudData.workbookData);
          if (cloudData.updatedAt) {
            setLastSaved(cloudData.updatedAt.toDate());
          }
          setTimeout(() => { isRemoteUpdate.current = false; }, 100);
        }
      }
    }, async (err) => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({ path: userDocRef.path, operation: 'get' }));
    });
    return () => unsubscribe();
  }, [user, db, setWorkbook]);

  const handleSave = useCallback(() => {
    if (!user || !db || isRemoteUpdate.current) return;
    
    setIsSyncing(true);
    const userDocRef = doc(db, 'workbooks', user.uid);
    
    setDoc(userDocRef, {
      userId: user.uid,
      name: workbook[activeSheetId]?.name || 'HYPER EAGLE Workbook',
      workbookData: workbook,
      updatedAt: serverTimestamp(),
    }, { merge: true })
    .then(() => {
      setLastSaved(new Date());
      isDirty.current = false;
    })
    .catch(async (err) => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({ path: userDocRef.path, operation: 'write', requestResourceData: workbook }));
    })
    .finally(() => setIsSyncing(false));
  }, [user, db, workbook, activeSheetId, isDirty]);

  useEffect(() => {
    if (!user || !db || !isDirty.current || isRemoteUpdate.current) return;

    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(handleSave, 3000);

    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [workbook, user, db, handleSave, isDirty]);

  const handleSignIn = () => {
    toast({ title: "Coming Soon", description: "Cloud authentication for HYPER EAGLE ONLINE is being provisioned." });
  };

  const handleUpdate = (coord: string, val: string) => {
    const cell = data[coord];
    if (cell?.isLocked || activeSheet?.isProtected) {
      toast({ title: 'Cell Protected', description: 'This cell is locked for the HYPER EAGLE SUITE.', variant: 'destructive' });
      return;
    }

    if (val.startsWith('=')) {
      updateCell(coord, { formula: val, value: evaluateFormula(coord, val, workbook, activeSheetId) });
    } else {
      updateCell(coord, { value: val, formula: '' });
    }
  };

  const handleToggleProtectSheet = () => {
    const newWb = { ...workbook };
    const sheet = newWb[activeSheetId];
    if (!sheet) return;
    newWb[activeSheetId] = { ...sheet, isProtected: !sheet.isProtected };
    setWorkbook(newWb);
    toast({ title: sheet.isProtected ? 'Protection Removed' : 'Sheet Protected' });
  };

  return (
    <div 
      ref={containerRef}
      className={cn(
        "flex flex-col h-screen overflow-hidden bg-background outline-none print:h-auto print:overflow-visible",
        printSettings.orientation === 'landscape' && "print:landscape"
      )} 
      onKeyDown={handleKeyDown} 
      tabIndex={0} 
      role="application"
    >
      
      {printSettings.headerText && (
        <div className="hidden print:flex w-full justify-center py-4 border-b mb-4 text-sm font-semibold uppercase tracking-widest">
          {printSettings.headerText}
        </div>
      )}

      <header role="banner" className="print:hidden">
        <div className="bg-primary px-4 py-1 flex items-center justify-between text-white text-[10px] font-bold uppercase tracking-tighter">
          <div className="flex items-center gap-2">
            <UserCircle className="h-3 w-3" />
            {user ? `Signed in as ${user.displayName || user.email}` : 'HYPER EAGLE ONLINE SUITE - GUEST MODE'}
          </div>
          <div className="flex items-center gap-4">
            <div className={cn("flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-white/20 bg-white/10", !isOnline && "bg-destructive/20 border-destructive/40")}>
              {isOnline ? <Wifi className="h-3 w-3 text-green-400" /> : <WifiOff className="h-3 w-3 text-destructive" />}
              <span className={cn(isOnline ? "text-green-400" : "text-destructive")}>{isOnline ? 'Online' : 'Offline'}</span>
            </div>
            <button onClick={handleSignIn} className="hover:underline flex items-center gap-1">
              <LogIn className="h-3 w-3" /> Sign In
            </button>
          </div>
        </div>
        <Toolbar
          sheetName={activeSheet?.name || ''}
          onNameChange={(name) => renameSheet(activeSheetId, name)}
          onBold={() => selectionRange.forEach(c => updateCell(c, { bold: !data[c]?.bold }))}
          onItalic={() => selectionRange.forEach(c => updateCell(c, { italic: !data[c]?.italic }))}
          onUnderline={() => selectionRange.forEach(c => updateCell(c, { underline: !data[c]?.underline }))}
          onWrapText={() => selectionRange.forEach(c => updateCell(c, { wrapText: !data[c]?.wrapText }))}
          onAlign={(align) => selectionRange.forEach(c => updateCell(c, { align }))}
          onFormat={(format) => selectionRange.forEach(c => updateCell(c, { format }))}
          onType={(type, options) => selectionRange.forEach(c => updateCell(c, { type, options }))}
          onBgColor={(backgroundColor) => selectionRange.forEach(c => updateCell(c, { backgroundColor }))}
          onTextColor={(textColor) => selectionRange.forEach(c => updateCell(c, { textColor }))}
          onNew={addSheet}
          onSave={handleSave}
          onDelete={() => removeSheet(activeSheetId)}
          onAI={() => setAiOpen(true)}
          onHelp={() => setHelpOpen(true)}
          onUndo={undo}
          onRedo={redo}
          onClear={() => selectionRange.forEach(c => updateCell(c, { value: '', formula: '' }))}
          onInsertRow={() => selectedCell && insertRow(coordinateToIndex(selectedCell)!.row)}
          onDeleteRow={() => selectedCell && deleteRow(coordinateToIndex(selectedCell)!.row)}
          onInsertCol={() => selectedCell && insertCol(coordinateToIndex(selectedCell)!.col)}
          onDeleteCol={() => selectedCell && deleteCol(coordinateToIndex(selectedCell)!.col)}
          onHideRows={() => selectionRange.length > 0 && hideRows(Array.from(new Set(selectionRange.map(c => coordinateToIndex(c)!.row))), true)}
          onHideCols={() => selectionRange.length > 0 && hideCols(Array.from(new Set(selectionRange.map(c => coordinateToIndex(c)!.col))), true)}
          onUnhideAll={() => { hideRows(Array.from({ length: rows }, (_, i) => i), false); hideCols(Array.from({ length: cols }, (_, i) => i), false); }}
          onFreezeRows={(n) => setFrozenState(n, undefined)}
          onFreezeCols={(n) => setFrozenState(undefined, n)}
          onSort={(dir) => sortRange(dir)}
          onFilter={(op, val) => selectedCell && applyFilter(coordinateToIndex(selectedCell)!.col, op, val)}
          onClearFilters={clearFilters}
          onMerge={mergeSelection}
          onUnmerge={unmergeSelection}
          onAddComment={() => { if (selectedCell) { const c = window.prompt('Note:', data[selectedCell]?.comment || ''); if (c !== null) updateCell(selectedCell, { comment: c || undefined }); } }}
          onAddChart={addChart}
          onPrint={() => setPrintOpen(true)}
          onValidation={(v) => selectionRange.forEach(c => updateCell(c, { validation: v }))}
          onConditionalFormat={(r) => selectionRange.forEach(c => updateCell(c, { conditionalFormats: r ? [r] : [] }))}
          onLock={(l) => selectionRange.forEach(c => updateCell(c, { isLocked: l }))}
          onToggleProtectSheet={handleToggleProtectSheet}
          isSheetProtected={!!activeSheet?.isProtected}
          onImportCSV={() => {}} onExportCSV={() => {}} onExportJSON={() => {}}
          canUndo={canUndo} canRedo={canRedo}
        />
        <FormulaBar selectedCoord={selectedCell} formula={selectedCell ? (data[selectedCell]?.formula || data[selectedCell]?.value || '') : ''} onChange={(val) => selectedCell && handleUpdate(selectedCell, val)} />
      </header>

      <main className={cn(
        "flex-1 overflow-hidden flex flex-col relative border-t border-border print:border-none print:overflow-visible print:h-auto",
        printSettings.margins === 'narrow' ? "print:p-4" : printSettings.margins === 'wide' ? "print:p-12" : "print:p-8",
      )}>
        {activeSheet && (
          <Grid 
            rows={rows} 
            cols={cols} 
            activeSheet={activeSheet}
            selectedCell={selectedCell} 
            selectionRange={selectionRange} 
            editingCell={editingCell} 
            editingValue={editingValue} 
            onMouseDown={handleMouseDown} 
            onMouseEnter={handleMouseEnter} 
            onMouseUp={handleMouseUp} 
            onDoubleClick={(c) => { setEditingCell(c); setEditingValue(null); }} 
            onUpdate={handleUpdate} 
            onUpdateRowHeight={updateRowHeight}
            onUpdateColWidth={updateColWidth}
            onFinishEdit={onFinishEdit} 
            onSelectRow={selectRow} 
            onSelectCol={selectCol} 
          />
        )}
        <div className="print:hidden">
          {activeSheet?.charts?.map((chart) => (
            <ChartOverlay key={chart.id} chart={chart} workbook={workbook} activeSheetId={activeSheetId} onRemove={removeChart} />
          ))}
        </div>
      </main>

      {printSettings.footerText && (
        <div className="hidden print:flex w-full justify-center py-4 border-t mt-4 text-xs text-muted-foreground">
          {printSettings.footerText}
        </div>
      )}

      <nav className="h-10 bg-white border-t border-border flex items-center px-2 gap-1 overflow-x-auto scrollbar-hide shrink-0 shadow-inner print:hidden">
        {Object.values(workbook).map((sheet) => (
          <div key={sheet.id} className={cn("group flex items-center h-full px-4 text-xs font-semibold cursor-pointer border-r border-border transition-all min-w-[140px] justify-between relative", activeSheetId === sheet.id ? "bg-primary text-white" : "bg-secondary/20 text-muted-foreground")} onClick={() => setActiveSheetId(sheet.id)}>
            <span className="truncate">{sheet.name}</span>
            {Object.keys(workbook).length > 1 && <X className="h-3 w-3 ml-2 opacity-0 group-hover:opacity-100" onClick={(e) => { e.stopPropagation(); removeSheet(sheet.id); }} />}
          </div>
        ))}
        <Button variant="ghost" size="icon" className="h-8 w-8 ml-1" onClick={addSheet}><Plus className="h-4 w-4" /></Button>
      </nav>
      <Toaster />
      <footer className="h-6 bg-primary text-[10px] text-white flex items-center px-4 justify-between uppercase tracking-widest font-bold print:hidden">
        <div className="flex items-center gap-2">
          <span>HYPER EAGLE v1.0</span>
          <ChevronRight className="h-3 w-3" />
          <span>{activeSheet?.name}</span>
          {isSyncing ? (
            <span className="flex items-center gap-1.5 ml-2"><Save className="h-3 w-3 animate-pulse" />Saving...</span>
          ) : lastSaved ? (
            <span className="opacity-70 ml-2">Saved at {format(lastSaved, 'HH:mm:ss')}</span>
          ) : null}
        </div>
        <span>{selectionRange.length > 1 ? `${selectionRange.length} cells selected` : 'HYPER EAGLE READY'}</span>
      </footer>

      <AIAssistant open={aiOpen} onOpenChange={setAiOpen} selectedRange={selectedCell} selectedRangeData={[]} onApplyFormula={(f) => selectedCell && handleUpdate(selectedCell, f)} />
      <HelpDialog open={helpOpen} onOpenChange={setHelpOpen} />
      <PrintSettingsDialog 
        open={printOpen} onOpenChange={setPrintOpen} settings={printSettings} 
        onUpdateSettings={(s) => { const nwb = { ...workbook }; nwb[activeSheetId].printSettings = s; setWorkbook(nwb); }}
        onPrint={() => { setPrintOpen(false); setTimeout(() => window.print(), 500); }}
      />
    </div>
  );
}