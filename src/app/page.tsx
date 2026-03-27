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
import { Plus, X, ChevronRight, UserCircle, Wifi, WifiOff, Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useUser, useFirestore } from '@/firebase';
import { doc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { format } from 'date-fns';

const DEFAULT_PRINT: PrintSettings = { orientation: 'portrait', margins: 'standard', showGridlines: true, showHeaders: true };

export default function HyperEagleSpreadsheet() {
  const rows = 50, cols = 26;
  const { user } = useUser();
  const db = useFirestore();
  const containerRef = useRef<HTMLDivElement>(null);
  const isRemoteUpdate = useRef(false);
  const autoSaveTimer = useRef<NodeJS.Timeout | null>(null);

  const {
    workbook, setWorkbook, activeSheetId, setActiveSheetId, activeSheet, data,
    selectedCell, selectionRange, editingCell, setEditingCell, editingValue, setEditingValue,
    updateCell, updateRowHeight, updateColWidth, handleMouseDown, handleMouseEnter, handleMouseUp,
    handleKeyDown, onFinishEdit, addSheet, renameSheet, removeSheet, undo, redo, canUndo, canRedo,
    isDirty, addChart, removeChart, moveSelection
  } = useSheetStore(rows, cols);

  const [aiOpen, setAiOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const h = () => setIsOnline(true), l = () => setIsOnline(false);
    window.addEventListener('online', h); window.addEventListener('offline', l);
    return () => { window.removeEventListener('online', h); window.removeEventListener('offline', l); };
  }, []);

  useEffect(() => {
    if (!user || !db) return;
    const ref = doc(db, 'workbooks', user.uid);
    return onSnapshot(ref, (snap) => {
      if (snap.exists() && !isDirty.current) {
        const d = snap.data();
        isRemoteUpdate.current = true;
        setWorkbook(d.workbookData);
        if (d.updatedAt) setLastSaved(d.updatedAt.toDate());
        setTimeout(() => isRemoteUpdate.current = false, 200);
      }
    }, (err) => errorEmitter.emit('permission-error', new FirestorePermissionError({ path: ref.path, operation: 'get' })));
  }, [user, db, setWorkbook, isDirty]);

  const handleSave = useCallback(() => {
    if (!user || !db || !isDirty.current || isRemoteUpdate.current) return;
    setIsSyncing(true);
    const ref = doc(db, 'workbooks', user.uid);
    setDoc(ref, { userId: user.uid, name: activeSheet.name, workbookData: workbook, updatedAt: serverTimestamp() }, { merge: true })
      .then(() => { setLastSaved(new Date()); isDirty.current = false; })
      .catch((e) => errorEmitter.emit('permission-error', new FirestorePermissionError({ path: ref.path, operation: 'write', requestResourceData: workbook })))
      .finally(() => setIsSyncing(false));
  }, [user, db, workbook, activeSheet, isDirty]);

  useEffect(() => {
    if (!isDirty.current) return;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(handleSave, 3000);
    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current); };
  }, [workbook, handleSave, isDirty]);

  const handleUpdate = (coord: string, val: string) => {
    if (activeSheet.isProtected || data[coord]?.isLocked) {
      toast({ title: 'Protected', description: 'Cell is locked.', variant: 'destructive' });
      return;
    }
    if (val.startsWith('=')) updateCell(coord, { formula: val, value: evaluateFormula(coord, val, workbook, activeSheetId) });
    else updateCell(coord, { value: val, formula: '' });
  };

  const handleCommitEdit = (nextKey?: string) => {
    if (nextKey && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(nextKey)) {
      onFinishEdit();
      setTimeout(() => moveSelection(nextKey), 0);
    } else {
      onFinishEdit(nextKey);
    }
    containerRef.current?.focus();
  };

  return (
    <div 
      ref={containerRef}
      className={cn("flex flex-col h-screen bg-background outline-none overflow-hidden print:h-auto", activeSheet.printSettings?.orientation === 'landscape' && "print:landscape")}
      onKeyDown={handleKeyDown} tabIndex={0}
    >
      <header className="print:hidden">
        <div className="bg-primary px-4 py-1 flex items-center justify-between text-white text-[10px] font-bold uppercase tracking-widest">
          <div className="flex items-center gap-2"><UserCircle className="h-3 w-3" /> {user ? user.displayName || user.email : 'HYPER EAGLE GUEST'}</div>
          <div className="flex items-center gap-4">
            <div className={cn("flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/10 border border-white/20", !isOnline && "bg-destructive/20 border-destructive/40")}>
              {isOnline ? <Wifi className="h-3 w-3 text-emerald-400" /> : <WifiOff className="h-3 w-3 text-destructive" />}
              <span className={isOnline ? "text-emerald-400" : "text-destructive"}>{isOnline ? 'Online' : 'Offline'}</span>
            </div>
            <button onClick={() => toast({ title: "Coming Soon", description: "Cloud Authentication is being provisioned." })} className="hover:underline">Sign In</button>
          </div>
        </div>
        <Toolbar
          sheetName={activeSheet.name} onNameChange={(n) => renameSheet(activeSheetId, n)}
          onBold={() => selectionRange.forEach(c => updateCell(c, { bold: !data[c]?.bold }))}
          onItalic={() => selectionRange.forEach(c => updateCell(c, { italic: !data[c]?.italic }))}
          onUnderline={() => selectionRange.forEach(c => updateCell(c, { underline: !data[c]?.underline }))}
          onWrapText={() => selectionRange.forEach(c => updateCell(c, { wrapText: !data[c]?.wrapText }))}
          onAlign={(a) => selectionRange.forEach(c => updateCell(c, { align: a }))}
          onFormat={(f) => selectionRange.forEach(c => updateCell(c, { format: f }))}
          onBgColor={(bg) => selectionRange.forEach(c => updateCell(c, { backgroundColor: bg }))}
          onNew={addSheet} onSave={handleSave} onDelete={() => removeSheet(activeSheetId)}
          onAI={() => setAiOpen(true)} onHelp={() => setHelpOpen(true)} onPrint={() => setPrintOpen(true)}
          onUndo={undo} onRedo={redo} canUndo={canUndo} canRedo={canRedo}
          onAddChart={addChart} onClear={() => selectionRange.forEach(c => updateCell(c, { value: '', formula: '' }))}
          onInsertRow={() => {}} onLock={(l) => selectionRange.forEach(c => updateCell(c, { isLocked: l }))}
          isSheetProtected={!!activeSheet.isProtected} onToggleProtectSheet={() => {}}
        />
        <FormulaBar selectedCoord={selectedCell} formula={selectedCell ? (data[selectedCell]?.formula || data[selectedCell]?.value || '') : ''} onChange={(v) => selectedCell && handleUpdate(selectedCell, v)} />
      </header>

      <main className="flex-1 overflow-hidden relative border-t border-border print:border-none print:p-8">
        <Grid 
          rows={rows} cols={cols} activeSheet={activeSheet}
          selectedCell={selectedCell} selectionRange={selectionRange}
          editingCell={editingCell} editingValue={editingValue}
          onMouseDown={handleMouseDown} onMouseEnter={handleMouseEnter} onMouseUp={handleMouseUp}
          onDoubleClick={(c) => setEditingCell(c)} onUpdate={handleUpdate}
          onUpdateRowHeight={updateRowHeight} onUpdateColWidth={updateColWidth}
          onFinishEdit={handleCommitEdit} onSelectRow={() => {}} onSelectCol={() => {}}
        />
        <div className="print:hidden">
          {activeSheet.charts?.map(c => <ChartOverlay key={c.id} chart={c} workbook={workbook} activeSheetId={activeSheetId} onRemove={removeChart} />)}
        </div>
      </main>

      <nav className="h-10 bg-white border-t border-border flex items-center px-2 gap-1 overflow-x-auto scrollbar-hide print:hidden">
        {Object.values(workbook).map(s => (
          <div key={s.id} onClick={() => setActiveSheetId(s.id)} className={cn("group flex items-center px-4 h-full text-xs font-bold border-r cursor-pointer transition-colors min-w-[140px] justify-between", activeSheetId === s.id ? "bg-primary text-white" : "bg-secondary/20 text-muted-foreground hover:bg-secondary/40")}>
            <span className="truncate">{s.name}</span>
            {Object.keys(workbook).length > 1 && <X className="h-3 w-3 opacity-0 group-hover:opacity-100" onClick={(e) => { e.stopPropagation(); removeSheet(s.id); }} />}
          </div>
        ))}
        <Button variant="ghost" size="icon" className="h-8 w-8 ml-1" onClick={addSheet}><Plus className="h-4 w-4" /></Button>
      </nav>

      <footer className="h-6 bg-primary text-[9px] text-white flex items-center px-4 justify-between font-bold tracking-widest print:hidden">
        <div className="flex items-center gap-2">
          <span>HYPER EAGLE v1.1</span> <ChevronRight className="h-3 w-3" /> <span>{activeSheet.name}</span>
          {isSyncing ? <span className="flex items-center gap-1 ml-2"><Loader2 className="h-3 w-3 animate-spin" /> Syncing...</span> : lastSaved ? <span className="opacity-60 ml-2">Saved at {format(lastSaved, 'HH:mm:ss')}</span> : null}
        </div>
        <span>{selectionRange.length > 1 ? `${selectionRange.length} CELLS SELECTED` : 'HYPER EAGLE READY'}</span>
      </footer>

      <AIAssistant open={aiOpen} onOpenChange={setAiOpen} selectedRange={selectedCell} selectedRangeData={[]} onApplyFormula={(f) => selectedCell && handleUpdate(selectedCell, f)} />
      <HelpDialog open={helpOpen} onOpenChange={setHelpOpen} />
      <PrintSettingsDialog open={printOpen} onOpenChange={setPrintOpen} settings={activeSheet.printSettings || DEFAULT_PRINT} onUpdateSettings={(s) => { const n = { ...workbook }; n[activeSheetId].printSettings = s; setWorkbook(n); }} onPrint={() => { setPrintOpen(false); setTimeout(() => window.print(), 500); }} />
      <Toaster />
    </div>
  );
}