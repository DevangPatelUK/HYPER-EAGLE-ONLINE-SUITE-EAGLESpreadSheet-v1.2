'use client';

import React from 'react';
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
  BarChart3
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

export const Toolbar: React.FC<ToolbarProps> = ({
  onBold,
  onItalic,
  onUnderline,
  onWrapText,
  onAlign,
  onFormat,
  onBgColor,
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
  canUndo,
  canRedo,
  sheetName,
  onNameChange,
}) => {
  return (
    <div className="flex flex-col bg-white border-b border-border shadow-sm print:hidden">
      <div className="flex items-center gap-4 px-4 py-1 border-b bg-muted/30 text-[10px] font-bold text-muted-foreground uppercase tracking-widest select-none">
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-1 hover:text-primary cursor-pointer transition-colors px-1 outline-none">
            File <ChevronDown className="h-2 w-2" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-[200px]">
            <DropdownMenuItem onClick={onNew}><FilePlus className="h-4 w-4 mr-2" />New Sheet</DropdownMenuItem>
            <DropdownMenuItem onClick={onSave}><Save className="h-4 w-4 mr-2" />Save Workbook</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onPrint}><Printer className="h-4 w-4 mr-2" />Print Settings</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onDelete} className="text-destructive"><Trash2 className="h-4 w-4 mr-2" />Delete Active Sheet</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-1 hover:text-primary cursor-pointer transition-colors px-1 outline-none">
            Edit <ChevronDown className="h-2 w-2" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-[200px]">
            <DropdownMenuItem onClick={onUndo} disabled={!canUndo}><Undo className="h-4 w-4 mr-2" />Undo (Ctrl+Z)</DropdownMenuItem>
            <DropdownMenuItem onClick={onRedo} disabled={!canRedo}><Redo className="h-4 w-4 mr-2" />Redo (Ctrl+Y)</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onInsertRow}><Rows className="h-4 w-4 mr-2" />Insert Row (Ctrl+Shift++)</DropdownMenuItem>
            <DropdownMenuItem onClick={onDeleteRow}><Trash2 className="h-4 w-4 mr-2" />Delete Row (Ctrl+-)</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onSort('asc')}><ChevronRight className="h-4 w-4 mr-2 rotate-[-90deg]" />Sort Ascending</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onSort('desc')}><ChevronRight className="h-4 w-4 mr-2 rotate-[90deg]" />Sort Descending</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onClear}><Eraser className="h-4 w-4 mr-2" />Clear Selection (Del)</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-1 hover:text-primary cursor-pointer transition-colors px-1 outline-none">
            View <ChevronDown className="h-2 w-2" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-[200px]">
            <DropdownMenuItem onClick={() => onFreezeRows(1)}><PanelTop className="h-4 w-4 mr-2" />Freeze Top Row</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onFreezeCols(1)}><PanelLeft className="h-4 w-4 mr-2" />Freeze First Column</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onFreezeRows(0)}><Undo className="h-4 w-4 mr-2" />Unfreeze All</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onHideRows}><EyeOff className="h-4 w-4 mr-2" />Hide Selected Rows</DropdownMenuItem>
            <DropdownMenuItem onClick={onHideCols}><EyeOff className="h-4 w-4 mr-2" />Hide Selected Cols</DropdownMenuItem>
            <DropdownMenuItem onClick={onUnhideAll}><Eye className="h-4 w-4 mr-2" />Unhide All</DropdownMenuItem>
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
                <DropdownMenuItem onClick={() => onAddChart('bar')}>Bar Chart</DropdownMenuItem>
                <DropdownMenuItem onClick={() => onAddChart('line')}>Line Chart</DropdownMenuItem>
                <DropdownMenuItem onClick={() => onAddChart('area')}>Area Chart</DropdownMenuItem>
                <DropdownMenuItem onClick={() => onAddChart('pie')}>Pie Chart</DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuItem onClick={onToggleProtectSheet}>
              {isSheetProtected ? <Unlock className="h-4 w-4 mr-2" /> : <Lock className="h-4 w-4 mr-2" />}
              {isSheetProtected ? 'Unprotect Sheet' : 'Protect Sheet'}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onLock(true)}><Lock className="h-4 w-4 mr-2" />Lock Cells</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        
        <div className="ml-auto flex items-center gap-4">
          <DropdownMenu>
            <DropdownMenuTrigger className="text-primary flex items-center gap-1.5 hover:opacity-100 cursor-pointer transition-colors px-1 outline-none">
              <Sparkles className="h-3 w-3" />
              EAGLE AI <ChevronDown className="h-2 w-2" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[200px]">
              <DropdownMenuItem onClick={onAI}>
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
              <DropdownMenuItem onClick={onHelp}>
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
            value={sheetName}
            onChange={(e) => onNameChange(e.target.value)}
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
              <TooltipContent>Format as Currency</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onFormat('percent')}><Percent className="h-4 w-4" /></Button>
              </TooltipTrigger>
              <TooltipContent>Format as Percent</TooltipContent>
            </Tooltip>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Palette className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="grid grid-cols-4 gap-1 p-2 w-32">
                {BG_COLORS.map((color) => (
                  <DropdownMenuItem 
                    key={color.name} 
                    className="p-0 h-6 w-6 rounded border cursor-pointer hover:scale-110 transition-transform" 
                    style={{ backgroundColor: color.value || 'white' }} 
                    onClick={() => onBgColor(color.value)} 
                  />
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
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
              <TooltipContent>Wrap Text</TooltipContent>
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
              <TooltipContent>Add Comment</TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>
      </div>
    </div>
  );
};
