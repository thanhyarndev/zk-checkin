import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { configAPI, readerAPI } from "@/services/api";

interface SystemConfig {
  checkin_start: string;
  checkin_end: string;
  checkout_start: string;
  checkout_end: string;
  scan_cooldown: string;
  reader_id: string;
}

interface ReaderStatus {
  running: boolean;
}

export default function Config() {
  const [config, setConfig] = useState<SystemConfig>({
    checkin_start: "08:45",
    checkin_end: "09:15",
    checkout_start: "17:45",
    checkout_end: "18:15",
    scan_cooldown: "10",
    reader_id: "MAIN_ENTRANCE",
  });
  const [readerStatus, setReaderStatus] = useState<ReaderStatus>({
    running: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [readerLoading, setReaderLoading] = useState(false);

  useEffect(() => {
    fetchConfig();
    fetchReaderStatus();
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

  const fetchReaderStatus = async () => {
    try {
      const response = await readerAPI.getStatus();
      setReaderStatus(response.data);
    } catch (error) {
      console.error("Error fetching reader status:", error);
    }
  };

  const handleSaveConfig = async () => {
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

  const handleReaderControl = async (action: "start" | "stop") => {
    setReaderLoading(true);
    try {
      if (action === "start") {
        await readerAPI.start();
      } else {
        await readerAPI.stop();
      }
      await fetchReaderStatus();
      alert(
        `Reader ${action === "start" ? "started" : "stopped"} successfully!`
      );
    } catch (error) {
      console.error(`Error ${action}ing reader:`, error);
      alert(`Error ${action}ing reader`);
    } finally {
      setReaderLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-slate-900">
          System Configuration
        </h1>
        <Button onClick={handleSaveConfig} disabled={saving}>
          {saving ? "Saving..." : "Save Configuration"}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Time Window Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <span className="text-2xl">⏰</span>
              <span>Time Window Settings</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="checkin_start">Check-in Start Time</Label>
                <Input
                  id="checkin_start"
                  type="time"
                  value={config.checkin_start}
                  onChange={(e) =>
                    setConfig({ ...config, checkin_start: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="checkin_end">Check-in End Time</Label>
                <Input
                  id="checkin_end"
                  type="time"
                  value={config.checkin_end}
                  onChange={(e) =>
                    setConfig({ ...config, checkin_end: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="checkout_start">Check-out Start Time</Label>
                <Input
                  id="checkout_start"
                  type="time"
                  value={config.checkout_start}
                  onChange={(e) =>
                    setConfig({ ...config, checkout_start: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="checkout_end">Check-out End Time</Label>
                <Input
                  id="checkout_end"
                  type="time"
                  value={config.checkout_end}
                  onChange={(e) =>
                    setConfig({ ...config, checkout_end: e.target.value })
                  }
                />
              </div>
            </div>
            <div>
              <Label htmlFor="scan_cooldown">Scan Cooldown (seconds)</Label>
              <Input
                id="scan_cooldown"
                type="number"
                min="1"
                max="60"
                value={config.scan_cooldown}
                onChange={(e) =>
                  setConfig({ ...config, scan_cooldown: e.target.value })
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* RFID Device Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <span className="text-2xl">📡</span>
              <span>RFID Device Settings</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label htmlFor="reader_id">Device ID</Label>
              <Input
                id="reader_id"
                value={config.reader_id}
                onChange={(e) =>
                  setConfig({ ...config, reader_id: e.target.value })
                }
                placeholder="e.g., MAIN_ENTRANCE"
              />
            </div>

            {/* Reader Control */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-medium">Reader Status</Label>
                  <div className="text-sm text-slate-500">
                    {readerStatus.running ? "Running" : "Stopped"}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      readerStatus.running ? "bg-green-500" : "bg-red-500"
                    }`}
                  ></div>
                  <span className="text-sm font-medium">
                    {readerStatus.running ? "Online" : "Offline"}
                  </span>
                </div>
              </div>

              <div className="flex space-x-3">
                <Button
                  onClick={() => handleReaderControl("start")}
                  disabled={readerStatus.running || readerLoading}
                  className="flex-1"
                  variant="outline"
                >
                  {readerLoading ? "Starting..." : "Start Reader"}
                </Button>
                <Button
                  onClick={() => handleReaderControl("stop")}
                  disabled={!readerStatus.running || readerLoading}
                  className="flex-1"
                  variant="outline"
                >
                  {readerLoading ? "Stopping..." : "Stop Reader"}
                </Button>
              </div>
            </div>

            {/* Device Information */}
            <div className="bg-slate-50 p-4 rounded-lg">
              <h4 className="font-medium text-slate-900 mb-2">
                Device Information
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">Connection:</span>
                  <span className="font-mono">/dev/cu.usbserial-10</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Baud Rate:</span>
                  <span className="font-mono">57600</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Protocol:</span>
                  <span className="font-mono">UHF RFID</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <span className="text-2xl">ℹ️</span>
            <span>System Information</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                RFID Checkin
              </div>
              <div className="text-sm text-slate-600 mt-1">System Version</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                Flask + React
              </div>
              <div className="text-sm text-slate-600 mt-1">
                Technology Stack
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">SQLite</div>
              <div className="text-sm text-slate-600 mt-1">Database</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
