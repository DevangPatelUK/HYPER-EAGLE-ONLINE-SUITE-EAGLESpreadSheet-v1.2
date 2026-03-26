'use client';

import { useState, useCallback, useEffect } from 'react';
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
      newData[coord] = { ...current, ...updates };

      // Re-evaluate all formulas (simple dependency management for a mini system)
      Object.keys(newData).forEach((key) => {
        if (newData[key].formula.startsWith('=')) {
          newData[key].value = evaluateFormula(newData[key].formula, newData);
        }
      });

      return newData;
    });
  }, []);

  const handleCellSelect = (coord: string) => {
    setSelectedCell(coord);
    setEditingCell(null);
  };

  const handleCellDoubleClick = (coord: string) => {
    setEditingCell(coord);
  };

  const handleKeyDown = (e: React.KeyboardEvent, rows: number, cols: number) => {
    if (!selectedCell || editingCell) return;

    const match = selectedCell.match(/^([A-Z]+)(\d+)$/);
    if (!match) return;
    
    let colStr = match[1];
    let row = parseInt(match[2]) - 1;
    let col = 0;
    for (let i = 0; i < colStr.length; i++) col = col * 26 + (colStr.charCodeAt(i) - 64);
    col--;

    switch (e.key) {
      case 'ArrowUp':
        if (row > 0) handleCellSelect(indexToCoordinate(row - 1, col));
        e.preventDefault();
        break;
      case 'ArrowDown':
        if (row < rows - 1) handleCellSelect(indexToCoordinate(row + 1, col));
        e.preventDefault();
        break;
      case 'ArrowLeft':
        if (col > 0) handleCellSelect(indexToCoordinate(row, col - 1));
        e.preventDefault();
        break;
      case 'ArrowRight':
        if (col < cols - 1) handleCellSelect(indexToCoordinate(row, col + 1));
        e.preventDefault();
        break;
      case 'Enter':
        setEditingCell(selectedCell);
        e.preventDefault();
        break;
      case 'Tab':
        if (col < cols - 1) handleCellSelect(indexToCoordinate(row, col + 1));
        e.preventDefault();
        break;
      case 'Backspace':
      case 'Delete':
        updateCell(selectedCell, { value: '', formula: '' });
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
