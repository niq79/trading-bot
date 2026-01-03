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
import { Loader2, Plus, X } from "lucide-react";

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
    } else {
      updated[index].weight = value as number;
    }
    setComponents(updated);
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

            <div className="space-y-2">
              {components.map((component, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={component.symbol}
                    onChange={(e) =>
                      updateComponent(index, "symbol", e.target.value)
                    }
                    placeholder="AAPL"
                    className="flex-1"
                  />
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
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={addComponent}
              className="w-full"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Symbol
            </Button>
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
