'use client';

import React from 'react';
import { 
  Bold, 
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
  Type, 
  Search,
  CircleDollarSign,
  Percent,
  Hash,
  Palette
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
} from "@/components/ui/dropdown-menu";

interface ToolbarProps {
  onBold: () => void;
  onAlign: (align: 'left' | 'center' | 'right') => void;
  onFormat: (format: 'number' | 'currency' | 'percent' | 'text') => void;
  onBgColor: (color: string) => void;
  onNew: () => void;
  onSave: () => void;
  onDelete: () => void;
  onAI: () => void;
  sheetName: string;
  onNameChange: (name: string) => void;
}

const COLORS = [
  { name: 'None', value: '' },
  { name: 'Red', value: '#fee2e2' },
  { name: 'Orange', value: '#ffedd5' },
  { name: 'Yellow', value: '#fef9c3' },
  { name: 'Green', value: '#dcfce7' },
  { name: 'Blue', value: '#dbeafe' },
  { name: 'Purple', value: '#f3e8ff' },
  { name: 'Pink', value: '#fce7f3' },
];

export const Toolbar: React.FC<ToolbarProps> = ({
  onBold,
  onAlign,
  onFormat,
  onBgColor,
  onNew,
  onSave,
  onDelete,
  onAI,
  sheetName,
  onNameChange,
}) => {
  return (
    <div className="flex flex-col bg-white border-b border-border shadow-sm">
      <div className="flex items-center gap-4 px-4 py-1.5 border-b bg-muted/30 text-[10px] font-bold text-muted-foreground uppercase tracking-widest select-none">
        <span className="hover:text-primary cursor-pointer transition-colors px-1">File</span>
        <span className="hover:text-primary cursor-pointer transition-colors px-1">Edit</span>
        <span className="hover:text-primary cursor-pointer transition-colors px-1">Insert</span>
        <span className="hover:text-primary cursor-pointer transition-colors px-1">Format</span>
        <span className="hover:text-primary cursor-pointer transition-colors px-1">Data</span>
        <span className="ml-auto text-accent flex items-center gap-1.5 opacity-80">
          <Wand2 className="h-3 w-3" />
          AI Toolbox
        </span>
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
                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/10 hover:text-primary" onClick={onNew}>
                  <FilePlus className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>New Sheet</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/10 hover:text-primary" onClick={onSave}>
                  <Save className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Save Sheet</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={onDelete}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Delete Sheet</TooltipContent>
            </Tooltip>
          </div>

          <Separator orientation="vertical" className="h-6 mx-1 shrink-0" />

          <div className="flex items-center gap-0.5 shrink-0">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onFormat('currency')}>
                  <CircleDollarSign className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Format as Currency</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onFormat('percent')}>
                  <Percent className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Format as Percentage</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onFormat('number')}>
                  <Hash className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Format as Number</TooltipContent>
            </Tooltip>
            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Palette className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent>Cell Background Color</TooltipContent>
              </Tooltip>
              <DropdownMenuContent align="start" className="grid grid-cols-4 gap-1 p-2 w-32">
                {COLORS.map((color) => (
                  <DropdownMenuItem
                    key={color.name}
                    className="p-0 h-6 w-6 rounded border border-border cursor-pointer hover:scale-110 transition-transform"
                    style={{ backgroundColor: color.value || 'white' }}
                    onClick={() => onBgColor(color.value)}
                  >
                    <span className="sr-only">{color.name}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <Separator orientation="vertical" className="h-6 mx-1 shrink-0" />

          <div className="flex items-center gap-0.5 shrink-0">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onBold}>
                  <Bold className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Bold</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onAlign('left')}>
                  <AlignLeft className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Align Left</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onAlign('center')}>
                  <AlignCenter className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Align Center</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onAlign('right')}>
                  <AlignRight className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Align Right</TooltipContent>
            </Tooltip>
          </div>

          <div className="flex-1" />

          <div className="flex items-center shrink-0">
            <Button 
              variant="outline" 
              size="sm" 
              className="h-8 gap-2 bg-accent/5 text-accent border-accent/20 hover:bg-accent hover:text-white transition-all shadow-sm"
              onClick={onAI}
            >
              <Wand2 className="h-3.5 w-3.5" />
              AI Assistant
            </Button>
          </div>
        </TooltipProvider>
      </div>
    </div>
  );
};
