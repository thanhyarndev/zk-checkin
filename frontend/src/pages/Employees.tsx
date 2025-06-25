import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
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
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { employeesAPI } from "@/services/api";

interface Employee {
  id: number;
  name: string;
  employee_code: string;
  department: string;
  position: string;
  email: string;
  phone: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  tag_count: number;
}

interface EmployeeFormData {
  name: string;
  employee_code: string;
  department: string;
  position: string;
  email: string;
  phone: string;
}

export default function Employees() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(
    null
  );
  const [formData, setFormData] = useState<EmployeeFormData>({
    name: "",
    employee_code: "",
    department: "",
    position: "",
    email: "",
    phone: "",
  });

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const response = await employeesAPI.getAll();
      setEmployees(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error("Error fetching employees:", error);
      setEmployees([]);
      toast.error("Failed to load employees");
    } finally {
      setLoading(false);
    }
  };

  const filteredEmployees = employees.filter(
    (employee) =>
      employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.employee_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddEmployee = () => {
    setEditingEmployee(null);
    setFormData({
      name: "",
      employee_code: "",
      department: "",
      position: "",
      email: "",
      phone: "",
    });
    setShowModal(true);
  };

  const handleEditEmployee = (employee: Employee) => {
    setEditingEmployee(employee);
    setFormData({
      name: employee.name,
      employee_code: employee.employee_code,
      department: employee.department || "",
      position: employee.position || "",
      email: employee.email || "",
      phone: employee.phone || "",
    });
    setShowModal(true);
  };

  const handleDeleteClick = (employee: Employee) => {
    setEmployeeToDelete(employee);
    setShowDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    if (!employeeToDelete) return;

    try {
      const response = await employeesAPI.delete(employeeToDelete.id);
      if (response.data.success) {
        toast.success("Employee deleted successfully!");
        fetchEmployees();
      } else {
        toast.error(response.data.message || "Failed to delete employee");
      }
    } catch (error: any) {
      console.error("Error deleting employee:", error);
      if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error("Failed to delete employee");
      }
    } finally {
      setShowDeleteDialog(false);
      setEmployeeToDelete(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingEmployee) {
        const response = await employeesAPI.update(
          editingEmployee.id,
          formData
        );
        if (response.data.success) {
          toast.success("Employee updated successfully!");
          setShowModal(false);
          fetchEmployees();
        } else {
          toast.error(response.data.message || "Failed to update employee");
        }
      } else {
        const response = await employeesAPI.create(formData);
        if (response.data.success) {
          toast.success("Employee created successfully!");
          setShowModal(false);
          fetchEmployees();
        } else {
          toast.error(response.data.message || "Failed to create employee");
        }
      }
    } catch (error: any) {
      console.error("Error saving employee:", error);
      if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error("Failed to save employee");
      }
    }
  };

  const handleInputChange = (field: keyof EmployeeFormData, value: string) => {
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
          Employee Management
        </h1>
        <Button onClick={handleAddEmployee}>Add Employee</Button>
      </div>

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle>Search Employees</CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="Search by name, code, or department..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </CardContent>
      </Card>

      {/* Employees Table */}
      <Card>
        <CardHeader>
          <CardTitle>Employees ({filteredEmployees.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>RFID Tags</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEmployees.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="text-center py-8 text-slate-500"
                    >
                      No employees found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEmployees.map((employee) => (
                    <TableRow key={employee.id} className="hover:bg-slate-50">
                      <TableCell className="font-mono">
                        {employee.employee_code}
                      </TableCell>
                      <TableCell className="font-medium">
                        {employee.name}
                      </TableCell>
                      <TableCell>{employee.department || "—"}</TableCell>
                      <TableCell>{employee.position || "—"}</TableCell>
                      <TableCell>{employee.email || "—"}</TableCell>
                      <TableCell>{employee.phone || "—"}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {employee.tag_count} tag
                          {employee.tag_count !== 1 ? "s" : ""}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditEmployee(employee)}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteClick(employee)}
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

      {/* Add/Edit Employee Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">
                {editingEmployee ? "Edit Employee" : "Add Employee"}
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="employee_code">Employee Code *</Label>
                  <Input
                    id="employee_code"
                    value={formData.employee_code}
                    onChange={(e) =>
                      handleInputChange("employee_code", e.target.value)
                    }
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="department">Department</Label>
                  <Input
                    id="department"
                    value={formData.department}
                    onChange={(e) =>
                      handleInputChange("department", e.target.value)
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="position">Position</Label>
                  <Input
                    id="position"
                    value={formData.position}
                    onChange={(e) =>
                      handleInputChange("position", e.target.value)
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleInputChange("phone", e.target.value)}
                  />
                </div>
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
                  {editingEmployee ? "Update" : "Create"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteDialog}
        title="Delete Employee"
        message={`Are you sure you want to delete "${employeeToDelete?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        onConfirm={handleDeleteConfirm}
        onCancel={() => {
          setShowDeleteDialog(false);
          setEmployeeToDelete(null);
        }}
      />
    </div>
  );
}
