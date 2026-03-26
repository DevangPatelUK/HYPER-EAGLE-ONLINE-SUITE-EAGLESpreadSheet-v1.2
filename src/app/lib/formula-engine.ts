export type CellData = {
  value: string;
  formula: string;
  bold?: boolean;
  align?: 'left' | 'center' | 'right';
  backgroundColor?: string;
  format?: 'number' | 'currency' | 'percent' | 'text';
};

export type SpreadsheetData = Record<string, CellData>;

export type Sheet = {
  id: string;
  name: string;
  data: SpreadsheetData;
};

export type WorkbookData = Record<string, Sheet>;

export function coordinateToIndex(coord: string): { row: number; col: number } | null {
  const match = coord.match(/^([A-Z]+)(\d+)$/);
  if (!match) return null;
  const colStr = match[1];
  const rowStr = match[2];
  
  let col = 0;
  for (let i = 0; i < colStr.length; i++) {
    col = col * 26 + (colStr.charCodeAt(i) - 64);
  }
  return { row: parseInt(rowStr) - 1, col: col - 1 };
}

export function indexToCoordinate(row: number, col: number): string {
  let colStr = '';
  let c = col + 1;
  while (c > 0) {
    let remainder = (c - 1) % 26;
    colStr = String.fromCharCode(65 + remainder) + colStr;
    c = Math.floor((c - 1) / 26);
  }
  return `${colStr}${row + 1}`;
}

function parseRange(rangeStr: string): string[] {
  const [start, end] = rangeStr.split(':');
  if (!start || !end) return [];
  const startIdx = coordinateToIndex(start);
  const endIdx = coordinateToIndex(end);
  if (!startIdx || !endIdx) return [];

  const coords: string[] = [];
  for (let r = Math.min(startIdx.row, endIdx.row); r <= Math.max(startIdx.row, endIdx.row); r++) {
    for (let c = Math.min(startIdx.col, endIdx.col); c <= Math.max(startIdx.col, endIdx.col); c++) {
      coords.push(indexToCoordinate(r, c));
    }
  }
  return coords;
}

export function formatCellValue(value: string, format?: string): string {
  if (!value || isNaN(parseFloat(value))) return value;
  const num = parseFloat(value);

  switch (format) {
    case 'currency':
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num);
    case 'percent':
      return new Intl.NumberFormat('en-US', { style: 'percent', minimumFractionDigits: 0 }).format(num / 100);
    case 'number':
      return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num);
    default:
      return value;
  }
}

function getCellValue(
  fullRef: string, 
  workbook: WorkbookData, 
  currentSheetId: string, 
  visited: Set<string>
): string {
  let sheetId = currentSheetId;
  let cellCoord = fullRef;

  if (fullRef.includes('!')) {
    const [sheetName, coord] = fullRef.split('!');
    const targetSheet = Object.values(workbook).find(s => s.name.toUpperCase() === sheetName.toUpperCase());
    if (!targetSheet) return '#REF!';
    sheetId = targetSheet.id;
    cellCoord = coord;
  }

  const visitKey = `${sheetId}!${cellCoord}`;
  if (visited.has(visitKey)) return '#CIRCULAR!';
  
  const cell = workbook[sheetId]?.data[cellCoord];
  if (!cell) return '0';
  if (!cell.formula || !cell.formula.startsWith('=')) return cell.value || '0';

  visited.add(visitKey);
  const result = evaluateFormula(cellCoord, cell.formula, workbook, sheetId, new Set(visited));
  visited.delete(visitKey);
  return result;
}

export function evaluateFormula(
  coord: string, 
  formula: string, 
  workbook: WorkbookData,
  currentSheetId: string,
  visited: Set<string> = new Set()
): string {
  if (!formula.startsWith('=')) return formula;
  
  const expression = formula.slice(1).trim().toUpperCase();
  
  try {
    // 1. Handle Functions with Ranges (SUM, AVG, MIN, MAX, COUNT)
    const rangeFuncRegex = /^(SUM|AVG|MIN|MAX|COUNT)\(([^)]+)\)$/;
    const rangeMatch = expression.match(rangeFuncRegex);
    
    if (rangeMatch) {
      const func = rangeMatch[1];
      const rangeStr = rangeMatch[2];
      
      let targetSheetId = currentSheetId;
      let effectiveRangeStr = rangeStr;

      if (rangeStr.includes('!')) {
        const [sheetName, r] = rangeStr.split('!');
        const targetSheet = Object.values(workbook).find(s => s.name.toUpperCase() === sheetName.toUpperCase());
        if (!targetSheet) return '#REF!';
        targetSheetId = targetSheet.id;
        effectiveRangeStr = r;
      }

      const coords = effectiveRangeStr.includes(':') ? parseRange(effectiveRangeStr) : [effectiveRangeStr];
      
      const values = coords.map(c => {
        const val = getCellValue(`${workbook[targetSheetId].name}!${c}`, workbook, currentSheetId, visited);
        if (val.startsWith('#') && val !== '#CIRCULAR!') throw new Error(val);
        return parseFloat(val || '0');
      }).filter(v => !isNaN(v));

      switch (func) {
        case 'SUM': return values.reduce((a, b) => a + b, 0).toString();
        case 'AVG': return values.length > 0 ? (values.reduce((a, b) => a + b, 0) / values.length).toString() : '0';
        case 'MIN': return values.length > 0 ? Math.min(...values).toString() : '0';
        case 'MAX': return values.length > 0 ? Math.max(...values).toString() : '0';
        case 'COUNT': return values.length.toString();
      }
    }

    // 2. Handle IF Function
    if (expression.startsWith('IF(')) {
      const argsStr = expression.slice(3, -1);
      const args = argsStr.split(',').map(s => s.trim());
      if (args.length !== 3) return '#NAME?';

      const condition = args[0];
      const trueVal = args[1];
      const falseVal = args[2];

      const processedCondition = condition.replace(/([A-Z]+!)?[A-Z]+\d+/g, (match) => {
        const val = getCellValue(match, workbook, currentSheetId, visited);
        return isNaN(parseFloat(val)) ? `"${val}"` : val;
      });

      // eslint-disable-next-line no-eval
      const result = eval(processedCondition);
      const chosenBranch = result ? trueVal : falseVal;

      if (chosenBranch.match(/([A-Z]+!)?[A-Z]+\d+$/)) {
        return getCellValue(chosenBranch, workbook, currentSheetId, visited);
      }
      return chosenBranch.replace(/"/g, '');
    }

    // 3. Basic Arithmetic and individual cell references (including cross-sheet)
    let processedExpr = expression.replace(/([A-Z]+!)?[A-Z]+\d+/g, (match) => {
      const val = getCellValue(match, workbook, currentSheetId, visited);
      if (val.startsWith('#') && val !== '#CIRCULAR!') throw new Error(val);
      const num = parseFloat(val || '0');
      return isNaN(num) ? '0' : num.toString();
    });

    if (processedExpr.includes('/0') && !processedExpr.includes('/0.')) {
      return '#DIV/0!';
    }

    if (/^[0-9+\-*/().\s]+$/.test(processedExpr)) {
      // eslint-disable-next-line no-eval
      const result = eval(processedExpr);
      return isFinite(result) ? result.toString() : '#VALUE!';
    }
    
    return '#NAME?';
  } catch (e: any) {
    if (e.message.startsWith('#')) return e.message;
    return '#ERROR!';
  }
}
