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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { logsAPI, attendanceAPI } from "@/services/api";

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
  const [filteredLogs, setFilteredLogs] = useState<ScanLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [logsPerPage] = useState(20);
  const [searchTerm, setSearchTerm] = useState("");
  const [eventTypeFilter, setEventTypeFilter] = useState("all");
  const [pageInput, setPageInput] = useState("");

  useEffect(() => {
    fetchLogs();
  }, []);

  useEffect(() => {
    filterLogs();
  }, [logs, searchTerm, eventTypeFilter]);

  const fetchLogs = async () => {
    try {
      const response = await logsAPI.getRecent(1000); // Get more logs
      setLogs(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error("Error fetching logs:", error);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  const filterLogs = () => {
    let filtered = logs;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(
        (log) =>
          log.employee_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          log.employee_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
          log.rfid_uid.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by event type
    if (eventTypeFilter !== "all") {
      filtered = filtered.filter(
        (log) => log.event_type.toLowerCase() === eventTypeFilter.toLowerCase()
      );
    }

    setFilteredLogs(filtered);
    setCurrentPage(1); // Reset to first page when filtering
  };

  const getEventTypeColor = (eventType: string) => {
    switch (eventType.toLowerCase()) {
      case "checkin":
      case "check-in":
        return "bg-green-100 text-green-800";
      case "checkout":
      case "check-out":
        return "bg-red-100 text-red-800";
      case "ignored":
        return "bg-yellow-100 text-yellow-800";
      case "unknown_employee":
        return "bg-orange-100 text-orange-800";
      case "outside_hours":
        return "bg-purple-100 text-purple-800";
      case "recent_scan":
        return "bg-blue-100 text-blue-800";
      case "already_checked_in":
        return "bg-indigo-100 text-indigo-800";
      case "already_checked_out":
        return "bg-pink-100 text-pink-800";
      case "no_checkin":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getEventTypeDisplay = (eventType: string) => {
    switch (eventType.toLowerCase()) {
      case "checkin":
      case "check-in":
        return "Check-in";
      case "checkout":
      case "check-out":
        return "Check-out";
      case "ignored":
        return "Ignored";
      case "unknown_employee":
        return "Unknown Employee";
      case "outside_hours":
        return "Outside Hours";
      case "recent_scan":
        return "Recent Scan";
      case "already_checked_in":
        return "Already Checked-in";
      case "already_checked_out":
        return "Already Checked-out";
      case "no_checkin":
        return "No Check-in";
      default:
        return eventType;
    }
  };

  // Pagination
  const indexOfLastLog = currentPage * logsPerPage;
  const indexOfFirstLog = indexOfLastLog - logsPerPage;
  const currentLogs = filteredLogs.slice(indexOfFirstLog, indexOfLastLog);
  const totalPages = Math.ceil(filteredLogs.length / logsPerPage);

  const paginate = (pageNumber: number) => {
    if (pageNumber >= 1 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
      setPageInput("");
    }
  };

  const handlePageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPageInput(e.target.value);
  };

  const handlePageInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const pageNumber = parseInt(pageInput);
    if (pageNumber >= 1 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
      setPageInput("");
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
        fetchLogs(); // Refresh logs
      } catch (error) {
        console.error("Error clearing data:", error);
        alert("Error clearing today's data");
      }
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
          <Button variant="outline" onClick={handleClearTodayData}>
            Clear Today's Data
          </Button>
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
                logs.filter((log) => log.event_type.toLowerCase() === "checkin")
                  .length
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
                  (log) => log.event_type.toLowerCase() === "checkout"
                ).length
              }
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ignored Scans</CardTitle>
            <span className="text-2xl">⚠️</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {
                logs.filter((log) => log.event_type.toLowerCase() === "ignored")
                  .length
              }
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">
                Search
              </label>
              <Input
                placeholder="Search by name, code, or RFID UID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">
                Event Type
              </label>
              <Select
                value={eventTypeFilter}
                onValueChange={setEventTypeFilter}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select event type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Events</SelectItem>
                  <SelectItem value="checkin">Check-in</SelectItem>
                  <SelectItem value="checkout">Check-out</SelectItem>
                  <SelectItem value="ignored">Ignored</SelectItem>
                  <SelectItem value="unknown_employee">
                    Unknown Employee
                  </SelectItem>
                  <SelectItem value="outside_hours">Outside Hours</SelectItem>
                  <SelectItem value="recent_scan">Recent Scan</SelectItem>
                  <SelectItem value="already_checked_in">
                    Already Checked-in
                  </SelectItem>
                  <SelectItem value="already_checked_out">
                    Already Checked-out
                  </SelectItem>
                  <SelectItem value="no_checkin">No Check-in</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm("");
                  setEventTypeFilter("all");
                }}
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Recent Scan Logs ({filteredLogs.length} results)
          </CardTitle>
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
                {currentLogs.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center py-8 text-slate-500"
                    >
                      No scan logs found
                    </TableCell>
                  </TableRow>
                ) : (
                  currentLogs.map((log) => (
                    <TableRow key={log.id} className="hover:bg-slate-50">
                      <TableCell className="font-mono text-sm">
                        {new Date(log.scan_time).toLocaleString("en-US")}
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
                          {getEventTypeDisplay(log.event_type)}
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

          {/* Improved Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-slate-500">
                Showing {indexOfFirstLog + 1} to{" "}
                {Math.min(indexOfLastLog, filteredLogs.length)} of{" "}
                {filteredLogs.length} results
              </div>
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => paginate(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>

                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-600">Page</span>
                  <span className="font-medium">{currentPage}</span>
                  <span className="text-sm text-slate-600">
                    of {totalPages}
                  </span>
                </div>

                <form
                  onSubmit={handlePageInputSubmit}
                  className="flex items-center gap-2"
                >
                  <span className="text-sm text-slate-600">Go to:</span>
                  <Input
                    type="number"
                    min="1"
                    max={totalPages}
                    value={pageInput}
                    onChange={handlePageInputChange}
                    className="w-16 h-8 text-center"
                    placeholder="Page"
                  />
                  <Button type="submit" size="sm" variant="outline">
                    Go
                  </Button>
                </form>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => paginate(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
