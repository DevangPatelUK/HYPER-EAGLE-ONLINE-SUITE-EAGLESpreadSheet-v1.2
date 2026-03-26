'use client';

import React, { useMemo } from 'react';
import { 
  BarChart, Bar, 
  LineChart, Line, 
  PieChart, Pie, Cell,
  AreaChart, Area,
  ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { SpreadsheetChart, WorkbookData, coordinateToIndex, indexToCoordinate, parseRange } from '@/app/lib/formula-engine';

interface ChartOverlayProps {
  chart: SpreadsheetChart;
  workbook: WorkbookData;
  activeSheetId: string;
  onRemove: (id: string) => void;
}

const COLORS = ['#2563eb', '#16a34a', '#dc2626', '#ca8a04', '#7c3aed', '#ea580c'];

export const ChartOverlay: React.FC<ChartOverlayProps> = ({
  chart,
  workbook,
  activeSheetId,
  onRemove,
}) => {
  const chartData = useMemo(() => {
    const coords = parseRange(chart.range);
    if (coords.length === 0) return [];

    const start = coordinateToIndex(coords[0])!;
    const end = coordinateToIndex(coords[coords.length - 1])!;
    
    const minRow = Math.min(start.row, end.row);
    const maxRow = Math.max(start.row, end.row);
    const minCol = Math.min(start.col, end.col);
    const maxCol = Math.max(start.col, end.col);

    const sheet = workbook[activeSheetId];
    const data = sheet?.data || {};

    const formattedData: any[] = [];
    
    for (let r = minRow; r <= maxRow; r++) {
      const rowObj: any = {};
      const labelCoord = indexToCoordinate(r, minCol);
      rowObj.name = data[labelCoord]?.value || `Row ${r + 1}`;
      
      let hasValue = false;
      for (let c = minCol + 1; c <= maxCol; c++) {
        const valueCoord = indexToCoordinate(r, c);
        const val = parseFloat(data[valueCoord]?.value || '0');
        const seriesName = `Series ${c - minCol}`;
        rowObj[seriesName] = isNaN(val) ? 0 : val;
        hasValue = true;
      }
      
      // If only one column selected, use values from that column
      if (minCol === maxCol) {
         const val = parseFloat(data[labelCoord]?.value || '0');
         rowObj.value = isNaN(val) ? 0 : val;
         rowObj.name = `Item ${r - minRow + 1}`;
      }

      formattedData.push(rowObj);
    }
    return formattedData;
  }, [chart.range, workbook, activeSheetId]);

  const seriesNames = useMemo(() => {
    if (chartData.length === 0) return [];
    return Object.keys(chartData[0]).filter(k => k !== 'name');
  }, [chartData]);

  const renderChart = () => {
    if (chartData.length === 0) return <div className="flex items-center justify-center h-full text-muted-foreground">No valid data</div>;

    const commonProps = {
      data: chartData,
      margin: { top: 10, right: 10, left: 10, bottom: 20 }
    };

    switch (chart.type) {
      case 'bar':
        return (
          <BarChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} />
            <YAxis fontSize={10} tickLine={false} axisLine={false} />
            <Tooltip />
            <Legend verticalAlign="top" height={36} />
            {seriesNames.map((s, i) => (
              <Bar key={s} dataKey={s} fill={COLORS[i % COLORS.length]} radius={[4, 4, 0, 0]} />
            ))}
          </BarChart>
        );
      case 'line':
        return (
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} />
            <YAxis fontSize={10} tickLine={false} axisLine={false} />
            <Tooltip />
            <Legend verticalAlign="top" height={36} />
            {seriesNames.map((s, i) => (
              <Line key={s} type="monotone" dataKey={s} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={{ r: 4 }} />
            ))}
          </LineChart>
        );
      case 'area':
        return (
          <AreaChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} />
            <YAxis fontSize={10} tickLine={false} axisLine={false} />
            <Tooltip />
            <Legend verticalAlign="top" height={36} />
            {seriesNames.map((s, i) => (
              <Area key={s} type="monotone" dataKey={s} fill={COLORS[i % COLORS.length]} stroke={COLORS[i % COLORS.length]} fillOpacity={0.3} />
            ))}
          </AreaChart>
        );
      case 'pie':
        const pieDataKey = seriesNames[0] || 'value';
        return (
          <PieChart>
            <Pie
              data={chartData}
              dataKey={pieDataKey}
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={80}
              label
            >
              {chartData.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        );
      case 'scatter':
        return (
          <ScatterChart {...commonProps}>
             <CartesianGrid strokeDasharray="3 3" />
             <XAxis type="number" dataKey={seriesNames[0]} name="X" fontSize={10} />
             <YAxis type="number" dataKey={seriesNames[1] || seriesNames[0]} name="Y" fontSize={10} />
             <Tooltip cursor={{ strokeDasharray: '3 3' }} />
             <Legend verticalAlign="top" height={36} />
             <Scatter name={chart.title} data={chartData} fill={COLORS[0]} />
          </ScatterChart>
        );
      default:
        return null;
    }
  };

  return (
    <div 
      className="absolute z-50 shadow-2xl animate-in fade-in zoom-in-95 duration-200"
      style={{ 
        left: chart.position.x, 
        top: chart.position.y, 
        width: chart.position.width, 
        height: chart.position.height 
      }}
    >
      <Card className="w-full h-full flex flex-col overflow-hidden border-2 border-primary/20">
        <CardHeader className="py-2 px-4 flex flex-row items-center justify-between bg-muted/30 border-b">
          <CardTitle className="text-sm font-bold truncate pr-4">{chart.title}</CardTitle>
          <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full hover:bg-destructive hover:text-white transition-colors" onClick={() => onRemove(chart.id)}>
            <X className="h-3 w-3" />
          </Button>
        </CardHeader>
        <CardContent className="flex-1 p-2 pt-4 bg-white">
          <ResponsiveContainer width="100%" height="100%">
            {renderChart()}
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};
