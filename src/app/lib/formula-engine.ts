export type ValidationRule = {
  type: 'number' | 'text' | 'date';
  min?: number;
  max?: number;
  allowEmpty?: boolean;
};

export type ConditionalFormatRule = {
  operator: 'gt' | 'lt' | 'eq' | 'contains';
  value: string;
  style: {
    backgroundColor?: string;
    textColor?: string;
    bold?: boolean;
  };
};

export type CellData = {
  value: string;
  formula: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  wrapText?: boolean;
  align?: 'left' | 'center' | 'right';
  backgroundColor?: string;
  textColor?: string;
  fontSize?: number;
  format?: 'number' | 'currency' | 'percent' | 'text';
  type?: 'text' | 'number' | 'date' | 'checkbox' | 'select';
  options?: string[];
  rowSpan?: number;
  colSpan?: number;
  hiddenByMerge?: string;
  comment?: string;
  validation?: ValidationRule;
  conditionalFormats?: ConditionalFormatRule[];
  isLocked?: boolean;
};

export type SpreadsheetData = Record<string, CellData>;

export type Filter = {
  colIndex: number;
  operator: 'contains' | 'gt' | 'lt' | 'eq';
  value: string;
};

export type ChartType = 'bar' | 'line' | 'pie' | 'area' | 'scatter';

export type SpreadsheetChart = {
  id: string;
  type: ChartType;
  range: string;
  title: string;
  position: { x: number; y: number; width: number; height: number };
};

export type PrintSettings = {
  orientation: 'portrait' | 'landscape';
  margins: 'standard' | 'narrow' | 'wide';
  headerText?: string;
  footerText?: string;
  showGridlines: boolean;
  showHeaders: boolean;
};

export type Sheet = {
  id: string;
  name: string;
  data: SpreadsheetData;
  rowHeights?: Record<number, number>;
  colWidths?: Record<number, number>;
  hiddenRows?: Record<number, boolean>;
  hiddenCols?: Record<number, boolean>;
  filteredRows?: Record<number, boolean>;
  filters?: Filter[];
  frozenRows?: number;
  frozenCols?: number;
  isProtected?: boolean;
  charts?: SpreadsheetChart[];
  printSettings?: PrintSettings;
};

export type WorkbookData = Record<string, Sheet>;

export const SUPPORTED_FUNCTIONS = ['SUM', 'AVG', 'AVERAGE', 'MIN', 'MAX', 'COUNT', 'ROUND', 'IF'];

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

export function parseRange(rangeStr: string): string[] {
  const [start, end] = rangeStr.split(':');
  if (!start) return [];
  if (!end) return [start];
  
  const startIdx = coordinateToIndex(start);
  const endIdx = coordinateToIndex(end);
  if (!startIdx || !endIdx) return [start];

  const coords: string[] = [];
  const minRow = Math.min(startIdx.row, endIdx.row);
  const maxRow = Math.max(startIdx.row, endIdx.row);
  const minCol = Math.min(startIdx.col, endIdx.col);
  const maxCol = Math.max(startIdx.col, endIdx.col);

  for (let r = minRow; r <= maxRow; r++) {
    for (let c = minCol; c <= maxCol; c++) {
      coords.push(indexToCoordinate(r, c));
    }
  }
  return coords;
}

export function formatCellValue(value: string, format?: string): string {
  if (!value) return '';
  const num = parseFloat(value);
  if (isNaN(num)) return value;

  switch (format) {
    case 'currency':
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num);
    case 'percent':
      return new Intl.NumberFormat('en-US', { style: 'percent', minimumFractionDigits: 1 }).format(num / 100);
    case 'number':
      return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2 }).format(num);
    default:
      return value;
  }
}

export function evaluateConditionalFormatting(data: CellData): Partial<CellData> {
  if (!data.conditionalFormats?.length) return {};
  const val = data.value || '';
  const num = parseFloat(val);
  
  for (const rule of data.conditionalFormats) {
    let match = false;
    if (rule.operator === 'contains' && val.includes(rule.value)) match = true;
    if (rule.operator === 'eq' && val === rule.value) match = true;
    if (rule.operator === 'gt' && !isNaN(num) && num > parseFloat(rule.value)) match = true;
    if (rule.operator === 'lt' && !isNaN(num) && num < parseFloat(rule.value)) match = true;
    if (match) return rule.style;
  }
  return {};
}

export function validateValue(value: string, rule?: ValidationRule): { valid: boolean; message?: string } {
  if (!rule) return { valid: true };
  if (!value && rule.allowEmpty) return { valid: true };
  if (!value && !rule.allowEmpty) return { valid: false, message: 'Cannot be empty' };

  if (rule.type === 'number') {
    const n = parseFloat(value);
    if (isNaN(n)) return { valid: false, message: 'Must be a number' };
    if (rule.min !== undefined && n < rule.min) return { valid: false, message: `Min ${rule.min}` };
    if (rule.max !== undefined && n > rule.max) return { valid: false, message: `Max ${rule.max}` };
  }
  return { valid: true };
}

function getCellValue(ref: string, workbook: WorkbookData, currentSheetId: string, visited: Set<string>): string {
  let sheetId = currentSheetId;
  let coord = ref;
  if (ref.includes('!')) {
    const [sheetName, cellCoord] = ref.split('!');
    const target = Object.values(workbook).find(s => s.name.toUpperCase() === sheetName.toUpperCase());
    if (!target) return '#REF!';
    sheetId = target.id;
    coord = cellCoord;
  }

  const visitKey = `${sheetId}!${coord}`;
  if (visited.has(visitKey)) return '#CIRCULAR!';
  
  const cell = workbook[sheetId]?.data[coord];
  if (!cell) return '0';
  if (!cell.formula?.startsWith('=')) return cell.value || '0';

  visited.add(visitKey);
  const result = evaluateFormula(coord, cell.formula, workbook, sheetId, visited);
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
  const expr = formula.slice(1).toUpperCase().trim();
  
  try {
    const rangeMatch = expr.match(/^(SUM|AVG|AVERAGE|MIN|MAX|COUNT)\(([^)]+)\)$/);
    if (rangeMatch) {
      const func = rangeMatch[1];
      const rangeStr = rangeMatch[2];
      const coords = rangeStr.includes(':') ? parseRange(rangeStr) : [rangeStr];
      const values = coords.map(c => {
        const val = parseFloat(getCellValue(c, workbook, currentSheetId, visited));
        return isNaN(val) ? 0 : val;
      });

      switch (func) {
        case 'SUM': return values.reduce((a, b) => a + b, 0).toString();
        case 'AVG':
        case 'AVERAGE': return values.length ? (values.reduce((a, b) => a + b, 0) / values.length).toString() : '0';
        case 'MIN': return Math.min(...values).toString();
        case 'MAX': return Math.max(...values).toString();
        case 'COUNT': return values.length.toString();
      }
    }

    // Basic arithmetic
    const processed = expr.replace(/([A-Z]+[0-9]+)/g, (match) => {
      const val = getCellValue(match, workbook, currentSheetId, visited);
      return isNaN(parseFloat(val)) ? '0' : val;
    });

    const result = eval(processed);
    return isFinite(result) ? result.toString() : '#VALUE!';
  } catch (e) {
    return '#ERROR!';
  }
}
