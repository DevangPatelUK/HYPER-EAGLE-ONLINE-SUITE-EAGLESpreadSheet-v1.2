export type CellData = {
  value: string;
  formula: string;
  bold?: boolean;
  align?: 'left' | 'center' | 'right';
};

export type SpreadsheetData = Record<string, CellData>;

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

/**
 * Resolves a cell value, potentially evaluating its formula.
 * Uses a visited set to detect circular dependencies.
 */
function getCellValue(coord: string, data: SpreadsheetData, visited: Set<string>): string {
  if (visited.has(coord)) return '#CIRCULAR!';
  
  const cell = data[coord];
  if (!cell) return '0';
  if (!cell.formula || !cell.formula.startsWith('=')) return cell.value || '0';

  visited.add(coord);
  const result = evaluateFormula(coord, cell.formula, data, new Set(visited));
  visited.delete(coord);
  return result;
}

export function evaluateFormula(
  coord: string, 
  formula: string, 
  data: SpreadsheetData, 
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
      const coords = rangeStr.includes(':') ? parseRange(rangeStr) : [rangeStr];
      
      const values = coords.map(c => {
        const val = getCellValue(c, data, visited);
        if (val.startsWith('#')) throw new Error(val);
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

    // 2. Handle IF Function: IF(condition, trueVal, falseVal)
    if (expression.startsWith('IF(')) {
      const argsStr = expression.slice(3, -1);
      // Naive comma split (doesn't handle nested commas well, but works for basic IF)
      const args = argsStr.split(',').map(s => s.trim());
      if (args.length !== 3) return '#NAME?';

      const condition = args[0];
      const trueVal = args[1];
      const falseVal = args[2];

      // Replace references in condition
      const processedCondition = condition.replace(/[A-Z]+\d+/g, (match) => {
        const val = getCellValue(match, data, visited);
        return isNaN(parseFloat(val)) ? `"${val}"` : val;
      });

      // Simple eval for condition
      // eslint-disable-next-line no-eval
      const result = eval(processedCondition);
      const chosenBranch = result ? trueVal : falseVal;

      if (chosenBranch.match(/^[A-Z]+\d+$/)) {
        return getCellValue(chosenBranch, data, visited);
      }
      return chosenBranch.replace(/"/g, '');
    }

    // 3. Handle ROUND(value, digits)
    if (expression.startsWith('ROUND(')) {
      const args = expression.slice(6, -1).split(',').map(s => s.trim());
      if (args.length !== 2) return '#NAME?';
      
      const valToRound = args[0].match(/^[A-Z]+\d+$/) 
        ? parseFloat(getCellValue(args[0], data, visited)) 
        : parseFloat(args[0]);
      const digits = parseInt(args[1]);
      
      if (isNaN(valToRound) || isNaN(digits)) return '#VALUE!';
      return valToRound.toFixed(digits);
    }

    // 4. Handle Basic Arithmetic and individual cell references
    let processedExpr = expression.replace(/[A-Z]+\d+/g, (match) => {
      const val = getCellValue(match, data, visited);
      if (val.startsWith('#')) throw new Error(val);
      const num = parseFloat(val || '0');
      return isNaN(num) ? '0' : num.toString();
    });

    // Check for division by zero
    if (processedExpr.includes('/0') && !processedExpr.includes('/0.')) {
      return '#DIV/0!';
    }

    // Sanitize and evaluate
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
