'use server';
/**
 * @fileOverview A Genkit flow for analyzing a selected data range and providing insights.
 *
 * - analyzeDataRange - A function that analyzes a data range and returns insights.
 * - AnalyzeDataRangeInput - The input type for the analyzeDataRange function.
 * - AnalyzeDataRangeOutput - The return type for the analyzeDataRange function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnalyzeDataRangeInputSchema = z.object({
  dataRange: z.array(z.array(z.string())).describe('A 2D array of strings representing the selected data range.'),
});
export type AnalyzeDataRangeInput = z.infer<typeof AnalyzeDataRangeInputSchema>;

const AnalyzeDataRangeOutputSchema = z.object({
  summary: z.string().describe('A concise summary of the data in the selected range.'),
  trends: z.array(z.string()).describe('A list of key trends identified in the data.'),
  anomalies: z.array(z.string()).describe('A list of anomalies or outliers found in the data.'),
});
export type AnalyzeDataRangeOutput = z.infer<typeof AnalyzeDataRangeOutputSchema>;

export async function analyzeDataRange(input: AnalyzeDataRangeInput): Promise<AnalyzeDataRangeOutput> {
  return analyzeDataRangeFlow(input);
}

const prompt = ai.definePrompt({
  name: 'dataRangeInsightsPrompt',
  input: {schema: AnalyzeDataRangeInputSchema},
  output: {schema: AnalyzeDataRangeOutputSchema},
  prompt: `You are an expert data analyst. Your task is to analyze the provided spreadsheet data range and extract valuable insights.
The data is provided as a 2D array of strings. Identify key trends, interesting patterns, and any notable anomalies.

Provide a concise summary, a list of identified trends, and a list of anomalies.

Data Range:

{{#each dataRange}}
{{#join this ","}}
{{/join}}
{{/each}}
`,
});

const analyzeDataRangeFlow = ai.defineFlow(
  {
    name: 'analyzeDataRangeFlow',
    inputSchema: AnalyzeDataRangeInputSchema,
    outputSchema: AnalyzeDataRangeOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
