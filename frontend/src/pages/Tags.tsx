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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { tagsAPI } from "@/services/api";

interface Tag {
  id: number;
  employee_id: number;
  rfid_uid: string;
  tag_name: string;
  is_active: boolean;
  employee_name: string;
  employee_code: string;
}

export default function Tags() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTags();
  }, []);

  const fetchTags = async () => {
    try {
      const response = await tagsAPI.getAll();
      setTags(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error("Error fetching tags:", error);
      setTags([]);
    } finally {
      setLoading(false);
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
        <h1 className="text-3xl font-bold">RFID Tags Management</h1>
        <Button>Add Tag</Button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tags</CardTitle>
            <span className="text-2xl">🏷️</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tags.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Tags</CardTitle>
            <span className="text-2xl">✅</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {tags.filter((tag) => tag.is_active).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inactive Tags</CardTitle>
            <span className="text-2xl">❌</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {tags.filter((tag) => !tag.is_active).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tags Table */}
      <Card>
        <CardHeader>
          <CardTitle>RFID Tags List</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tag ID</TableHead>
                  <TableHead>RFID UID</TableHead>
                  <TableHead>Tag Name</TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead>Employee Code</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tags.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center py-8 text-muted-foreground"
                    >
                      No RFID tags found
                    </TableCell>
                  </TableRow>
                ) : (
                  tags.map((tag) => (
                    <TableRow key={tag.id} className="hover:bg-muted/50">
                      <TableCell className="font-medium">{tag.id}</TableCell>
                      <TableCell className="font-mono text-sm">
                        {tag.rfid_uid}
                      </TableCell>
                      <TableCell>{tag.tag_name}</TableCell>
                      <TableCell className="font-medium">
                        {tag.employee_name}
                      </TableCell>
                      <TableCell className="font-mono">
                        {tag.employee_code}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={tag.is_active ? "default" : "secondary"}
                          className={
                            tag.is_active
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }
                        >
                          {tag.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline">
                            Edit
                          </Button>
                          <Button size="sm" variant="destructive">
                            Delete
                          </Button>
                        </div>
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
