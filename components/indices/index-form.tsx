"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2, Plus, X, FileText, Check, AlertCircle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

interface SyntheticIndex {
  id: string;
  name: string;
  components: string[];
  weights: number[] | null;
}

interface SyntheticIndexFormProps {
  index?: SyntheticIndex;
  mode: "create" | "edit";
}

export function SyntheticIndexForm({ index, mode }: SyntheticIndexFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [name, setName] = useState(index?.name ?? "");
  const [useCustomWeights, setUseCustomWeights] = useState(
    !!index?.weights && index.weights.length > 0
  );
  const [components, setComponents] = useState<
    Array<{ symbol: string; weight: number }>
  >(
    index?.components.map((symbol, i) => ({
      symbol,
      weight: index.weights?.[i] ?? 1,
    })) ?? [{ symbol: "", weight: 1 }]
  );
  const [bulkInput, setBulkInput] = useState("");
  const [validationStatus, setValidationStatus] = useState<
    Record<number, 'valid' | 'invalid' | 'validating' | null>
  >({});

  /**
   * Parse symbols from text - supports comma, space, newline, and mixed text
   */
  const parseSymbols = (text: string): string[] => {
    // Common English words to exclude (not exhaustive but covers common cases)
    const excludeWords = new Set([
      'A', 'AN', 'THE', 'AND', 'OR', 'BUT', 'FOR', 'NOR', 'SO', 'YET',
      'TO', 'FROM', 'IN', 'ON', 'AT', 'BY', 'WITH', 'ABOUT', 'AS',
      'IS', 'ARE', 'WAS', 'WERE', 'BE', 'BEEN', 'BEING',
      'HAVE', 'HAS', 'HAD', 'DO', 'DOES', 'DID',
      'CAN', 'COULD', 'MAY', 'MIGHT', 'MUST', 'SHALL', 'SHOULD', 'WILL', 'WOULD',
      'THIS', 'THAT', 'THESE', 'THOSE',
      'I', 'YOU', 'HE', 'SHE', 'IT', 'WE', 'THEY',
      'MY', 'YOUR', 'HIS', 'HER', 'ITS', 'OUR', 'THEIR',
      'BUY', 'SELL', 'ALSO', 'ADD', 'GET', 'PUT', 'CALL'
    ]);
    
    // Extract potential ticker symbols using regex
    // Matches 1-5 uppercase letters (standard ticker format)
    const tickerRegex = /\b[A-Z]{1,5}\b/g;
    const matches = text.toUpperCase().match(tickerRegex) || [];
    
    // Filter out common words and remove duplicates while preserving order
    const filtered = matches.filter(word => !excludeWords.has(word));
    return Array.from(new Set(filtered));
  };

  /**
   * Validate symbols using Alpaca API
   */
  const validateAndAddSymbols = async () => {
    if (!bulkInput.trim()) {
      toast.error("Please enter some symbols");
      return;
    }

    setIsValidating(true);
    try {
      const parsed = parseSymbols(bulkInput);
      
      if (parsed.length === 0) {
        toast.error("No valid ticker symbols found in the input");
        setIsValidating(false);
        return;
      }

      // Validate symbols with Alpaca
      const response = await fetch("/api/alpaca/validate-symbols", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbols: parsed }),
      });

      if (!response.ok) {
        throw new Error("Failed to validate symbols");
      }

      const { validSymbols, invalidSymbols } = await response.json();

      // Add valid symbols to components
      const newSymbols = validSymbols.filter(
        (symbol: string) => !components.some((c) => c.symbol === symbol)
      );

      if (newSymbols.length > 0) {
        setComponents([
          ...components.filter((c) => c.symbol.trim() !== ""),
          ...newSymbols.map((symbol: string) => ({ symbol, weight: 1 })),
        ]);
        
        const message = `Added ${newSymbols.length} symbol${newSymbols.length > 1 ? 's' : ''}`;
        const invalidMsg = invalidSymbols.length > 0 
          ? ` (${invalidSymbols.length} invalid: ${invalidSymbols.join(", ")})` 
          : "";
        toast.success(message + invalidMsg);
      } else {
        toast.info("All symbols already added or invalid");
      }

      setBulkInput("");
    } catch (error) {
      console.error("Error validating symbols:", error);
      toast.error("Failed to validate symbols");
    } finally {
      setIsValidating(false);
    }
  };

  const addComponent = () => {
    setComponents([...components, { symbol: "", weight: 1 }]);
  };

  const removeComponent = (index: number) => {
    setComponents(components.filter((_, i) => i !== index));
  };

  const updateComponent = (
    index: number,
    field: "symbol" | "weight",
    value: string | number
  ) => {
    const updated = [...components];
    if (field === "symbol") {
      updated[index].symbol = (value as string).toUpperCase();
      // Clear validation status when user types
      setValidationStatus(prev => ({ ...prev, [index]: null }));
    } else {
      updated[index].weight = value as number;
    }
    setComponents(updated);
  };

  const validateSymbol = async (index: number, symbol: string) => {
    if (!symbol.trim()) {
      setValidationStatus(prev => ({ ...prev, [index]: null }));
      return;
    }

    setValidationStatus(prev => ({ ...prev, [index]: 'validating' }));

    try {
      const response = await fetch("/api/alpaca/validate-symbols", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbols: [symbol] }),
      });

      if (!response.ok) {
        setValidationStatus(prev => ({ ...prev, [index]: 'invalid' }));
        return;
      }

      const { validSymbols } = await response.json();
      const isValid = validSymbols.includes(symbol);
      setValidationStatus(prev => ({ ...prev, [index]: isValid ? 'valid' : 'invalid' }));
    } catch (error) {
      console.error('Error validating symbol:', error);
      setValidationStatus(prev => ({ ...prev, [index]: 'invalid' }));
    }
  };

  const normalizeWeights = () => {
    const total = components.reduce((sum, c) => sum + c.weight, 0);
    if (total === 0) return components.map((c) => ({ ...c, weight: 1 }));
    return components.map((c) => ({
      ...c,
      weight: c.weight / total,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check for invalid symbols
    const hasInvalidSymbols = Object.values(validationStatus).some(
      status => status === 'invalid'
    );
    if (hasInvalidSymbols) {
      toast.error('Please fix invalid symbols before submitting');
      return;
    }

    setIsLoading(true);

    try {
      // Validate
      const validComponents = components.filter((c) => c.symbol.trim() !== "");
      if (validComponents.length === 0) {
        throw new Error("Add at least one symbol");
      }

      if (!name.trim()) {
        throw new Error("Name is required");
      }

      // Normalize weights if using custom weights
      const normalized = useCustomWeights ? normalizeWeights() : validComponents;

      const payload = {
        name: name.trim(),
        components: normalized.map((c) => c.symbol.toUpperCase()),
        weights: useCustomWeights ? normalized.map((c) => c.weight) : null,
      };

      const url = mode === "create" ? "/api/indices" : `/api/indices/${index?.id}`;
      const method = mode === "create" ? "POST" : "PATCH";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save index");
      }

      toast.success(
        mode === "create" ? "Index created successfully" : "Index updated successfully"
      );
      router.push("/indices");
      router.refresh();
    } catch (error) {
      console.error("Error saving index:", error);
      toast.error(error instanceof Error ? error.message : "Failed to save index");
    } finally {
      setIsLoading(false);
    }
  };

  const totalWeight = components.reduce((sum, c) => sum + c.weight, 0);

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>Index Configuration</CardTitle>
          <CardDescription>
            Define the symbols and optional weights for your synthetic index
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Index Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., My Tech Portfolio"
              required
            />
          </div>

          {/* Custom Weights Toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Custom Weights</Label>
              <p className="text-sm text-muted-foreground">
                {useCustomWeights
                  ? "Assign specific weights to each symbol"
                  : "All symbols weighted equally"}
              </p>
            </div>
            <Switch
              checked={useCustomWeights}
              onCheckedChange={setUseCustomWeights}
            />
          </div>

          {/* Components */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Components</Label>
              {useCustomWeights && totalWeight > 0 && (
                <Badge variant="outline">
                  Total: {(totalWeight * 100).toFixed(0)}%
                </Badge>
              )}
            </div>

            <Tabs defaultValue="manual" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="manual">Add Manually</TabsTrigger>
                <TabsTrigger value="bulk">Bulk Add</TabsTrigger>
              </TabsList>

              <TabsContent value="manual" className="space-y-2 mt-4">
                {components.map((component, index) => (
                  <div key={index} className="flex gap-2">
                    <div className="flex-1 relative">
                      <Input
                        value={component.symbol}
                        onChange={(e) =>
                          updateComponent(index, "symbol", e.target.value)
                        }
                        onBlur={(e) => validateSymbol(index, e.target.value)}
                        placeholder="AAPL"
                        className={`pr-10 ${
                          validationStatus[index] === 'invalid'
                            ? 'border-red-500 focus-visible:ring-red-500'
                            : validationStatus[index] === 'valid'
                            ? 'border-green-500 focus-visible:ring-green-500'
                            : ''
                        }`}
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        {validationStatus[index] === 'validating' && (
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        )}
                        {validationStatus[index] === 'valid' && (
                          <Check className="h-4 w-4 text-green-500" />
                        )}
                        {validationStatus[index] === 'invalid' && (
                          <AlertCircle className="h-4 w-4 text-red-500" />
                        )}
                      </div>
                    </div>
                    {useCustomWeights && (
                      <Input
                        type="number"
                        value={component.weight}
                        onChange={(e) =>
                          updateComponent(index, "weight", parseFloat(e.target.value) || 0)
                        }
                        placeholder="Weight"
                        step="0.01"
                        min="0"
                        className="w-32"
                      />
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => removeComponent(index)}
                      disabled={components.length === 1}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}

                <Button
                  type="button"
                  variant="outline"
                  onClick={addComponent}
                  className="w-full"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Symbol
                </Button>
              </TabsContent>

              <TabsContent value="bulk" className="space-y-2 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="bulkInput">Paste Symbols</Label>
                  <Textarea
                    id="bulkInput"
                    value={bulkInput}
                    onChange={(e) => setBulkInput(e.target.value)}
                    placeholder="Paste symbols here in any format:&#10;AAPL, MSFT, GOOGL&#10;or&#10;Buy AAPL and MSFT for growth"
                    rows={6}
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    Supports comma-separated, space-separated, newline-separated, or mixed text.
                    Symbols will be automatically detected, validated, and deduplicated.
                  </p>
                  <Button
                    type="button"
                    onClick={validateAndAddSymbols}
                    disabled={isValidating || !bulkInput.trim()}
                    className="w-full"
                  >
                    {isValidating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isValidating ? "Validating..." : "Validate & Add Symbols"}
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Preview */}
          {components.some((c) => c.symbol.trim() !== "") && (
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <p className="text-sm font-medium">Preview:</p>
              <div className="flex flex-wrap gap-2">
                {components
                  .filter((c) => c.symbol.trim() !== "")
                  .map((c, i) => {
                    const normalizedWeight = useCustomWeights
                      ? (c.weight / totalWeight) * 100
                      : 100 / components.filter((x) => x.symbol.trim() !== "").length;
                    return (
                      <Badge key={i} variant="secondary">
                        {c.symbol} {normalizedWeight.toFixed(1)}%
                      </Badge>
                    );
                  })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-4 mt-6">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/indices")}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading || !name.trim()}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {mode === "create" ? "Create Index" : "Update Index"}
        </Button>
      </div>
    </form>
  );
}
