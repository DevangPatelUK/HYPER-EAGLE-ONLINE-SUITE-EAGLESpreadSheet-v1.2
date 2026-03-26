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

export function evaluateFormula(formula: string, data: SpreadsheetData): string {
  if (!formula.startsWith('=')) return formula;
  
  const expression = formula.slice(1).toUpperCase();
  
  try {
    // Basic Sum
    if (expression.startsWith('SUM(') && expression.endsWith(')')) {
      const range = expression.slice(4, -1);
      const coords = range.includes(':') ? parseRange(range) : [range];
      const sum = coords.reduce((acc, coord) => {
        const val = parseFloat(data[coord]?.value || '0');
        return acc + (isNaN(val) ? 0 : val);
      }, 0);
      return sum.toString();
    }

    // Basic Average
    if (expression.startsWith('AVG(') && expression.endsWith(')')) {
      const range = expression.slice(4, -1);
      const coords = range.includes(':') ? parseRange(range) : [range];
      const vals = coords.map(c => parseFloat(data[c]?.value || '0')).filter(v => !isNaN(v));
      return vals.length > 0 ? (vals.reduce((a, b) => a + b, 0) / vals.length).toString() : '0';
    }

    // Basic Arithmetic and simple cell references
    // This is a naive implementation using eval for a "mini" system. 
    // In production, use a safe math parser.
    let processedExpr = expression.replace(/([A-Z]+\d+)/g, (match) => {
      const val = parseFloat(data[match]?.value || '0');
      return isNaN(val) ? '0' : val.toString();
    });

    // Sanitize expression for safe-ish eval (only numbers and basic operators)
    if (/^[0-9+\-*/().\s]+$/.test(processedExpr)) {
      // eslint-disable-next-line no-eval
      return eval(processedExpr).toString();
    }
    
    return expression;
  } catch (e) {
    return '#ERROR!';
  }
}
