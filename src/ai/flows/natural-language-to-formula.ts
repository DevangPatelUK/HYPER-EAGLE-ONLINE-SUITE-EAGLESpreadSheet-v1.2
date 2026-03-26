'use server';
/**
 * @fileOverview Converts natural language descriptions into spreadsheet formulas.
 *
 * - naturalLanguageToFormula - A function that handles the conversion process.
 * - NaturalLanguageToFormulaInput - The input type for the naturalLanguageToFormula function.
 * - NaturalLanguageToFormulaOutput - The return type for the naturalLanguageToFormula function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const NaturalLanguageToFormulaInputSchema = z.object({
  naturalLanguageQuery: z
    .string()
    .describe(
      'Natural language description of the desired spreadsheet calculation.'
    ),
});
export type NaturalLanguageToFormulaInput = z.infer<
  typeof NaturalLanguageToFormulaInputSchema
>;

const NaturalLanguageToFormulaOutputSchema = z.object({
  formula: z.string().describe('The generated spreadsheet formula.'),
});
export type NaturalLanguageToFormulaOutput = z.infer<
  typeof NaturalLanguageToFormulaOutputSchema
>;

export async function naturalLanguageToFormula(
  input: NaturalLanguageToFormulaInput
): Promise<NaturalLanguageToFormulaOutput> {
  return naturalLanguageToFormulaFlow(input);
}

const naturalLanguageToFormulaPrompt = ai.definePrompt({
  name: 'naturalLanguageToFormulaPrompt',
  input: {schema: NaturalLanguageToFormulaInputSchema},
  output: {schema: NaturalLanguageToFormulaOutputSchema},
  prompt: `You are an expert spreadsheet formula generator.
Your task is to convert a natural language request into a valid spreadsheet formula.

Here is the natural language request: "{{{naturalLanguageQuery}}}"

Only return the formula, nothing else.`,
});

const naturalLanguageToFormulaFlow = ai.defineFlow(
  {
    name: 'naturalLanguageToFormulaFlow',
    inputSchema: NaturalLanguageToFormulaInputSchema,
    outputSchema: NaturalLanguageToFormulaOutputSchema,
  },
  async (input) => {
    const {output} = await naturalLanguageToFormulaPrompt(input);
    return output!;
  }
);
