'use client';

import { WorkbookData, Sheet, indexToCoordinate } from './formula-engine';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Finds the maximum row and column indices that contain data in a sheet.
 */
function findDataBoundaries(sheet: Sheet) {
  let maxR = 0;
  let maxC = 0;
  Object.keys(sheet.data).forEach(coord => {
    const match = coord.match(/^([A-Z]+)(\d+)$/);
    if (match) {
      const r = parseInt(match[2]) - 1;
      const colStr = match[1];
      let c = 0;
      for (let i = 0; i < colStr.length; i++) {
        c = c * 26 + (colStr.charCodeAt(i) - 64);
      }
      c--;
      maxR = Math.max(maxR, r);
      maxC = Math.max(maxC, c);
    }
  });
  return { maxR, maxC };
}

export function exportToCSV(sheet: Sheet) {
  const { maxR, maxC } = findDataBoundaries(sheet);
  const rows: string[][] = [];

  for (let r = 0; r <= maxR; r++) {
    const row: string[] = [];
    for (let c = 0; c <= maxC; c++) {
      const val = sheet.data[indexToCoordinate(r, c)]?.value || '';
      // Escape double quotes and wrap in quotes
      row.push(`"${val.toString().replace(/"/g, '""')}"`);
    }
    rows.push(row);
  }

  const csvContent = rows.map(r => r.join(',')).join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.setAttribute('download', `${sheet.name || 'Sheet'}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportToXLSX(workbook: WorkbookData) {
  const wb = XLSX.utils.book_new();
  
  Object.values(workbook).forEach(sheet => {
    const { maxR, maxC } = findDataBoundaries(sheet);
    const data: any[][] = [];

    for (let r = 0; r <= maxR; r++) {
      const row: any[] = [];
      for (let c = 0; c <= maxC; c++) {
        row.push(sheet.data[indexToCoordinate(r, c)]?.value || '');
      }
      data.push(row);
    }
    
    const ws = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, sheet.name || 'Sheet');
  });

  XLSX.writeFile(wb, 'HyperEagleWorkbook.xlsx');
}

export function exportToPDF(sheet: Sheet) {
  const doc = new jsPDF();
  const { maxR, maxC } = findDataBoundaries(sheet);
  const data: string[][] = [];
  const headers: string[] = [];
  
  // Limit columns for PDF layout to prevent overflow (max 10-12 usually fits well)
  const colLimit = Math.min(maxC, 10); 
  for (let c = 0; c <= colLimit; c++) {
    headers.push(String.fromCharCode(65 + (c % 26)));
  }

  for (let r = 0; r <= maxR; r++) {
    const row: string[] = [];
    for (let c = 0; c <= colLimit; c++) {
      row.push((sheet.data[indexToCoordinate(r, c)]?.value || '').toString());
    }
    data.push(row);
  }

  doc.text(sheet.name || 'HyperEagle SpreadSheet', 14, 15);
  autoTable(doc, {
    head: [headers],
    body: data,
    startY: 20,
    theme: 'grid',
    styles: { fontSize: 8 },
    headStyles: { fillColor: [22, 163, 74] } // Emerald green header
  });

  doc.save(`${sheet.name || 'Export'}.pdf`);
}
