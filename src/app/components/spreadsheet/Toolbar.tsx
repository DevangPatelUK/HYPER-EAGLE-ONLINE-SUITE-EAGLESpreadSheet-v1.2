'use client';

import React, { useState, useEffect, memo } from 'react';
import { 
  Bold, 
  Italic,
  Underline,
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  FilePlus, 
  Save, 
  Trash2, 
  Undo, 
  Redo, 
  LayoutGrid, 
  Palette,
  CircleDollarSign,
  Percent,
  ChevronDown,
  Rows,
  Columns,
  Eraser,
  Printer,
  HelpCircle,
  BookOpen,
  WrapText,
  Sparkles,
  MessageSquarePlus,
  PanelTop,
  PanelLeft,
  ChevronRight,
  EyeOff,
  Eye,
  Lock,
  Unlock,
  BarChart3,
  Type as TypeIcon,
  MousePointer2,
  Combine,
  Split,
  Filter as FilterIcon,
  TableProperties
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import { ValidationRule, ConditionalFormatRule, ChartType } from '@/app/lib/formula-engine';

interface ToolbarProps {
  onBold: () => void;
  onItalic: () => void;
  onUnderline: () => void;
  onWrapText: () => void;
  onAlign: (align: 'left' | 'center' | 'right') => void;
  onFormat: (format: 'number' | 'currency' | 'percent' | 'text') => void;
  onType: (type: 'text' | 'number' | 'date' | 'checkbox' | 'select', options?: string[]) => void;
  onBgColor: (color: string) => void;
  onTextColor: (color: string) => void;
  onNew: () => void;
  onSave: () => void;
  onDelete: () => void;
  onAI: () => void;
  onHelp: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  onInsertRow: () => void;
  onDeleteRow: () => void;
  onInsertCol: () => void;
  onDeleteCol: () => void;
  onHideRows: () => void;
  onHideCols: () => void;
  onUnhideAll: () => void;
  onFreezeRows: (n: number) => void;
  onFreezeCols: (n: number) => void;
  onSort: (dir: 'asc' | 'desc') => void;
  onFilter: (op: 'contains' | 'gt' | 'lt' | 'eq', val: string) => void;
  onClearFilters: () => void;
  onMerge: () => void;
  onUnmerge: () => void;
  onAddChart: (type: ChartType) => void;
  onImportCSV: (file: File) => void;
  onExportCSV: () => void;
  onExportJSON: () => void;
  onPrint: () => void;
  onAddComment: () => void;
  onValidation: (rule: ValidationRule | undefined) => void;
  onConditionalFormat: (rule: ConditionalFormatRule | undefined) => void;
  onLock: (lock: boolean) => void;
  onToggleProtectSheet: () => void;
  isSheetProtected: boolean;
  canUndo: boolean;
  canRedo: boolean;
  sheetName: string;
  onNameChange: (name: string) => void;
}

const BG_COLORS = [
  { name: 'None', value: '' },
  { name: 'Green', value: '#dcfce7' },
  { name: 'Light Green', value: '#f0fdf4' },
  { name: 'Yellow', value: '#fef9c3' },
  { name: 'Blue', value: '#dbeafe' },
  { name: 'Gray', value: '#f3f4f6' },
  { name: 'Red', value: '#fee2e2' },
  { name: 'Purple', value: '#f3e8ff' },
];

const TEXT_COLORS = [
  { name: 'Default', value: '' },
  { name: 'White', value: '#ffffff' },
  { name: 'Black', value: '#000000' },
  { name: 'Emerald', value: '#059669' },
  { name: 'Blue', value: '#2563eb' },
  { name: 'Red', value: '#dc2626' },
  { name: 'Orange', value: '#ea580c' },
  { name: 'Gray', value: '#4b5563' },
];

export const Toolbar = memo(({
  onBold,
  onItalic,
  onUnderline,
  onWrapText,
  onAlign,
  onFormat,
  onBgColor,
  onTextColor,
  onNew,
  onSave,
  onDelete,
  onAI,
  onHelp,
  onUndo,
  onRedo,
  onClear,
  onInsertRow,
  onDeleteRow,
  onInsertCol,
  onDeleteCol,
  onHideRows,
  onHideCols,
  onUnhideAll,
  onFreezeRows,
  onFreezeCols,
  onPrint,
  onAddComment,
  onAddChart,
  onSort,
  onLock,
  isSheetProtected,
  onToggleProtectSheet,
  onMerge,
  onUnmerge,
  onValidation,
  onConditionalFormat,
  canUndo,
  canRedo,
  sheetName,
  onNameChange,
}: ToolbarProps) => {
  const [localName, setLocalName] = useState(sheetName);

  useEffect(() => {
    setLocalName(sheetName);
  }, [sheetName]);

  const handleNameCommit = () => {
    if (localName !== sheetName) {
      onNameChange(localName);
    }
  };

  return (
    <div className="flex flex-col bg-white border-b border-border shadow-sm print:hidden">
      <div className="flex items-center gap-4 px-4 py-1 border-b bg-muted/30 text-[10px] font-bold text-muted-foreground uppercase tracking-widest select-none">
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-1 hover:text-primary cursor-pointer transition-colors px-1 outline-none">
            File <ChevronDown className="h-2 w-2" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-[200px]">
            <DropdownMenuItem onSelect={onNew}><FilePlus className="h-4 w-4 mr-2" />New Sheet</DropdownMenuItem>
            <DropdownMenuItem onSelect={onSave}><Save className="h-4 w-4 mr-2" />Save Workbook</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={onPrint}><Printer className="h-4 w-4 mr-2" />Print Settings</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={onDelete} className="text-destructive"><Trash2 className="h-4 w-4 mr-2" />Delete Active Sheet</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-1 hover:text-primary cursor-pointer transition-colors px-1 outline-none">
            Edit <ChevronDown className="h-2 w-2" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-[220px]">
            <DropdownMenuItem onSelect={onUndo} disabled={!canUndo}><Undo className="h-4 w-4 mr-2" />Undo (Ctrl+Z)</DropdownMenuItem>
            <DropdownMenuItem onSelect={onRedo} disabled={!canRedo}><Redo className="h-4 w-4 mr-2" />Redo (Ctrl+Y)</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={onInsertRow}><Rows className="h-4 w-4 mr-2" />Insert Row Above</DropdownMenuItem>
            <DropdownMenuItem onSelect={onDeleteRow}><Trash2 className="h-4 w-4 mr-2" />Delete Selected Rows</DropdownMenuItem>
            <DropdownMenuItem onSelect={onInsertCol}><Columns className="h-4 w-4 mr-2" />Insert Column Left</DropdownMenuItem>
            <DropdownMenuItem onSelect={onDeleteCol}><Trash2 className="h-4 w-4 mr-2" />Delete Selected Columns</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => onSort('asc')}><ChevronRight className="h-4 w-4 mr-2 rotate-[-90deg]" />Sort Range A-Z</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onSort('desc')}><ChevronRight className="h-4 w-4 mr-2 rotate-[90deg]" />Sort Range Z-A</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={onMerge}><Combine className="h-4 w-4 mr-2" />Merge Cells</DropdownMenuItem>
            <DropdownMenuItem onSelect={onUnmerge}><Split className="h-4 w-4 mr-2" />Unmerge Cells</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={onClear}><Eraser className="h-4 w-4 mr-2" />Clear Selection (Del)</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-1 hover:text-primary cursor-pointer transition-colors px-1 outline-none">
            View <ChevronDown className="h-2 w-2" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-[200px]">
            <DropdownMenuItem onSelect={() => onFreezeRows(1)}><PanelTop className="h-4 w-4 mr-2" />Freeze Top Row</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onFreezeCols(1)}><PanelLeft className="h-4 w-4 mr-2" />Freeze First Column</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onFreezeRows(0)}><Undo className="h-4 w-4 mr-2" />Unfreeze All</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={onHideRows}><EyeOff className="h-4 w-4 mr-2" />Hide Selected Rows</DropdownMenuItem>
            <DropdownMenuItem onSelect={onHideCols}><EyeOff className="h-4 w-4 mr-2" />Hide Selected Cols</DropdownMenuItem>
            <DropdownMenuItem onSelect={onUnhideAll}><Eye className="h-4 w-4 mr-2" />Unhide All Rows/Cols</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-1 hover:text-primary cursor-pointer transition-colors px-1 outline-none">
            Tools <ChevronDown className="h-2 w-2" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-[200px]">
            <DropdownMenuSub>
              <DropdownMenuSubTrigger><BarChart3 className="h-4 w-4 mr-2" />Insert Chart</DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem onSelect={() => onAddChart('bar')}>Bar Chart</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => onAddChart('line')}>Line Chart</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => onAddChart('area')}>Area Chart</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => onAddChart('pie')}>Pie Chart</DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuItem onSelect={() => onValidation({ type: 'number', allowEmpty: true })}>
              <TableProperties className="h-4 w-4 mr-2" /> Data Validation
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onConditionalFormat({ operator: 'gt', value: '100', style: { backgroundColor: '#fee2e2', textColor: '#dc2626' } })}>
              <Palette className="h-4 w-4 mr-2" /> Conditional Format
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={onToggleProtectSheet}>
              {isSheetProtected ? <Unlock className="h-4 w-4 mr-2" /> : <Lock className="h-4 w-4 mr-2" />}
              {isSheetProtected ? 'Unprotect Sheet' : 'Protect Sheet'}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onLock(true)}><Lock className="h-4 w-4 mr-2" />Lock Selected Cells</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        
        <div className="ml-auto flex items-center gap-4">
          <DropdownMenu>
            <DropdownMenuTrigger className="text-primary flex items-center gap-1.5 hover:opacity-100 cursor-pointer transition-colors px-1 outline-none">
              <Sparkles className="h-3 w-3" />
              EAGLE AI <ChevronDown className="h-2 w-2" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[200px]">
              <DropdownMenuItem onSelect={onAI}>
                <Sparkles className="h-4 w-4 mr-2" /> Formula Assistant
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger className="text-muted-foreground flex items-center gap-1.5 hover:text-primary cursor-pointer transition-colors px-1 outline-none">
              <HelpCircle className="h-3 w-3" />
              Help <ChevronDown className="h-2 w-2" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[220px]">
              <DropdownMenuItem onSelect={onHelp}>
                <BookOpen className="h-4 w-4 mr-2" /> Documentation & Shortcuts
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="flex items-center gap-2 p-2 px-4 overflow-x-auto scrollbar-hide">
        <div className="flex items-center gap-1 pr-4 border-r border-border shrink-0">
          <LayoutGrid className="h-4 w-4 text-primary/60 mr-1" />
          <input
            value={localName}
            onChange={(e) => setLocalName(e.target.value)}
            onBlur={handleNameCommit}
            onKeyDown={(e) => e.key === 'Enter' && handleNameCommit()}
            className="bg-transparent border-none font-semibold text-primary focus:ring-0 text-base w-48 outline-none truncate"
            placeholder="EAGLESpreadSheet"
          />
        </div>

        <TooltipProvider>
          <div className="flex items-center gap-0.5 shrink-0">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onFormat('currency')}><CircleDollarSign className="h-4 w-4" /></Button>
              </TooltipTrigger>
              <TooltipContent>Currency Format</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onFormat('percent')}><Percent className="h-4 w-4" /></Button>
              </TooltipTrigger>
              <TooltipContent>Percent Format</TooltipContent>
            </Tooltip>
            
            <Separator orientation="vertical" className="h-6 mx-1 shrink-0" />

            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Palette className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="min-w-[140px]">
                    <div className="px-2 py-1.5 text-[10px] font-bold text-muted-foreground uppercase">Background</div>
                    {BG_COLORS.map((color) => (
                      <DropdownMenuItem key={color.name} onSelect={() => onBgColor(color.value)}>
                        <div className="flex items-center gap-2 w-full">
                          <div className="h-3 w-3 rounded-full border" style={{ backgroundColor: color.value || 'white' }} />
                          <span className="text-xs">{color.name}</span>
                        </div>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TooltipTrigger>
              <TooltipContent>Cell Background</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <TypeIcon className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="min-w-[140px]">
                    <div className="px-2 py-1.5 text-[10px] font-bold text-muted-foreground uppercase">Text Color</div>
                    {TEXT_COLORS.map((color) => (
                      <DropdownMenuItem key={color.name} onSelect={() => onTextColor(color.value)}>
                        <div className="flex items-center gap-2 w-full">
                          <div className="h-3 w-3 rounded-full border" style={{ backgroundColor: color.value || 'black' }} />
                          <span className="text-xs" style={{ color: color.value }}>{color.name}</span>
                        </div>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TooltipTrigger>
              <TooltipContent>Text Color</TooltipContent>
            </Tooltip>
          </div>

          <Separator orientation="vertical" className="h-6 mx-1 shrink-0" />

          <div className="flex items-center gap-0.5 shrink-0">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onBold}><Bold className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onItalic}><Italic className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onUnderline}><Underline className="h-4 w-4" /></Button>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onWrapText}><WrapText className="h-4 w-4" /></Button>
              </TooltipTrigger>
              <TooltipContent>Toggle Text Wrapping</TooltipContent>
            </Tooltip>
            <Separator orientation="vertical" className="h-4 mx-1" />
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onAlign('left')}><AlignLeft className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onAlign('center')}><AlignCenter className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onAlign('right')}><AlignRight className="h-4 w-4" /></Button>
          </div>

          <Separator orientation="vertical" className="h-6 mx-1 shrink-0" />

          <div className="flex items-center gap-0.5 shrink-0">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onAddComment}><MessageSquarePlus className="h-4 w-4" /></Button>
              </TooltipTrigger>
              <TooltipContent>Insert Comment</TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>
      </div>
    </div>
  );
});

Toolbar.displayName = 'Toolbar';
