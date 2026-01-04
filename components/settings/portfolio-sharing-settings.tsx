"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Share2, Copy, Eye, EyeOff, Loader2 } from "lucide-react";

interface PortfolioSettings {
  visibility: "private" | "public_anonymous" | "public_full";
  public_username: string | null;
  show_strategies: boolean;
  show_performance: boolean;
  custom_title: string | null;
  custom_description: string | null;
}

export function PortfolioSharingSettings() {
  const [settings, setSettings] = useState<PortfolioSettings>({
    visibility: "private",
    public_username: null,
    show_strategies: true,
    show_performance: true,
    custom_title: null,
    custom_description: null,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  async function fetchSettings() {
    try {
      const response = await fetch("/api/portfolio-settings");
      if (response.ok) {
        const data = await response.json();
        if (data.settings) {
          setSettings(data.settings);
        }
      }
    } catch (error) {
      console.error("Failed to fetch settings:", error);
    } finally {
      setLoading(false);
    }
  }

  async function saveSettings() {
    setSaving(true);
    try {
      const response = await fetch("/api/portfolio-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save settings");
      }

      toast.success("Portfolio settings saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  function copyShareUrl() {
    if (!settings.public_username) return;
    
    const url = `${window.location.origin}/portfolio/${settings.public_username}`;
    navigator.clipboard.writeText(url);
    toast.success("Share URL copied to clipboard");
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  const isPublic = settings.visibility !== "private";
  const shareUrl = settings.public_username
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/portfolio/${settings.public_username}`
    : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Share2 className="h-5 w-5" />
          Portfolio Sharing
        </CardTitle>
        <CardDescription>
          Share your portfolio publicly with a custom URL
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Visibility Level */}
        <div className="space-y-2">
          <Label htmlFor="visibility">Visibility</Label>
          <Select
            value={settings.visibility}
            onValueChange={(value: any) => setSettings({ ...settings, visibility: value })}
          >
            <SelectTrigger id="visibility">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="private">
                <div className="flex items-center gap-2">
                  <EyeOff className="h-4 w-4" />
                  <span>Private - Only you can see</span>
                </div>
              </SelectItem>
              <SelectItem value="public_anonymous">
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  <span>Public - Positions only (no dollar amounts)</span>
                </div>
              </SelectItem>
              <SelectItem value="public_full">
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  <span>Public - Full details (includes dollar amounts)</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Public Username */}
        <div className="space-y-2">
          <Label htmlFor="public_username">Public Username</Label>
          <Input
            id="public_username"
            placeholder="your-username"
            value={settings.public_username || ""}
            onChange={(e) => setSettings({ ...settings, public_username: e.target.value || null })}
            disabled={!isPublic}
          />
          <p className="text-xs text-muted-foreground">
            Your portfolio will be available at: /portfolio/your-username
          </p>
        </div>

        {/* Share URL */}
        {isPublic && shareUrl && (
          <div className="space-y-2">
            <Label>Share URL</Label>
            <div className="flex gap-2">
              <Input value={shareUrl} readOnly className="font-mono text-sm" />
              <Button onClick={copyShareUrl} variant="outline" size="icon">
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Display Options */}
        {isPublic && (
          <>
            <div className="space-y-4 pt-4 border-t">
              <h4 className="font-medium">Display Options</h4>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="show_strategies">Show Active Strategies</Label>
                  <p className="text-xs text-muted-foreground">Display your active trading strategies</p>
                </div>
                <Switch
                  id="show_strategies"
                  checked={settings.show_strategies}
                  onCheckedChange={(checked) => setSettings({ ...settings, show_strategies: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="show_performance">Show Performance</Label>
                  <p className="text-xs text-muted-foreground">Display daily P/L and total equity</p>
                </div>
                <Switch
                  id="show_performance"
                  checked={settings.show_performance}
                  onCheckedChange={(checked) => setSettings({ ...settings, show_performance: checked })}
                />
              </div>
            </div>

            {/* Customization */}
            <div className="space-y-4 pt-4 border-t">
              <h4 className="font-medium">Customization</h4>

              <div className="space-y-2">
                <Label htmlFor="custom_title">Display Name</Label>
                <Input
                  id="custom_title"
                  placeholder="Your name or alias"
                  value={settings.custom_title || ""}
                  onChange={(e) => setSettings({ ...settings, custom_title: e.target.value || null })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="custom_description">Description</Label>
                <Textarea
                  id="custom_description"
                  placeholder="Tell people about your trading strategy..."
                  value={settings.custom_description || ""}
                  onChange={(e) => setSettings({ ...settings, custom_description: e.target.value || null })}
                  rows={3}
                />
              </div>
            </div>
          </>
        )}

        {/* Save Button */}
        <div className="flex justify-between items-center pt-4 border-t">
          <div className="flex items-center gap-2">
            {isPublic ? (
              <Badge variant="default">Public</Badge>
            ) : (
              <Badge variant="secondary">Private</Badge>
            )}
          </div>
          <Button onClick={saveSettings} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Settings
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
