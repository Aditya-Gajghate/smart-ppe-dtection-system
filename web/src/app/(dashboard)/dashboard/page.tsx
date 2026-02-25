
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, ShieldAlert, Users, CheckCircle } from "lucide-react";
import dbConnect from "@/lib/dbConnect";
import Employee from "@/models/Employee";
import Attendance, { AttendanceStatus } from "@/models/Attendance";

export const dynamic = 'force-dynamic';

async function getStats() {
    await dbConnect();

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const totalEmployees = await Employee.countDocuments();
    const presentToday = await Attendance.countDocuments({
        timestamp: { $gte: startOfDay, $lte: endOfDay },
        status: AttendanceStatus.PRESENT
    });

    const violationsToday = await Attendance.countDocuments({
        timestamp: { $gte: startOfDay, $lte: endOfDay },
        "detectionData.compliant": false
    });

    return { totalEmployees, presentToday, violationsToday };
}

export default async function DashboardPage() {
    const stats = await getStats();

    return (
        <div className="flex-1 space-y-4">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Dashboard Overview</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalEmployees}</div>
                        <p className="text-xs text-muted-foreground">Registered in database</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Present Today</CardTitle>
                        <CheckCircle className="h-4 w-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.presentToday}</div>
                        <p className="text-xs text-muted-foreground">
                            {stats.totalEmployees > 0 ? ((stats.presentToday / stats.totalEmployees) * 100).toFixed(1) : 0}% Attendance
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">PPE Violations</CardTitle>
                        <ShieldAlert className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.violationsToday}</div>
                        <p className="text-xs text-muted-foreground text-red-500">Requires attention</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Safety Score</CardTitle>
                        <Activity className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {stats.presentToday > 0 ? (100 - (stats.violationsToday / stats.presentToday) * 100).toFixed(0) : 100}%
                        </div>
                        <p className="text-xs text-muted-foreground">Compliance index</p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
