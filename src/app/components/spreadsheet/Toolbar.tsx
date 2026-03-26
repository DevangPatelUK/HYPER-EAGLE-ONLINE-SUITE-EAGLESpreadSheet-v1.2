'use client';

import React, { useRef } from 'react';
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
  Wand2, 
  Undo, 
  Redo, 
  LayoutGrid, 
  Palette,
  CircleDollarSign,
  Percent,
  Hash,
  Download,
  Upload,
  FileJson,
  FileSpreadsheet,
  ChevronDown,
  Rows,
  Columns,
  Eraser,
  ArrowDownAZ,
  ArrowUpAZ,
  Copy,
  Type,
  Calendar,
  CheckSquare,
  ListFilter,
  LetterText,
  Combine,
  Split,
  EyeOff,
  Eye,
  Sparkles,
  Filter,
  FilterX,
  PanelTop,
  PanelLeft,
  Layout,
  MessageSquarePlus,
  Zap,
  ShieldCheck,
  Lock,
  Unlock,
  Shield
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
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuCheckboxItem
} from "@/components/ui/dropdown-menu";
import { ValidationRule, ConditionalFormatRule } from '@/app/lib/formula-engine';

interface ToolbarProps {
  onBold: () => void;
  onItalic: () => void;
  onUnderline: () => void;
  onAlign: (align: 'left' | 'center' | 'right') => void;
  onFormat: (format: 'number' | 'currency' | 'percent' | 'text') => void;
  onType: (type: 'text' | 'number' | 'date' | 'checkbox' | 'select', options?: string[]) => void;
  onBgColor: (color: string) => void;
  onTextColor: (color: string) => void;
  onNew: () => void;
  onSave: () => void;
  onDelete: () => void;
  onAI: () => void;
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
  onImportCSV: (file: File) => void;
  onExportCSV: () => void;
  onExportJSON: () => void;
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
  { name: 'Red', value: '#fee2e2' },
  { name: 'Orange', value: '#ffedd5' },
  { name: 'Yellow', value: '#fef9c3' },
  { name: 'Green', value: '#dcfce7' },
  { name: 'Blue', value: '#dbeafe' },
  { name: 'Purple', value: '#f3e8ff' },
  { name: 'Pink', value: '#fce7f3' },
];

const TEXT_COLORS = [
  { name: 'Black', value: '#000000' },
  { name: 'White', value: '#ffffff' },
  { name: 'Red', value: '#dc2626' },
  { name: 'Blue', value: '#2563eb' },
  { name: 'Green', value: '#16a34a' },
  { name: 'Gray', value: '#4b5563' },
];

