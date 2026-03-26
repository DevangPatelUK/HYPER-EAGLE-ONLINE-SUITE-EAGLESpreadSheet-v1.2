'use client';

import React, { useState, useEffect } from 'react';
import { Toolbar } from './components/spreadsheet/Toolbar';
import { FormulaBar } from './components/spreadsheet/FormulaBar';
import { Grid } from './components/spreadsheet/Grid';
import { AIAssistant } from './components/spreadsheet/AIAssistant';
import { useSheetStore } from './lib/sheet-store';
import { evaluateFormula, indexToCoordinate } from './lib/formula-engine';
import { toast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';
import { Plus, X, ChevronRight, LogIn, UserCircle, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useUser, useFirestore, useAuth } from '@/firebase';
import { doc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

export default function SpreadsheetPage() {
  const rows = 50;
  const cols = 26;
  const { user } = useUser();
  const db = useFirestore();
  const auth = useAuth();
  
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
  const [isSyncing, setIsSyncing] = useState(false);

  // Load workbook from Firestore when user logs in
  useEffect(() => {
    if (!user || !db) return;

    const userDocRef = doc(db, 'workbooks', user.uid);
    const unsubscribe = onSnapshot(userDocRef, (snapshot) => {
      if (snapshot.exists()) {
        const cloudData = snapshot.data();
        if (cloudData.workbookData) {
          // Only update if we aren't currently editing to avoid jumping
          setWorkbook(cloudData.workbookData);
        }
      }
    }, async (err) => {
      const permissionError = new FirestorePermissionError({
        path: userDocRef.path,
        operation: 'get'
      });
      errorEmitter.emit('permission-error', permissionError);
    });

    return () => unsubscribe();
  }, [user, db, setWorkbook]);

  const handleSave = () => {
    if (!user || !db) {
      toast({ title: 'Auth Required', description: 'Please sign in to save your work.', variant: 'destructive' });
      return;
    }

    setIsSyncing(true);
    const userDocRef = doc(db, 'workbooks', user.uid);
    
    setDoc(userDocRef, {
      userId: user.uid,
      name: workbook[activeSheetId]?.name || 'My Workbook',
      workbookData: workbook,
      updatedAt: serverTimestamp(),
    }, { merge: true })
    .then(() => {
      toast({ title: 'Saved to Cloud', description: 'Your progress is synced securely.' });
    })
    .catch(async (err) => {
      const permissionError = new FirestorePermissionError({
        path: userDocRef.path,
        operation: 'update',
        requestResourceData: workbook
      });
      errorEmitter.emit('permission-error', permissionError);
    })
    .finally(() => setIsSyncing(false));
  };

  const handleSignIn = async () => {
    if (!auth) return;
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (e) {
      toast({ title: 'Sign In Failed', description: 'Could not authenticate.', variant: 'destructive' });
    }
  };

  const handleSignOut = () => {
    if (auth) signOut(auth);
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
      role="application"
      aria-label="SheetFlow Spreadsheet Application"
    >
      <header role="banner">
        <div className="bg-primary px-4 py-1 flex items-center justify-between text-white text-[10px] font-bold uppercase tracking-tighter">
          <div className="flex items-center gap-2">
            <UserCircle className="h-3 w-3" />
            {user ? `Signed in as ${user.displayName || user.email}` : 'Guest Mode (Local Only)'}
          </div>
          {user ? (
            <button onClick={handleSignOut} className="hover:underline flex items-center gap-1">
              <LogOut className="h-3 w-3" /> Sign Out
            </button>
          ) : (
            <button onClick={handleSignIn} className="hover:underline flex items-center gap-1">
              <LogIn className="h-3 w-3" /> Sign In to Sync
            </button>
          )}
        </div>
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
          onImportCSV={() => {}} 
          onExportCSV={() => {}} 
          onExportJSON={() => {}} 
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
          <span>SheetFlow v2.0 Security Enabled</span>
          <ChevronRight className="h-3 w-3" />
          <span>{activeSheet?.name}</span>
          {isSyncing && <span className="animate-pulse ml-2">Syncing...</span>}
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
