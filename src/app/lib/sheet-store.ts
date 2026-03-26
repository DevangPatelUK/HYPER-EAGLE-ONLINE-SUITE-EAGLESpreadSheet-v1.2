'use client';

import { useState, useCallback } from 'react';
import { SpreadsheetData, evaluateFormula, indexToCoordinate } from './formula-engine';

export function useSheetStore(initialData: SpreadsheetData = {}) {
  const [data, setData] = useState<SpreadsheetData>(initialData);
  const [selectedCell, setSelectedCell] = useState<string | null>(null);
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [sheetName, setSheetName] = useState('Untitled Sheet');

  const updateCell = useCallback((coord: string, updates: Partial<SpreadsheetData[string]>) => {
    setData((prev) => {
      const newData = { ...prev };
      const current = newData[coord] || { value: '', formula: '' };
      
      let finalFormula = updates.formula !== undefined ? updates.formula : current.formula;
      let finalValue = updates.value !== undefined ? updates.value : current.value;

      newData[coord] = { 
        ...current, 
        ...updates,
        formula: finalFormula,
        value: finalValue
      };

      const updatedData: SpreadsheetData = { ...newData };
      Object.keys(updatedData).forEach((key) => {
        const cell = updatedData[key];
        if (cell.formula.startsWith('=')) {
          updatedData[key] = {
            ...cell,
            value: evaluateFormula(cell.formula, updatedData)
          };
        }
      });

      return updatedData;
    });
  }, []);

  const handleCellSelect = (coord: string) => {
    if (selectedCell === coord) {
      // Single tap on already selected cell starts editing
      setEditingCell(coord);
    } else {
      setSelectedCell(coord);
      setEditingCell(null);
    }
  };

  const handleCellDoubleClick = (coord: string) => {
    setEditingCell(coord);
  };

  const handleKeyDown = (e: React.KeyboardEvent, rows: number, cols: number) => {
    if (!selectedCell) return;

    // If editing, only allow Tab and Enter to navigate (they write the value in Cell.tsx first)
    if (editingCell && e.key !== 'Tab' && e.key !== 'Enter') return;

    const match = selectedCell.match(/^([A-Z]+)(\d+)$/);
    if (!match) return;
    
    let colStr = match[1];
    let row = parseInt(match[2]) - 1;
    let col = 0;
    for (let i = 0; i < colStr.length; i++) col = col * 26 + (colStr.charCodeAt(i) - 64);
    col--;

    switch (e.key) {
      case 'ArrowUp':
        if (row > 0) setSelectedCell(indexToCoordinate(row - 1, col));
        e.preventDefault();
        break;
      case 'ArrowDown':
        if (row < rows - 1) setSelectedCell(indexToCoordinate(row + 1, col));
        e.preventDefault();
        break;
      case 'ArrowLeft':
        if (col > 0) setSelectedCell(indexToCoordinate(row, col - 1));
        e.preventDefault();
        break;
      case 'ArrowRight':
        if (col < cols - 1) setSelectedCell(indexToCoordinate(row, col + 1));
        e.preventDefault();
        break;
      case 'Enter':
        if (editingCell) {
          // If we were editing, Enter moves down
          if (row < rows - 1) setSelectedCell(indexToCoordinate(row + 1, col));
          setEditingCell(null);
        } else {
          setEditingCell(selectedCell);
        }
        e.preventDefault();
        break;
      case 'Tab':
        // Tab moves right
        if (col < cols - 1) {
          setSelectedCell(indexToCoordinate(row, col + 1));
        } else if (row < rows - 1) {
          // Wrap to next row
          setSelectedCell(indexToCoordinate(row + 1, 0));
        }
        setEditingCell(null);
        e.preventDefault();
        break;
      case 'Backspace':
      case 'Delete':
        if (!editingCell) {
          updateCell(selectedCell, { value: '', formula: '' });
        }
        break;
      default:
        // Start typing directly to enter edit mode
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey && !editingCell) {
          setEditingCell(selectedCell);
        }
        break;
    }
  };

  return {
    data,
    setData,
    selectedCell,
    setSelectedCell,
    editingCell,
    setEditingCell,
    updateCell,
    handleCellSelect,
    handleCellDoubleClick,
    handleKeyDown,
    sheetName,
    setSheetName,
  };
}
