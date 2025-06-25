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
import { attendanceAPI, configAPI, readerAPI } from "@/services/api";

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

export default function Dashboard() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [readerStatus, setReaderStatus] = useState<ReaderStatus>({
    running: false,
  });
  const [readerLoading, setReaderLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

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

    return () => clearInterval(timeInterval);
  }, []);

  const fetchReaderStatus = async () => {
    try {
      const response = await readerAPI.getStatus();
      setReaderStatus(response.data);
    } catch (error) {
      console.error("Error fetching reader status:", error);
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
    } catch (error) {
      console.error(`Error ${action}ing reader:`, error);
    } finally {
      setReaderLoading(false);
    }
  };

  const handleClearTodayData = async () => {
    if (
      confirm(
        "Are you sure you want to clear all today's data? This action cannot be undone."
      )
    ) {
      try {
        await attendanceAPI.clearToday();
        alert("Today's data cleared successfully!");
        fetchData(); // Refresh attendance data
      } catch (error) {
        console.error("Error clearing data:", error);
        alert("Error clearing today's data");
      }
    }
  };

  const presentCount = records.filter((r) => r.status === "present").length;
  const absentCount = records.filter((r) => r.status === "absent").length;
  const totalCount = records.length;

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
          <Button variant="outline" onClick={handleClearTodayData}>
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

      {/* System Time Section */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <span className="text-2xl">🕐</span>
            <span>System Time</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">
                {currentTime.toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </div>
              <div className="text-sm text-slate-600 mt-1">Current Time</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-semibold text-slate-700">
                {currentTime.toLocaleDateString("en-US", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                })}
              </div>
              <div className="text-sm text-slate-600 mt-1">Date</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-semibold text-slate-700">
                {currentTime.toLocaleDateString("en-US", { weekday: "long" })}
              </div>
              <div className="text-sm text-slate-600 mt-1">Day of Week</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reader Control Section */}
      <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <span className="text-2xl">📡</span>
            <span>RFID Reader Control</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div
                  className={`w-3 h-3 rounded-full ${
                    readerStatus.running ? "bg-green-500" : "bg-red-500"
                  }`}
                ></div>
                <span className="font-medium">
                  {readerStatus.running ? "Reader Running" : "Reader Stopped"}
                </span>
              </div>
              <Badge variant={readerStatus.running ? "default" : "secondary"}>
                {readerStatus.running ? "Online" : "Offline"}
              </Badge>
            </div>
            <div className="flex space-x-3">
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
            <div className="text-3xl font-bold text-slate-900">
              {totalCount}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Registered staff members
            </p>
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
            <p className="text-xs text-slate-500 mt-1">Checked in today</p>
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
            <p className="text-xs text-slate-500 mt-1">Not checked in</p>
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

      {/* Time Windows */}
      {config && (
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <span className="text-xl">⏰</span>
              <span>Check-in/Check-out Time Windows</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="font-medium text-slate-600 text-sm">
                  Check-in Start
                </div>
                <div className="text-xl font-bold text-blue-600 mt-1">
                  {config.checkin_start}
                </div>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="font-medium text-slate-600 text-sm">
                  Check-in End
                </div>
                <div className="text-xl font-bold text-blue-600 mt-1">
                  {config.checkin_end}
                </div>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <div className="font-medium text-slate-600 text-sm">
                  Check-out Start
                </div>
                <div className="text-xl font-bold text-red-600 mt-1">
                  {config.checkout_start}
                </div>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <div className="font-medium text-slate-600 text-sm">
                  Check-out End
                </div>
                <div className="text-xl font-bold text-red-600 mt-1">
                  {config.checkout_end}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Attendance Table */}
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <span className="text-xl">📊</span>
            <span>Today's Attendance</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">#</TableHead>
                  <TableHead>Employee Name</TableHead>
                  <TableHead>RFID UID</TableHead>
                  <TableHead>Check-in Time</TableHead>
                  <TableHead>Check-out Time</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center py-8 text-slate-500"
                    >
                      No attendance records found
                    </TableCell>
                  </TableRow>
                ) : (
                  records.map((record, index) => (
                    <TableRow key={record.id} className="hover:bg-slate-50">
                      <TableCell className="font-medium">{index + 1}</TableCell>
                      <TableCell className="font-medium">
                        {record.name}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {record.rfid_uids || "—"}
                      </TableCell>
                      <TableCell>
                        {record.check_in_time
                          ? new Date(record.check_in_time).toLocaleTimeString(
                              "en-US"
                            )
                          : "—"}
                      </TableCell>
                      <TableCell>
                        {record.check_out_time
                          ? new Date(record.check_out_time).toLocaleTimeString(
                              "en-US"
                            )
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            record.status === "present"
                              ? "default"
                              : "secondary"
                          }
                          className={
                            record.status === "present"
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }
                        >
                          {record.status === "present" ? "Present" : "Absent"}
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