export const Toolbar: React.FC<ToolbarProps> = ({
  onBold,
  onItalic,
  onUnderline,
  onAlign,
  onFormat,
  onType,
  onBgColor,
  onTextColor,
  onNew,
  onSave,
  onDelete,
  onAI,
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
  onSort,
  onFilter,
  onClearFilters,
  onMerge,
  onUnmerge,
  onImportCSV,
  onExportCSV,
  onExportJSON,
  onAddComment,
  onValidation,
  onConditionalFormat,
  onLock,
  onToggleProtectSheet,
  isSheetProtected,
  canUndo,
  canRedo,
  sheetName,
  onNameChange,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImportClick = () => fileInputRef.current?.click();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImportCSV(file);
      e.target.value = '';
    }
  };

  const promptDropdownOptions = () => {
    const input = window.prompt("Enter options separated by commas (e.g. Yes,No,Maybe)");
    if (input) {
      onType('select', input.split(',').map(s => s.trim()));
    }
  };

  const promptFilter = (op: 'contains' | 'gt' | 'lt' | 'eq') => {
    const val = window.prompt(`Enter value for filter (${op}):`);
    if (val !== null) {
      onFilter(op, val);
    }
  };

  const promptValidation = (type: 'number') => {
    const minStr = window.prompt("Minimum value (optional):");
    const maxStr = window.prompt("Maximum value (optional):");
    const min = minStr ? parseFloat(minStr) : undefined;
    const max = maxStr ? parseFloat(maxStr) : undefined;
    onValidation({ type, min, max, allowEmpty: true });
  };

  const promptConditionalFormatting = (op: 'lt' | 'gt' | 'eq') => {
    const val = window.prompt(`Format cell if value ${op} than:`);
    if (val === null) return;
    
    onConditionalFormat({
      operator: op,
      value: val,
      style: { backgroundColor: '#fee2e2', textColor: '#dc2626', bold: true }
    });
  };

  return (
    <div className="flex flex-col bg-white border-b border-border shadow-sm">
      <input type="file" ref={fileInputRef} className="hidden" accept=".csv" onChange={handleFileChange} />
      
      <div className="flex items-center gap-4 px-4 py-1 border-b bg-muted/30 text-[10px] font-bold text-muted-foreground uppercase tracking-widest select-none">
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-1 hover:text-primary cursor-pointer transition-colors px-1 outline-none">
            File <ChevronDown className="h-2 w-2" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-[200px]">
            <DropdownMenuItem onClick={onNew}><FilePlus className="h-4 w-4 mr-2" />New Sheet</DropdownMenuItem>
            <DropdownMenuItem onClick={onSave}><Save className="h-4 w-4 mr-2" />Save Workbook</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleImportClick}><Upload className="h-4 w-4 mr-2" />Import CSV</DropdownMenuItem>
            <DropdownMenuItem onClick={onExportCSV}><FileSpreadsheet className="h-4 w-4 mr-2" />Export as CSV</DropdownMenuItem>
            <DropdownMenuItem onClick={onExportJSON}><FileJson className="h-4 w-4 mr-2" />Export as JSON</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onDelete} className="text-destructive"><Trash2 className="h-4 w-4 mr-2" />Delete Active Sheet</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-1 hover:text-primary cursor-pointer transition-colors px-1 outline-none">
            Edit <ChevronDown className="h-2 w-2" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-[200px]">
            <DropdownMenuItem onClick={onUndo} disabled={!canUndo}><Undo className="h-4 w-4 mr-2" />Undo</DropdownMenuItem>
            <DropdownMenuItem onClick={onRedo} disabled={!canRedo}><Redo className="h-4 w-4 mr-2" />Redo</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onClear}><Eraser className="h-4 w-4 mr-2" />Clear Selection</DropdownMenuItem>
            <DropdownMenuItem onClick={onDeleteRow}><Rows className="h-4 w-4 mr-2" />Delete Selected Row</DropdownMenuItem>
            <DropdownMenuItem onClick={onDeleteCol}><Columns className="h-4 w-4 mr-2" />Delete Selected Col</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onHideRows}><EyeOff className="h-4 w-4 mr-2" />Hide Selected Rows</DropdownMenuItem>
            <DropdownMenuItem onClick={onHideCols}><EyeOff className="h-4 w-4 mr-2" />Hide Selected Cols</DropdownMenuItem>
            <DropdownMenuItem onClick={onUnhideAll}><Eye className="h-4 w-4 mr-2" />Unhide All</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onMerge}><Combine className="h-4 w-4 mr-2" />Merge Selection</DropdownMenuItem>
            <DropdownMenuItem onClick={onUnmerge}><Split className="h-4 w-4 mr-2" />Unmerge Selection</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onAddComment}><MessageSquarePlus className="h-4 w-4 mr-2" />Add Comment</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-1 hover:text-primary cursor-pointer transition-colors px-1 outline-none">
            View <ChevronDown className="h-2 w-2" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-[200px]">
            <DropdownMenuItem onClick={() => onFreezeRows(1)}><PanelTop className="h-4 w-4 mr-2" />Freeze Top Row</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onFreezeCols(1)}><PanelLeft className="h-4 w-4 mr-2" />Freeze First Column</DropdownMenuItem>
            <DropdownMenuItem onClick={() => { onFreezeRows(0); onFreezeCols(0); }}><Layout className="h-4 w-4 mr-2" />Unfreeze All</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-1 hover:text-primary cursor-pointer transition-colors px-1 outline-none">
            Insert <ChevronDown className="h-2 w-2" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-[200px]">
            <DropdownMenuItem onClick={onInsertRow}><Rows className="h-4 w-4 mr-2" />Row Below</DropdownMenuItem>
            <DropdownMenuItem onClick={onInsertCol}><Columns className="h-4 w-4 mr-2" />Column Right</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-1 hover:text-primary cursor-pointer transition-colors px-1 outline-none">
            Format <ChevronDown className="h-2 w-2" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-[200px]">
            <DropdownMenuItem onClick={onBold}><Bold className="h-4 w-4 mr-2" />Bold</DropdownMenuItem>
            <DropdownMenuItem onClick={onItalic}><Italic className="h-4 w-4 mr-2" />Italic</DropdownMenuItem>
            <DropdownMenuItem onClick={onUnderline}><Underline className="h-4 w-4 mr-2" />Underline</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuSub>
              <DropdownMenuSubTrigger><Palette className="h-4 w-4 mr-2" />Text Color</DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="grid grid-cols-3 gap-1 p-2">
                {TEXT_COLORS.map(c => (
                  <div key={c.value} onClick={() => onTextColor(c.value)} className="h-6 w-6 rounded cursor-pointer border border-border" style={{ backgroundColor: c.value }} />
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSeparator />
            <DropdownMenuSub>
              <DropdownMenuSubTrigger><LayoutGrid className="h-4 w-4 mr-2" />Cell Type</DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="min-w-[150px]">
                <DropdownMenuItem onClick={() => onType('text')}><LetterText className="h-4 w-4 mr-2" />Text</DropdownMenuItem>
                <DropdownMenuItem onClick={() => onType('number')}><Hash className="h-4 w-4 mr-2" />Number</DropdownMenuItem>
                <DropdownMenuItem onClick={() => onType('date')}><Calendar className="h-4 w-4 mr-2" />Date</DropdownMenuItem>
                <DropdownMenuItem onClick={() => onType('checkbox')}><CheckSquare className="h-4 w-4 mr-2" />Checkbox</DropdownMenuItem>
                <DropdownMenuItem onClick={promptDropdownOptions}><ListFilter className="h-4 w-4 mr-2" />Dropdown List</DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSeparator />
            <DropdownMenuSub>
              <DropdownMenuSubTrigger><Zap className="h-4 w-4 mr-2" />Conditional Formatting</DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="min-w-[180px]">
                <DropdownMenuItem onClick={() => promptConditionalFormatting('lt')}>Less Than...</DropdownMenuItem>
                <DropdownMenuItem onClick={() => promptConditionalFormatting('gt')}>Greater Than...</DropdownMenuItem>
                <DropdownMenuItem onClick={() => promptConditionalFormatting('eq')}>Equals...</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onConditionalFormat(undefined)}>Clear Formatting Rules</DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-1 hover:text-primary cursor-pointer transition-colors px-1 outline-none">
            Data <ChevronDown className="h-2 w-2" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-[200px]">
            <DropdownMenuItem onClick={() => onSort('asc')}><ArrowDownAZ className="h-4 w-4 mr-2" />Sort A-Z</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onSort('desc')}><ArrowUpAZ className="h-4 w-4 mr-2" />Sort Z-A</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuSub>
              <DropdownMenuSubTrigger><Filter className="h-4 w-4 mr-2" />Filter Selection</DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="min-w-[150px]">
                <DropdownMenuItem onClick={() => promptFilter('contains')}>Contains...</DropdownMenuItem>
                <DropdownMenuItem onClick={() => promptFilter('eq')}>Equals...</DropdownMenuItem>
                <DropdownMenuItem onClick={() => promptFilter('gt')}>Greater Than...</DropdownMenuItem>
                <DropdownMenuItem onClick={() => promptFilter('lt')}>Less Than...</DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuItem onClick={onClearFilters}><FilterX className="h-4 w-4 mr-2" />Clear Filters</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuSub>
              <DropdownMenuSubTrigger><ShieldCheck className="h-4 w-4 mr-2" />Data Validation</DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="min-w-[150px]">
                <DropdownMenuItem onClick={() => promptValidation('number')}>Numbers Only...</DropdownMenuItem>
                <DropdownMenuItem onClick={() => onValidation({ type: 'date', allowEmpty: true })}>Dates Only</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onValidation(undefined)}>Remove Validation</DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSeparator />
            <DropdownMenuSub>
              <DropdownMenuSubTrigger><Shield className="h-4 w-4 mr-2" />Protection</DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="min-w-[180px]">
                <DropdownMenuItem onClick={() => onLock(true)}><Lock className="h-4 w-4 mr-2" />Lock Selection</DropdownMenuItem>
                <DropdownMenuItem onClick={() => onLock(false)}><Unlock className="h-4 w-4 mr-2" />Unlock Selection</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuCheckboxItem checked={isSheetProtected} onCheckedChange={onToggleProtectSheet}>
                  Protect Sheet (Read-Only)
                </DropdownMenuCheckboxItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </DropdownMenuContent>
        </DropdownMenu>
        
        <DropdownMenu>
          <DropdownMenuTrigger className="ml-auto text-accent flex items-center gap-1.5 hover:opacity-100 cursor-pointer transition-colors px-1 outline-none">
            <Wand2 className="h-3 w-3" />
            AI Toolbox <ChevronDown className="h-2 w-2" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[200px]">
            <DropdownMenuItem onClick={onAI}>
              <Sparkles className="h-4 w-4 mr-2" /> AI Formula Assistant
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex items-center gap-2 p-2 px-4 overflow-x-auto scrollbar-hide">
        <div className="flex items-center gap-1 pr-4 border-r border-border shrink-0">
          <LayoutGrid className="h-4 w-4 text-primary/60 mr-1" />
          <input
            value={sheetName}
            onChange={(e) => onNameChange(e.target.value)}
            className="bg-transparent border-none font-semibold text-primary focus:ring-0 text-base w-40 outline-none truncate"
            placeholder="Untitled Sheet"
          />
        </div>

        <TooltipProvider>
          <div className="flex items-center gap-0.5 shrink-0">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onUndo} disabled={!canUndo}><Undo className="h-4 w-4" /></Button>
              </TooltipTrigger>
              <TooltipContent>Undo</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onUndo} disabled={!canRedo}><Redo className="h-4 w-4" /></Button>
              </TooltipTrigger>
              <TooltipContent>Redo</TooltipContent>
            </Tooltip>
          </div>

          <Separator orientation="vertical" className="h-6 mx-1 shrink-0" />

          <div className="flex items-center gap-0.5 shrink-0">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onFormat('currency')}><CircleDollarSign className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onFormat('percent')}><Percent className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onFormat('number')}><Hash className="h-4 w-4" /></Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><Palette className="h-4 w-4" /></Button></DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="grid grid-cols-4 gap-1 p-2 w-32">
                {BG_COLORS.map((color) => (
                  <DropdownMenuItem key={color.name} className="p-0 h-6 w-6 rounded border cursor-pointer" style={{ backgroundColor: color.value || 'white' }} onClick={() => onBgColor(color.value)} />
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><Type className="h-4 w-4" /></Button></DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="grid grid-cols-3 gap-1 p-2 w-32">
                {TEXT_COLORS.map((color) => (
                  <DropdownMenuItem key={color.name} className="p-0 h-6 w-6 rounded border cursor-pointer" style={{ backgroundColor: color.value }} onClick={() => onTextColor(color.value)} />
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <Separator orientation="vertical" className="h-6 mx-1 shrink-0" />

          <div className="flex items-center gap-0.5 shrink-0">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onBold}><Bold className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onItalic}><Italic className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onUnderline}><Underline className="h-4 w-4" /></Button>
            <Separator orientation="vertical" className="h-4 mx-1" />
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onAlign('left')}><AlignLeft className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onAlign('center')}><AlignCenter className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onAlign('right')}><AlignRight className="h-4 w-4" /></Button>
          </div>

          <Separator orientation="vertical" className="h-6 mx-1 shrink-0" />

          <div className="flex items-center gap-0.5 shrink-0">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onMerge}><Combine className="h-4 w-4" /></Button>
              </TooltipTrigger>
              <TooltipContent>Merge Cells</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onUnmerge}><Split className="h-4 w-4" /></Button>
              </TooltipTrigger>
              <TooltipContent>Unmerge Cells</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onAddComment}><MessageSquarePlus className="h-4 w-4" /></Button>
              </TooltipTrigger>
              <TooltipContent>Add Comment</TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>
      </div>
    </div>
  );
};
