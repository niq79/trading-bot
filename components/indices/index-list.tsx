"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface SyntheticIndex {
  id: string;
  user_id: string;
  name: string;
  components: string[];
  weights: number[] | null;
  created_at: string;
}

interface IndexListProps {
  indices: SyntheticIndex[];
}

export function IndexList({ indices }: IndexListProps) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this index?")) {
      return;
    }

    setDeletingId(id);
    try {
      const response = await fetch(`/api/indices/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete index");
      }

      toast.success("Index deleted successfully");
      router.refresh();
    } catch (error) {
      console.error("Error deleting index:", error);
      toast.error("Failed to delete index");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {indices.map((index) => {
        const hasWeights = index.weights && index.weights.length > 0;

        return (
          <Card key={index.id}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <CardTitle className="text-lg">{index.name}</CardTitle>
                <Badge variant="outline">
                  {index.components.length} symbols
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium mb-2">Components:</p>
                  <div className="flex flex-wrap gap-1">
                    {index.components.slice(0, 8).map((symbol, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {symbol}
                        {hasWeights && index.weights[i] && (
                          <span className="ml-1 text-muted-foreground">
                            {(index.weights[i] * 100).toFixed(0)}%
                          </span>
                        )}
                      </Badge>
                    ))}
                    {index.components.length > 8 && (
                      <Badge variant="outline" className="text-xs">
                        +{index.components.length - 8} more
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm" asChild className="flex-1">
                    <Link href={`/indices/${index.id}`}>Edit</Link>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(index.id)}
                    disabled={deletingId === index.id}
                    className="text-destructive hover:text-destructive"
                  >
                    {deletingId === index.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
