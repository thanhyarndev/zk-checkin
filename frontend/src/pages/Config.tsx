import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { configAPI } from "@/services/api";

interface SystemConfig {
  checkin_start: string;
  checkin_end: string;
  checkout_start: string;
  checkout_end: string;
  device_ip: string;
  device_port: number;
  auto_clear_logs: boolean;
  log_retention_days: number;
}

export default function Config() {
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const response = await configAPI.get();
      setConfig(response.data);
    } catch (error) {
      console.error("Error fetching config:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!config) return;

    setSaving(true);
    try {
      await configAPI.update(config);
      alert("Configuration saved successfully!");
    } catch (error) {
      console.error("Error saving config:", error);
      alert("Error saving configuration");
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (
    field: keyof SystemConfig,
    value: string | number | boolean
  ) => {
    if (!config) return;
    setConfig({ ...config, [field]: value });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-red-600">Failed to load configuration</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">System Configuration</h1>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save Configuration"}
        </Button>
      </div>

      {/* Time Windows Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Check-in/Check-out Time Windows</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="checkin_start">Check-in Start Time</Label>
              <Input
                id="checkin_start"
                type="time"
                value={config.checkin_start}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  handleInputChange("checkin_start", e.target.value)
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="checkin_end">Check-in End Time</Label>
              <Input
                id="checkin_end"
                type="time"
                value={config.checkin_end}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  handleInputChange("checkin_end", e.target.value)
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="checkout_start">Check-out Start Time</Label>
              <Input
                id="checkout_start"
                type="time"
                value={config.checkout_start}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  handleInputChange("checkout_start", e.target.value)
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="checkout_end">Check-out End Time</Label>
              <Input
                id="checkout_end"
                type="time"
                value={config.checkout_end}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  handleInputChange("checkout_end", e.target.value)
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Device Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>RFID Device Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="device_ip">Device IP Address</Label>
              <Input
                id="device_ip"
                type="text"
                value={config.device_ip}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  handleInputChange("device_ip", e.target.value)
                }
                placeholder="192.168.1.100"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="device_port">Device Port</Label>
              <Input
                id="device_port"
                type="number"
                value={config.device_port}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  handleInputChange("device_port", parseInt(e.target.value))
                }
                placeholder="4370"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logging Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Logging Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Auto Clear Logs</Label>
              <p className="text-sm text-muted-foreground">
                Automatically clear old logs to save storage space
              </p>
            </div>
            <Switch
              checked={config.auto_clear_logs}
              onCheckedChange={(checked: boolean) =>
                handleInputChange("auto_clear_logs", checked)
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="log_retention_days">Log Retention (Days)</Label>
            <Input
              id="log_retention_days"
              type="number"
              value={config.log_retention_days}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                handleInputChange(
                  "log_retention_days",
                  parseInt(e.target.value)
                )
              }
              placeholder="30"
              min="1"
              max="365"
            />
            <p className="text-sm text-muted-foreground">
              Number of days to keep logs before auto-clearing
            </p>
          </div>
        </CardContent>
      </Card>

      {/* System Actions */}
      <Card>
        <CardHeader>
          <CardTitle>System Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Button variant="outline" onClick={() => window.location.reload()}>
              Refresh System
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                if (confirm("Are you sure you want to clear all logs?")) {
                  // Handle clear logs
                }
              }}
            >
              Clear All Logs
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                if (confirm("Are you sure you want to reset the database?")) {
                  // Handle reset database
                }
              }}
            >
              Reset Database
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
