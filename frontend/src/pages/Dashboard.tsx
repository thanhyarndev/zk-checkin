import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { io, Socket } from "socket.io-client";
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
import { attendanceAPI, configAPI, readerAPI } from "@/services/api";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface AttendanceRecord {
  id: number;
  name: string;
  rfid_uids: string;
  check_in_time: string | null;
  check_out_time: string | null;
  status: string;
}

interface SystemConfig {
  checkin_start: string;
  checkin_end: string;
  checkout_start: string;
  checkout_end: string;
}

interface ReaderStatus {
  running: boolean;
}

const SOCKET_URL = "http://localhost:3000";

export default function Dashboard() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [readerStatus, setReaderStatus] = useState<ReaderStatus>({
    running: false,
  });
  const [readerLoading, setReaderLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);

  const fetchData = async () => {
    try {
      const [attendanceRes, configRes] = await Promise.all([
        attendanceAPI.getAll(),
        configAPI.get(),
      ]);

      setRecords(Array.isArray(attendanceRes.data) ? attendanceRes.data : []);
      setConfig(configRes.data);
    } catch (error) {
      console.error("Error fetching data:", error);
      setRecords([]);
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    fetchReaderStatus();

    // Update current time every second
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    // Setup socket.io connection for real-time updates
    const s = io(SOCKET_URL);
    setSocket(s);
    s.on("employee_status_update", (data) => {
      toast.success(data.message || `${data.name} ${data.action}`);
      fetchData();
    });

    return () => {
      clearInterval(timeInterval);
      s.disconnect();
    };
  }, []);

  const fetchReaderStatus = async () => {
    try {
      const response = await readerAPI.getStatus();
      setReaderStatus(response.data);
    } catch (error) {
      console.error("Error fetching reader status:", error);
      toast.error("Failed to load reader status");
    }
  };

  const handleReaderControl = async (action: "start" | "stop") => {
    setReaderLoading(true);
    try {
      if (action === "start") {
        await readerAPI.start();
        toast.success("Reader started successfully!");
      } else {
        await readerAPI.stop();
        toast.success("Reader stopped successfully!");
      }
      await fetchReaderStatus();
    } catch (error) {
      console.error(`Error ${action}ing reader:`, error);
      toast.error(`Failed to ${action} reader`);
    } finally {
      setReaderLoading(false);
    }
  };

  const handleClearTodayData = async () => {
    try {
      await attendanceAPI.clearToday();
      toast.success("Today's data cleared successfully!");
      fetchData(); // Refresh attendance data
    } catch (error) {
      console.error("Error clearing data:", error);
      toast.error("Failed to clear today's data");
    } finally {
      setShowClearDialog(false);
    }
  };

  const presentCount = records.filter((r) => r.status === "present").length;
  const absentCount = records.filter((r) => r.status === "absent").length;
  const totalCount = records.length;

  // Helper to determine status label and color
  function getStatus(record: AttendanceRecord) {
    if (record.check_in_time && record.check_out_time) {
      return {
        label: "Left",
        color: "bg-blue-100 text-blue-800",
        variant: "secondary",
      };
    } else if (record.check_in_time) {
      return {
        label: "Present",
        color: "bg-green-100 text-green-800",
        variant: "default",
      };
    } else {
      return {
        label: "Absent",
        color: "bg-red-100 text-red-800",
        variant: "secondary",
      };
    }
  }

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
        <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => setShowClearDialog(true)}>
            Clear Today's Data
          </Button>
          <div className="text-sm text-slate-500">
            {currentTime.toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </div>
        </div>
      </div>

      {/* Compact Reader Control, Time Windows & System Time Section */}
      <Card className="bg-gradient-to-r from-blue-50 to-emerald-50 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <span className="text-2xl">📡</span>
            <span>RFID Check-in System</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row md:items-stretch md:justify-between gap-6">
            {/* Left: Reader Control & Time Windows */}
            <div className="flex-1 flex flex-col gap-4 justify-between min-w-[260px]">
              {/* Reader Control */}
              <div className="flex flex-col gap-2 bg-white/80 rounded-lg p-4 shadow border border-blue-100">
                <div className="flex items-center gap-3 mb-2">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      readerStatus.running ? "bg-green-500" : "bg-red-500"
                    }`}
                  ></div>
                  <span className="font-medium">
                    {readerStatus.running ? "Reader Running" : "Reader Stopped"}
                  </span>
                  <Badge
                    variant={readerStatus.running ? "default" : "secondary"}
                  >
                    {readerStatus.running ? "Online" : "Offline"}
                  </Badge>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleReaderControl("start")}
                    disabled={readerStatus.running || readerLoading}
                    variant="outline"
                    size="sm"
                  >
                    {readerLoading ? "Starting..." : "Start Reader"}
                  </Button>
                  <Button
                    onClick={() => handleReaderControl("stop")}
                    disabled={!readerStatus.running || readerLoading}
                    variant="outline"
                    size="sm"
                  >
                    {readerLoading ? "Stopping..." : "Stop Reader"}
                  </Button>
                </div>
              </div>
              {/* Time Windows */}
              <div className="flex flex-col gap-2 bg-white/80 rounded-lg p-4 shadow border border-blue-100">
                <div className="flex flex-wrap gap-4 justify-center">
                  <div className="flex flex-col items-center min-w-[110px]">
                    <span className="text-xs text-slate-500">Check-in</span>
                    <span className="font-mono text-lg font-semibold text-blue-700">
                      {config?.checkin_start} - {config?.checkin_end}
                    </span>
                  </div>
                  <div className="flex flex-col items-center min-w-[110px]">
                    <span className="text-xs text-slate-500">Check-out</span>
                    <span className="font-mono text-lg font-semibold text-red-700">
                      {config?.checkout_start} - {config?.checkout_end}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            {/* Right: System Time */}
            <div className="flex-1 flex flex-col justify-center items-center bg-white/80 rounded-lg p-6 shadow border border-indigo-100 min-w-[260px]">
              <div className="text-3xl font-bold text-blue-600 mb-1">
                {currentTime.toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </div>
              <div className="text-lg text-slate-700 mb-1">
                {currentTime.toLocaleDateString("en-US", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                })}
              </div>
              <div className="text-base text-indigo-600 font-semibold">
                {currentTime.toLocaleDateString("en-US", { weekday: "long" })}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Total Employees
            </CardTitle>
            <span className="text-2xl">👥</span>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalCount}</div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Present Today
            </CardTitle>
            <span className="text-2xl">✅</span>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {presentCount}
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Absent Today
            </CardTitle>
            <span className="text-2xl">❌</span>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{absentCount}</div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Attendance Rate
            </CardTitle>
            <span className="text-2xl">📊</span>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">
              {totalCount > 0
                ? Math.round((presentCount / totalCount) * 100)
                : 0}
              %
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Attendance Table */}
      <Card>
        <CardHeader>
          <CardTitle>Today's Attendance</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>RFID UIDs</TableHead>
                <TableHead>Check-in Time</TableHead>
                <TableHead>Check-out Time</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center py-8 text-slate-500"
                  >
                    No attendance records found
                  </TableCell>
                </TableRow>
              ) : (
                records.map((record) => {
                  const status = getStatus(record);
                  return (
                    <TableRow key={record.id} className="hover:bg-slate-50">
                      <TableCell className="font-medium">
                        {record.name}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {record.rfid_uids}
                      </TableCell>
                      <TableCell className="font-mono">
                        {record.check_in_time
                          ? new Date(record.check_in_time).toLocaleTimeString(
                              "en-US"
                            )
                          : "—"}
                      </TableCell>
                      <TableCell className="font-mono">
                        {record.check_out_time
                          ? new Date(record.check_out_time).toLocaleTimeString(
                              "en-US"
                            )
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={status.variant as any}
                          className={status.color}
                        >
                          {status.label}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Clear Today Data Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showClearDialog}
        title="Clear Today's Data"
        message="Are you sure you want to clear all today's attendance data and scan logs? This action cannot be undone."
        confirmText="Clear Data"
        cancelText="Cancel"
        variant="danger"
        onConfirm={handleClearTodayData}
        onCancel={() => setShowClearDialog(false)}
      />
    </div>
  );
}
