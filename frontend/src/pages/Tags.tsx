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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { tagsAPI, employeesAPI } from "@/services/api";

interface Tag {
  id: number;
  employee_id: number;
  rfid_uid: string;
  tag_name: string;
  is_active: boolean;
  created_at: string;
  employee_name: string;
  employee_code: string;
}

interface Employee {
  id: number;
  name: string;
  employee_code: string;
}

interface TagFormData {
  employee_id: number;
  rfid_uid: string;
  tag_name: string;
}

export default function Tags() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [formData, setFormData] = useState<TagFormData>({
    employee_id: 0,
    rfid_uid: "",
    tag_name: "",
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [tagsResponse, employeesResponse] = await Promise.all([
        tagsAPI.getAll(),
        employeesAPI.getAll(),
      ]);

      setTags(Array.isArray(tagsResponse.data) ? tagsResponse.data : []);
      setEmployees(
        Array.isArray(employeesResponse.data) ? employeesResponse.data : []
      );
    } catch (error) {
      console.error("Error fetching data:", error);
      setTags([]);
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredTags = tags.filter(
    (tag) =>
      tag.employee_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tag.employee_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tag.rfid_uid.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tag.tag_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddTag = () => {
    setEditingTag(null);
    setFormData({
      employee_id: 0,
      rfid_uid: "",
      tag_name: "",
    });
    setShowModal(true);
  };

  const handleEditTag = (tag: Tag) => {
    setEditingTag(tag);
    setFormData({
      employee_id: tag.employee_id,
      rfid_uid: tag.rfid_uid,
      tag_name: tag.tag_name,
    });
    setShowModal(true);
  };

  const handleDeleteTag = async (tagId: number) => {
    if (
      confirm(
        "Are you sure you want to delete this tag? This action cannot be undone."
      )
    ) {
      try {
        await tagsAPI.delete(tagId);
        alert("Tag deleted successfully!");
        fetchData();
      } catch (error) {
        console.error("Error deleting tag:", error);
        alert("Error deleting tag");
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.employee_id === 0) {
      alert("Please select an employee");
      return;
    }

    try {
      if (editingTag) {
        await tagsAPI.update(editingTag.id, formData);
        alert("Tag updated successfully!");
      } else {
        await tagsAPI.create(formData);
        alert("Tag created successfully!");
      }

      setShowModal(false);
      fetchData();
    } catch (error) {
      console.error("Error saving tag:", error);
      alert("Error saving tag");
    }
  };

  const handleInputChange = (
    field: keyof TagFormData,
    value: string | number
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
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
          RFID Tag Management
        </h1>
        <Button onClick={handleAddTag}>Add Tag</Button>
      </div>

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle>Search Tags</CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="Search by employee name, code, RFID UID, or tag name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </CardContent>
      </Card>

      {/* Tags Table */}
      <Card>
        <CardHeader>
          <CardTitle>RFID Tags ({filteredTags.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Employee Code</TableHead>
                  <TableHead>RFID UID</TableHead>
                  <TableHead>Tag Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTags.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center py-8 text-slate-500"
                    >
                      No tags found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTags.map((tag) => (
                    <TableRow key={tag.id} className="hover:bg-slate-50">
                      <TableCell className="font-medium">
                        {tag.employee_name}
                      </TableCell>
                      <TableCell className="font-mono">
                        {tag.employee_code}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {tag.rfid_uid}
                      </TableCell>
                      <TableCell>{tag.tag_name}</TableCell>
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
                      <TableCell className="text-sm">
                        {new Date(tag.created_at).toLocaleDateString("en-US")}
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditTag(tag)}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteTag(tag.id)}
                            className="text-red-600 hover:text-red-700"
                          >
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

      {/* Add/Edit Tag Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">
                {editingTag ? "Edit Tag" : "Add Tag"}
              </h2>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowModal(false)}
              >
                ✕
              </Button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="employee_id">Employee *</Label>
                <Select
                  value={formData.employee_id.toString()}
                  onValueChange={(value) =>
                    handleInputChange("employee_id", parseInt(value))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select an employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((employee) => (
                      <SelectItem
                        key={employee.id}
                        value={employee.id.toString()}
                      >
                        {employee.name} ({employee.employee_code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="rfid_uid">RFID UID *</Label>
                <Input
                  id="rfid_uid"
                  value={formData.rfid_uid}
                  onChange={(e) =>
                    handleInputChange("rfid_uid", e.target.value)
                  }
                  placeholder="e.g., ABCD1234"
                  required
                />
              </div>

              <div>
                <Label htmlFor="tag_name">Tag Name</Label>
                <Input
                  id="tag_name"
                  value={formData.tag_name}
                  onChange={(e) =>
                    handleInputChange("tag_name", e.target.value)
                  }
                  placeholder="e.g., Main Entrance Tag"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  {editingTag ? "Update" : "Create"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
