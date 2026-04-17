
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export const dynamic = 'force-dynamic';
import Employee, { IEmployee } from "@/models/Employee";
import dbConnect from "@/lib/dbConnect";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import AddEmployeeDialog from "@/components/AddEmployeeDialog";
import EditEmployeeDialog from "@/components/EditEmployeeDialog";

async function getEmployees() {
    await dbConnect();
    // Lean query for performance
    const employees = await Employee.find({}).lean();
    return JSON.parse(JSON.stringify(employees));
}

export default async function EmployeesPage() {
    const employees = await getEmployees();

    return (
        <div className="flex-1 space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold tracking-tight">Employees</h2>
                <AddEmployeeDialog />
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Employee ID</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Department</TableHead>
                            <TableHead>Required PPE</TableHead>
                            <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {employees.map((employee: any) => (
                            <TableRow key={String(employee._id)}>
                                <TableCell className="font-medium">{employee.employeeId}</TableCell>
                                <TableCell>{employee.name}</TableCell>
                                <TableCell>{employee.department}</TableCell>
                                <TableCell>
                                    <div className="flex gap-1">
                                        {employee.ppeRequirements.helmet && <Badge variant="outline">Helmet</Badge>}
                                        {employee.ppeRequirements.mask && <Badge variant="outline">Mask</Badge>}
                                        {employee.ppeRequirements.cap && <Badge variant="outline">Cap</Badge>}
                                        {employee.ppeRequirements.vest && <Badge variant="outline">Vest</Badge>}
                                    </div>
                                </TableCell>
                                <TableCell className="text-right px-4">
                                    <EditEmployeeDialog employee={employee} />
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
