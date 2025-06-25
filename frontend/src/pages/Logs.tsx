import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { logsAPI } from "@/services/api";

interface ScanLog {
  id: number;
  rfid_uid: string;
  employee_name: string;
  employee_code: string;
  scan_time: string;
  event_type: string;
  device_id: string;
  status: string;
}

export default function Logs() {
  const [logs, setLogs] = useState<ScanLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const response = await logsAPI.getRecent(100);
      setLogs(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error("Error fetching logs:", error);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  const getEventTypeColor = (eventType: string) => {
    switch (eventType.toLowerCase()) {
      case "check-in":
        return "bg-green-100 text-green-800";
      case "check-out":
        return "bg-red-100 text-red-800";
      case "invalid":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
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
        <h1 className="text-3xl font-bold">RFID Scan Logs</h1>
        <div className="flex gap-2">
          <Button variant="outline">Export Logs</Button>
          <Button variant="outline">Clear Logs</Button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Scans</CardTitle>
            <span className="text-2xl">📊</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{logs.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Check-ins</CardTitle>
            <span className="text-2xl">✅</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {
                logs.filter(
                  (log) => log.event_type.toLowerCase() === "check-in"
                ).length
              }
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Check-outs</CardTitle>
            <span className="text-2xl">🚪</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {
                logs.filter(
                  (log) => log.event_type.toLowerCase() === "check-out"
                ).length
              }
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Invalid Scans</CardTitle>
            <span className="text-2xl">⚠️</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {
                logs.filter((log) => log.event_type.toLowerCase() === "invalid")
                  .length
              }
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Scan Logs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead>Employee Code</TableHead>
                  <TableHead>RFID UID</TableHead>
                  <TableHead>Event Type</TableHead>
                  <TableHead>Device ID</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center py-8 text-muted-foreground"
                    >
                      No scan logs found
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => (
                    <TableRow key={log.id} className="hover:bg-muted/50">
                      <TableCell className="font-mono text-sm">
                        {new Date(log.scan_time).toLocaleString("vi-VN")}
                      </TableCell>
                      <TableCell className="font-medium">
                        {log.employee_name}
                      </TableCell>
                      <TableCell className="font-mono">
                        {log.employee_code}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {log.rfid_uid}
                      </TableCell>
                      <TableCell>
                        <Badge className={getEventTypeColor(log.event_type)}>
                          {log.event_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {log.device_id}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            log.status === "success" ? "default" : "secondary"
                          }
                          className={
                            log.status === "success"
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }
                        >
                          {log.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
