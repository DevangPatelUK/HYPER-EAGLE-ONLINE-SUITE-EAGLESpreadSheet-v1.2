'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Wand2, Sparkles, Copy, Loader2 } from 'lucide-react';
import { naturalLanguageToFormula } from '@/ai/flows/natural-language-to-formula';
import { suggestFormulas } from '@/ai/flows/smart-formula-suggestions';
import { analyzeDataRange } from '@/ai/flows/data-range-insights';
import { toast } from '@/hooks/use-toast';

interface AIAssistantProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedRange: string | null;
  selectedRangeData: string[][];
  onApplyFormula: (formula: string) => void;
}

export const AIAssistant: React.FC<AIAssistantProps> = ({
  open,
  onOpenChange,
  selectedRange,
  selectedRangeData,
  onApplyFormula,
}) => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<{ formula: string; description: string }[]>([]);

  const handleTranslate = async () => {
    if (!query) return;
    setLoading(true);
    try {
      const { formula } = await naturalLanguageToFormula({ naturalLanguageQuery: query });
      setResult(formula);
      setSuggestions([]);
    } catch (e) {
      toast({ title: 'Error', description: 'Failed to generate formula.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleSuggest = async () => {
    if (!selectedRange) return;
    setLoading(true);
    try {
      const { suggestions } = await suggestFormulas({
        selectedCellData: selectedRangeData,
        range: selectedRange,
      });
      setSuggestions(suggestions);
      setResult(null);
    } catch (e) {
      toast({ title: 'Error', description: 'Failed to get suggestions.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-accent" />
            AI Formula Assistant
          </DialogTitle>
          <DialogDescription>
            Ask AI to generate a formula or suggest improvements for your selection.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Describe what you want to calculate</label>
            <Textarea
              placeholder="e.g., 'Sum column A if column B is greater than 100'"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="min-h-[100px]"
            />
          </div>

          <div className="flex gap-2">
            <Button onClick={handleTranslate} disabled={loading || !query} className="flex-1">
              {loading ? <Loader2 className="animate-spin mr-2" /> : <Wand2 className="mr-2 h-4 w-4" />}
              Generate Formula
            </Button>
            <Button onClick={handleSuggest} variant="outline" disabled={loading || !selectedRange} className="flex-1">
              Suggest Formulas
            </Button>
          </div>

          {(result || suggestions.length > 0) && (
            <div className="mt-6 space-y-3">
              <label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">AI Results</label>
              
              {result && (
                <div className="p-3 bg-secondary/30 rounded-lg border border-border flex items-center justify-between group">
                  <code className="text-primary font-mono">{result}</code>
                  <Button variant="ghost" size="sm" onClick={() => onApplyFormula(result)}>
                    Apply
                  </Button>
                </div>
              )}

              {suggestions.map((s, i) => (
                <div key={i} className="p-3 bg-secondary/30 rounded-lg border border-border space-y-1 group">
                  <div className="flex items-center justify-between">
                    <code className="text-primary font-mono">{s.formula}</code>
                    <Button variant="ghost" size="sm" onClick={() => onApplyFormula(s.formula)}>
                      Apply
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">{s.description}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
