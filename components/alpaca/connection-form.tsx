"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, CheckCircle, XCircle, ExternalLink } from "lucide-react";

interface AlpacaAccount {
  id: string;
  account_number: string;
  status: string;
  buying_power: string;
  equity: string;
  cash: string;
}

interface ConnectionFormProps {
  onConnect?: () => void;
}

export function ConnectionForm({ onConnect }: ConnectionFormProps) {
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [account, setAccount] = useState<AlpacaAccount | null>(null);

  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    setIsChecking(true);
    try {
      const response = await fetch("/api/alpaca/validate");
      const data = await response.json();
      setIsConnected(data.connected);
      if (data.account) {
        setAccount(data.account);
      }
    } catch (error) {
      console.error("Error checking connection:", error);
    } finally {
      setIsChecking(false);
    }
  };

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch("/api/alpaca/validate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ apiKey, apiSecret }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Failed to connect");
        return;
      }

      setAccount(data.account);
      setIsConnected(true);
      toast.success("Alpaca account connected successfully!");
      setApiKey("");
      setApiSecret("");
      onConnect?.();
    } catch (error) {
      console.error("Error connecting:", error);
      toast.error("Failed to connect to Alpaca");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setIsLoading(true);

    try {
      const response = await fetch("/api/alpaca/validate", {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        toast.error(data.error || "Failed to disconnect");
        return;
      }

      setIsConnected(false);
      setAccount(null);
      toast.success("Alpaca account disconnected");
    } catch (error) {
      console.error("Error disconnecting:", error);
      toast.error("Failed to disconnect");
    } finally {
      setIsLoading(false);
    }
  };

  if (isChecking) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (isConnected) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle>Alpaca Connection</CardTitle>
              <CardDescription>Your paper trading account is connected</CardDescription>
            </div>
            <Badge variant="success" className="flex items-center gap-1">
              <CheckCircle className="h-3 w-3" />
              Connected
            </Badge>
          </div>
        </CardHeader>
        {account && (
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Account Number</p>
                <p className="font-medium">{account.account_number}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Equity</p>
                <p className="font-medium">
                  ${parseFloat(account.equity).toLocaleString()}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Buying Power</p>
                <p className="font-medium">
                  ${parseFloat(account.buying_power).toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        )}
        <CardFooter>
          <Button variant="destructive" onClick={handleDisconnect} disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Disconnect
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle>Connect Alpaca Account</CardTitle>
            <CardDescription>
              Enter your Alpaca paper trading API credentials
            </CardDescription>
          </div>
          <Badge variant="secondary" className="flex items-center gap-1">
            <XCircle className="h-3 w-3" />
            Not Connected
          </Badge>
        </div>
      </CardHeader>
      <form onSubmit={handleConnect}>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-muted p-4 text-sm">
            <p className="font-medium mb-2">How to get your API keys:</p>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
              <li>Sign up for an Alpaca account at alpaca.markets</li>
              <li>Go to Paper Trading in your dashboard</li>
              <li>Navigate to API Keys section</li>
              <li>Generate new API keys for paper trading</li>
            </ol>
            <a
              href="https://app.alpaca.markets/paper/dashboard/overview"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 mt-3 text-primary hover:underline"
            >
              Open Alpaca Dashboard
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>

          <div className="space-y-2">
            <Label htmlFor="apiKey">API Key</Label>
            <Input
              id="apiKey"
              type="text"
              placeholder="PKXXXXXXXXXXXXXXXX"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="apiSecret">API Secret</Label>
            <Input
              id="apiSecret"
              type="password"
              placeholder="••••••••••••••••••••••••••••••••"
              value={apiSecret}
              onChange={(e) => setApiSecret(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={isLoading || !apiKey || !apiSecret}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Connect Account
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
