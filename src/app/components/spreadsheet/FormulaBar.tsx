'use client';

import React from 'react';
import { Sigma } from 'lucide-react';

interface FormulaBarProps {
  selectedCoord: string | null;
  formula: string;
  onChange: (val: string) => void;
}

export const FormulaBar: React.FC<FormulaBarProps> = ({ selectedCoord, formula, onChange }) => {
  return (
    <div className="flex items-center bg-white border-b border-border p-1 gap-2">
      <div className="w-12 h-8 flex items-center justify-center bg-secondary/50 rounded text-xs font-bold text-muted-foreground border border-border">
        {selectedCoord || ''}
      </div>
      <div className="flex items-center px-2 text-primary">
        <Sigma className="h-4 w-4" />
      </div>
      <input
        value={formula}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 h-8 px-2 focus:ring-1 focus:ring-primary focus:outline-none bg-background rounded border border-border/50 text-sm"
        placeholder="Enter value or formula (e.g., =SUM(A1:A10))"
      />
    </div>
  );
};
