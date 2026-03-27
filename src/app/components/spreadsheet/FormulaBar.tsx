'use client';

import React, { useState } from 'react';
import { Sigma } from 'lucide-react';
import { FormulaAutocomplete } from './FormulaAutocomplete';

interface FormulaBarProps {
  selectedCoord: string | null;
  formula: string;
  onChange: (val: string) => void;
}

export const FormulaBar: React.FC<FormulaBarProps> = ({ selectedCoord, formula, onChange }) => {
  const [showAutocomplete, setShowAutocomplete] = useState(false);

  const handleSelect = (s: string) => {
    const lastSpecialChar = formula.split(/[(),+\-*/]/).pop()?.length || 0;
    const prefix = formula.slice(0, formula.length - lastSpecialChar);
    onChange(`${prefix}${s}(`);
    setShowAutocomplete(false);
  };

  return (
    <div className="flex items-center bg-background border-b border-border p-1 gap-2 transition-colors duration-300">
      <div className="w-12 h-8 flex items-center justify-center bg-secondary/50 rounded text-xs font-bold text-muted-foreground border border-border">
        {selectedCoord || ''}
      </div>
      <div className="flex items-center px-2 text-primary">
        <Sigma className="h-4 w-4" />
      </div>
      <div className="flex-1 relative">
        <input
          value={formula}
          onChange={(e) => {
            onChange(e.target.value);
            setShowAutocomplete(e.target.value.startsWith('='));
          }}
          className="w-full h-8 px-2 focus:ring-1 focus:ring-primary focus:outline-none bg-background rounded border border-border/50 text-sm"
          placeholder="Enter value or formula (e.g., =SUM(A1:A10))"
        />
        <FormulaAutocomplete 
          inputValue={formula} 
          isOpen={showAutocomplete} 
          onSelect={handleSelect} 
          onClose={() => setShowAutocomplete(false)}
        />
      </div>
    </div>
  );
};