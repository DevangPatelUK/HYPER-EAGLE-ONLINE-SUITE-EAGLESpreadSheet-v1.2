'use client';

import React from 'react';
import { Bold, AlignLeft, AlignCenter, AlignRight, FilePlus, Save, Trash2, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ToolbarProps {
  onBold: () => void;
  onAlign: (align: 'left' | 'center' | 'right') => void;
  onNew: () => void;
  onSave: () => void;
  onDelete: () => void;
  onAI: () => void;
  sheetName: string;
  onNameChange: (name: string) => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  onBold,
  onAlign,
  onNew,
  onSave,
  onDelete,
  onAI,
  sheetName,
  onNameChange,
}) => {
  return (
    <div className="flex items-center gap-2 p-2 bg-white border-b border-border shadow-sm">
      <div className="flex items-center gap-1 px-2 border-r pr-4">
        <input
          value={sheetName}
          onChange={(e) => onNameChange(e.target.value)}
          className="bg-transparent border-none font-semibold text-primary focus:ring-0 text-lg w-48 outline-none"
          placeholder="Sheet Name"
        />
      </div>

      <TooltipProvider>
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={onNew}><FilePlus className="h-4 w-4" /></Button>
            </TooltipTrigger>
            <TooltipContent>New Sheet</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={onSave}><Save className="h-4 w-4" /></Button>
            </TooltipTrigger>
            <TooltipContent>Save Changes</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="text-destructive" onClick={onDelete}><Trash2 className="h-4 w-4" /></Button>
            </TooltipTrigger>
            <TooltipContent>Delete Sheet</TooltipContent>
          </Tooltip>
        </div>

        <Separator orientation="vertical" className="h-6 mx-2" />

        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={onBold}><Bold className="h-4 w-4" /></Button>
            </TooltipTrigger>
            <TooltipContent>Bold</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={() => onAlign('left')}><AlignLeft className="h-4 w-4" /></Button>
            </TooltipTrigger>
            <TooltipContent>Align Left</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={() => onAlign('center')}><AlignCenter className="h-4 w-4" /></Button>
            </TooltipTrigger>
            <TooltipContent>Align Center</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={() => onAlign('right')}><AlignRight className="h-4 w-4" /></Button>
            </TooltipTrigger>
            <TooltipContent>Align Right</TooltipContent>
          </Tooltip>
        </div>

        <Separator orientation="vertical" className="h-6 mx-2" />

        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" className="gap-2 text-accent border-accent hover:bg-accent/10" onClick={onAI}>
            <Wand2 className="h-4 w-4" />
            AI Assistant
          </Button>
        </div>
      </TooltipProvider>
    </div>
  );
};
