'use server';
/**
 * @fileOverview Provides AI-powered suggestions for common spreadsheet formulas based on selected cell data.
 *
 * - suggestFormulas - A function that suggests formulas based on selected cell data.
 * - SuggestFormulasInput - The input type for the suggestFormulas function.
 * - SuggestFormulasOutput - The return type for the suggestFormulas function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const SuggestFormulasInputSchema = z.object({
  selectedCellData: z
    .array(z.array(z.string()))
    .describe(
      'A 2D array of strings representing the data in the selected spreadsheet cells.'
    ),
  range: z
    .string()
    .describe(
      'The spreadsheet range of the selected cells (e.g., "A1:B5").'
    ),
});
export type SuggestFormulasInput = z.infer<typeof SuggestFormulasInputSchema>;

const FormulaSuggestionSchema = z.object({
  formula: z
    .string()
    .describe('The suggested spreadsheet formula, e.g., "=SUM(A1:B5)"'),
  description: z
    .string()
    .describe('A brief explanation of what the formula calculates.'),
});

const SuggestFormulasOutputSchema = z.object({
  suggestions: z
    .array(FormulaSuggestionSchema)
    .describe('A list of suggested formulas based on the input data.'),
});
export type SuggestFormulasOutput = z.infer<
  typeof SuggestFormulasOutputSchema
>;

export async function suggestFormulas(
  input: SuggestFormulasInput
): Promise<SuggestFormulasOutput> {
  return suggestFormulasFlow(input);
}

const prompt = ai.definePrompt({
  name: 'smartFormulaSuggestionsPrompt',
  input: { schema: SuggestFormulasInputSchema },
  output: { schema: SuggestFormulasOutputSchema },
  prompt: `You are an AI assistant specialized in spreadsheet analysis.

The user has selected a range of cells with the following data:
Range: {{{range}}}
Data:
{{{JSON.stringify(selectedCellData, null, 2)}}}

Analyze the provided cell data and the specified range. Identify patterns or types of data that would commonly benefit from aggregation or analysis.
Suggest 2-3 relevant spreadsheet formulas (e.g., SUM, AVERAGE, COUNT, MIN, MAX, CONCATENATE, etc.) that the user could apply to this data.
For each suggestion, provide the formula itself, ensuring it correctly references the given range, and a brief description of what the formula does or why it's useful for this data.

Formulate your response as a JSON object matching the output schema.`,
});

const suggestFormulasFlow = ai.defineFlow(
  {
    name: 'smartFormulaSuggestionsFlow',
    inputSchema: SuggestFormulasInputSchema,
    outputSchema: SuggestFormulasOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
