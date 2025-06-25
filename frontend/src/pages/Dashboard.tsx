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
import { attendanceAPI, configAPI } from "@/services/api";

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

export default function Dashboard() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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

    fetchData();
  }, []);

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
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <div className="text-sm text-muted-foreground">
          {new Date().toLocaleDateString("vi-VN", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Employees
            </CardTitle>
            <span className="text-2xl">👥</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Present Today</CardTitle>
            <span className="text-2xl">✅</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {presentCount}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Absent Today</CardTitle>
            <span className="text-2xl">❌</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{absentCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Time Windows */}
      {config && (
        <Card>
          <CardHeader>
            <CardTitle>Check-in/Check-out Time Windows</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="font-medium text-muted-foreground">
                  Check-in Start
                </div>
                <div className="text-lg font-semibold">
                  {config.checkin_start}
                </div>
              </div>
              <div>
                <div className="font-medium text-muted-foreground">
                  Check-in End
                </div>
                <div className="text-lg font-semibold">
                  {config.checkin_end}
                </div>
              </div>
              <div>
                <div className="font-medium text-muted-foreground">
                  Check-out Start
                </div>
                <div className="text-lg font-semibold">
                  {config.checkout_start}
                </div>
              </div>
              <div>
                <div className="font-medium text-muted-foreground">
                  Check-out End
                </div>
                <div className="text-lg font-semibold">
                  {config.checkout_end}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Attendance Table */}
      <Card>
        <CardHeader>
          <CardTitle>Today's Attendance</CardTitle>
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
                      className="text-center py-8 text-muted-foreground"
                    >
                      No attendance records found
                    </TableCell>
                  </TableRow>
                ) : (
                  records.map((record, index) => (
                    <TableRow key={record.id} className="hover:bg-muted/50">
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
                              "vi-VN"
                            )
                          : "—"}
                      </TableCell>
                      <TableCell>
                        {record.check_out_time
                          ? new Date(record.check_out_time).toLocaleTimeString(
                              "vi-VN"
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
