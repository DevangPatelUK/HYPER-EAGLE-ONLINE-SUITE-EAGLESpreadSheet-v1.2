'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { HelpCircle, Calculator, Keyboard, Command } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface HelpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const HelpDialog: React.FC<HelpDialogProps> = ({ open, onOpenChange }) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] h-[80vh] flex flex-col p-0 overflow-hidden border-primary/20">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="flex items-center gap-2 text-xl text-primary font-bold">
            <HelpCircle className="h-6 w-6" />
            HYPER EAGLE Help Guide
          </DialogTitle>
          <DialogDescription>
            Master the EAGLESpreadSheet with our supported formulas and efficient keyboard shortcuts.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="formulas" className="flex-1 flex flex-col overflow-hidden px-6 pb-6">
          <TabsList className="grid w-full grid-cols-2 mb-4 bg-primary/5">
            <TabsTrigger value="formulas" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-white">
              <Calculator className="h-4 w-4" /> Formulas
            </TabsTrigger>
            <TabsTrigger value="shortcuts" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-white">
              <Keyboard className="h-4 w-4" /> Shortcuts
            </TabsTrigger>
          </TabsList>

          <TabsContent value="formulas" className="flex-1 overflow-hidden mt-0">
            <ScrollArea className="h-full pr-4">
              <div className="space-y-6">
                <section>
                  <h3 className="text-xs font-bold text-primary uppercase tracking-widest mb-3 opacity-70">Mathematical Functions</h3>
                  <div className="grid gap-4">
                    <FormulaItem 
                      name="SUM" 
                      usage="=SUM(A1:B10)" 
                      description="Adds all the numbers in a range of cells." 
                    />
                    <FormulaItem 
                      name="AVERAGE" 
                      usage="=AVERAGE(A1:A5)" 
                      description="Returns the average (arithmetic mean) of the arguments." 
                    />
                    <FormulaItem 
                      name="MIN / MAX" 
                      usage="=MIN(C1:C20)" 
                      description="Returns the smallest or largest value in a set of values." 
                    />
                    <FormulaItem 
                      name="ROUND" 
                      usage="=ROUND(A1, 2)" 
                      description="Rounds a number to a specified number of digits." 
                    />
                  </div>
                </section>

                <div className="p-4 bg-primary/5 rounded-lg text-xs text-muted-foreground border border-primary/10">
                  <strong>EAGLE TIP:</strong> Start all calculations with an equals sign (=).
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="shortcuts" className="flex-1 overflow-hidden mt-0">
            <ScrollArea className="h-full pr-4">
              <div className="space-y-6">
                <section>
                  <h3 className="text-xs font-bold text-primary uppercase tracking-widest mb-3 opacity-70">Navigation & Selection</h3>
                  <div className="grid gap-3">
                    <ShortcutItem keys={['Arrows']} description="Move active cell" />
                    <ShortcutItem keys={['Tab']} description="Move focus right" />
                    <ShortcutItem keys={['Enter']} description="Move focus down" />
                    <ShortcutItem keys={['Shift', 'Arrows']} description="Expand selection" />
                    <ShortcutItem keys={['Ctrl', 'Arrows']} description="Jump to boundaries" />
                  </div>
                </section>

                <section>
                  <h3 className="text-xs font-bold text-primary uppercase tracking-widest mb-3 opacity-70">Actions</h3>
                  <div className="grid gap-3">
                    <ShortcutItem keys={['Ctrl', 'C']} description="Copy selection" />
                    <ShortcutItem keys={['Ctrl', 'V']} description="Paste selection" />
                    <ShortcutItem keys={['Ctrl', 'Z']} description="Undo" />
                    <ShortcutItem keys={['Backspace']} description="Clear cell content" />
                  </div>
                </section>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

const FormulaItem = ({ name, usage, description }: { name: string; usage: string; description: string }) => (
  <div className="p-3 border border-border rounded-lg bg-primary/[0.02] hover:bg-primary/[0.04] transition-colors">
    <div className="flex items-center justify-between mb-1">
      <span className="font-mono font-bold text-primary">{name}</span>
      <code className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">{usage}</code>
    </div>
    <p className="text-xs text-muted-foreground">{description}</p>
  </div>
);

const ShortcutItem = ({ keys, description }: { keys: string[]; description: string }) => (
  <div className="flex items-center justify-between p-2 border-b border-border/50 last:border-0 hover:bg-muted/50 transition-colors rounded">
    <span className="text-xs text-muted-foreground">{description}</span>
    <div className="flex gap-1">
      {keys.map((key) => (
        <kbd key={key} className="flex items-center justify-center px-1.5 py-0.5 min-w-[20px] h-5 text-[9px] font-bold bg-muted border border-border shadow-sm rounded">
          {key}
        </kbd>
      ))}
    </div>
  </div>
);