'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { SUPPORTED_FUNCTIONS } from '@/app/lib/formula-engine';
import { cn } from '@/lib/utils';

interface FormulaAutocompleteProps {
  inputValue: string;
  onSelect: (formula: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const FormulaAutocomplete: React.FC<FormulaAutocompleteProps> = ({
  inputValue,
  onSelect,
  isOpen,
  onClose,
}) => {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (!inputValue.startsWith('=')) {
      setSuggestions([]);
      return;
    }

    // Find the part we are currently typing (after the last operator or opening paren)
    const match = inputValue.match(/([A-Z]+)$|([A-Z]+)\($/i);
    const searchPart = match ? match[1] || match[2] : '';
    
    // Also support checking after last special char
    const lastWord = inputValue.split(/[(),+\-*/]/).pop()?.toUpperCase() || '';
    const query = lastWord.startsWith('=') ? lastWord.slice(1) : lastWord;

    if (query) {
      const filtered = SUPPORTED_FUNCTIONS.filter(f => f.startsWith(query));
      setSuggestions(filtered);
      setSelectedIndex(0);
    } else {
      setSuggestions([]);
    }
  }, [inputValue]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isOpen || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      setSelectedIndex(prev => (prev + 1) % suggestions.length);
      e.preventDefault();
    } else if (e.key === 'ArrowUp') {
      setSelectedIndex(prev => (prev - 1 + suggestions.length) % suggestions.length);
      e.preventDefault();
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      onSelect(suggestions[selectedIndex]);
      e.preventDefault();
      e.stopPropagation();
    } else if (e.key === 'Escape') {
      onClose();
      e.preventDefault();
    }
  }, [isOpen, suggestions, selectedIndex, onSelect, onClose]);

  useEffect(() => {
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown, true);
    }
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, handleKeyDown]);

  if (!isOpen || suggestions.length === 0) return null;

  return (
    <div className="absolute left-0 top-full mt-1 w-48 bg-white border border-border shadow-xl rounded-md z-[100] max-h-60 overflow-y-auto animate-in fade-in zoom-in-95 duration-100">
      <div className="p-1">
        <div className="px-2 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-widest border-b border-border mb-1">
          Formula Suggestions
        </div>
        {suggestions.map((s, i) => (
          <div
            key={s}
            onClick={() => onSelect(s)}
            className={cn(
              "px-3 py-1.5 text-xs font-mono cursor-pointer rounded transition-colors flex justify-between items-center",
              i === selectedIndex ? "bg-primary text-white" : "hover:bg-secondary text-primary"
            )}
          >
            <span>{s}</span>
            <span className={cn("text-[10px]", i === selectedIndex ? "text-white/70" : "text-muted-foreground")}>Function</span>
          </div>
        ))}
      </div>
    </div>
  );
};
