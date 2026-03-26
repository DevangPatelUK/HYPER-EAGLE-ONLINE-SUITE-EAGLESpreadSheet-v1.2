'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Printer, Layout, Move, Type, Check } from 'lucide-react';
import { PrintSettings } from '@/app/lib/formula-engine';

interface PrintSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: PrintSettings;
  onUpdateSettings: (settings: PrintSettings) => void;
  onPrint: () => void;
}

export const PrintSettingsDialog: React.FC<PrintSettingsProps> = ({
  open,
  onOpenChange,
  settings,
  onUpdateSettings,
  onPrint,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5 text-primary" />
            Print Settings & Layout
          </DialogTitle>
          <DialogDescription>
            Configure how your spreadsheet will appear when printed or exported as PDF.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Orientation & Margins */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Layout className="h-4 w-4" />
                Orientation
              </Label>
              <Select
                value={settings.orientation}
                onValueChange={(val: any) => onUpdateSettings({ ...settings, orientation: val })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="portrait">Portrait</SelectItem>
                  <SelectItem value="landscape">Landscape</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Move className="h-4 w-4" />
                Margins
              </Label>
              <Select
                value={settings.margins}
                onValueChange={(val: any) => onUpdateSettings({ ...settings, margins: val })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="narrow">Narrow</SelectItem>
                  <SelectItem value="wide">Wide</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Header & Footer Text */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Type className="h-4 w-4" />
                Header Text
              </Label>
              <Input
                placeholder="Document title, date, etc."
                value={settings.headerText || ''}
                onChange={(e) => onUpdateSettings({ ...settings, headerText: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Type className="h-4 w-4" />
                Footer Text
              </Label>
              <Input
                placeholder="Page numbers, company name, etc."
                value={settings.footerText || ''}
                onChange={(e) => onUpdateSettings({ ...settings, footerText: e.target.value })}
              />
            </div>
          </div>

          {/* Toggles */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Show Gridlines</Label>
                <p className="text-xs text-muted-foreground">Include cell borders in printout</p>
              </div>
              <Switch
                checked={settings.showGridlines}
                onCheckedChange={(val) => onUpdateSettings({ ...settings, showGridlines: val })}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Show Row/Col Headers</Label>
                <p className="text-xs text-muted-foreground">Include A, B, C... and 1, 2, 3...</p>
              </div>
              <Switch
                checked={settings.showHeaders}
                onCheckedChange={(val) => onUpdateSettings({ ...settings, showHeaders: val })}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={onPrint} className="gap-2">
            <Printer className="h-4 w-4" />
            Print Preview
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
