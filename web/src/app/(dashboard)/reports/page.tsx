import dbConnect from "@/lib/dbConnect";
import Attendance from "@/models/Attendance";
import Employee from "@/models/Employee";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle } from "lucide-react";

export const dynamic = 'force-dynamic';

async function getAttendance() {
    await dbConnect();
    const records = await Attendance.find({}).sort({ timestamp: -1 }).limit(50).lean();
    
    // Map employee names
    const employeeIds = [...new Set(records.map((r: any) => r.employeeId as string))];
    const employees = await Employee.find({ employeeId: { $in: employeeIds } }).lean();
    const employeeMap = Object.fromEntries(employees.map((e: any) => [e.employeeId, e.name]));

    return records.map((r: any) => ({
        ...r,
        employeeName: employeeMap[r.employeeId] || "Unknown"
    }));
}

export default async function ReportsPage() {
    const records = await getAttendance();

    return (
        <div className="flex-1 space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold tracking-tight">Attendance Reports</h2>
            </div>

            <div className="rounded-md border bg-white shadow-sm overflow-hidden">
                <Table>
                    <TableHeader className="bg-slate-50">
                        <TableRow>
                            <TableHead>Timestamp</TableHead>
                            <TableHead>Employee Name</TableHead>
                            <TableHead>Employee ID</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Details</TableHead>
                            <TableHead className="text-right">Snapshot</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {records.length > 0 ? (
                            records.map((record: any) => (
                                <TableRow key={String(record._id)}>
                                    <TableCell className="font-mono text-xs">
                                        {new Date(record.timestamp).toLocaleString()}
                                    </TableCell>
                                    <TableCell className="font-semibold">{record.employeeName}</TableCell>
                                    <TableCell className="font-medium text-slate-500">{record.employeeId}</TableCell>
                                    <TableCell>
                                        <Badge variant={record.status === 'PRESENT' ? 'default' : 'destructive'}
                                            className={record.status === 'PRESENT' ? 'bg-emerald-500 hover:bg-emerald-600' : ''}>
                                            {record.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            {record.detectionData?.compliant ? (
                                                <span className="text-emerald-600 flex items-center gap-1 text-xs">
                                                    <CheckCircle className="h-3 w-3" /> Fully Compliant
                                                </span>
                                            ) : (
                                                <span className="text-red-500 flex items-center gap-1 text-xs">
                                                    <XCircle className="h-3 w-3" /> Violations Detected
                                                </span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {record.snapshotUrl ? (
                                            <a href={record.snapshotUrl} target="_blank" className="text-blue-600 hover:underline text-xs">View Image</a>
                                        ) : (
                                            <span className="text-slate-400 text-xs">-</span>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                                    No attendance records found.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
