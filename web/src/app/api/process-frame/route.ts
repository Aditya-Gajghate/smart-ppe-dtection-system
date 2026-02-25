import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { uploadToCloudinary } from "@/lib/cloudinary";
import Attendance, { AttendanceStatus } from "@/models/Attendance";
import Employee from "@/models/Employee";

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get("file") as File;
        const mode = req.nextUrl.searchParams.get("mode") || "analyze"; // 'analyze', 'mark', or 'rejected'

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        // Forward to Python Microservice
        const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:8000";

        const backendFormData = new FormData();
        backendFormData.append("file", file);

        const response = await fetch(`${AI_SERVICE_URL}/recognize`, {
            method: "POST",
            body: backendFormData,
        });

        if (!response.ok) {
            throw new Error(`AI Service Error: ${response.statusText}`);
        }

        const data = await response.json();

        // data now includes: state, name, recognized, ppe: { ... }, required: { ... }, time_left
        const state = data.state;
        const isCompliant = state === "PPE_COMPLIANT";

        if (data.recognized && data.name !== "Unknown") {
            await dbConnect();
            const employee = await Employee.findOne({
                name: { $regex: new RegExp(`^${data.name}$`, 'i') }
            }).maxTimeMS(5000);

            if (employee) {
                // Check if already checked in today
                const startOfDay = new Date();
                startOfDay.setHours(0, 0, 0, 0);

                const endOfDay = new Date();
                endOfDay.setHours(23, 59, 59, 999);

                const existingAttendance = await Attendance.findOne({
                    employeeId: employee.employeeId,
                    timestamp: { $gte: startOfDay, $lte: endOfDay },
                    status: AttendanceStatus.PRESENT
                }).maxTimeMS(5000);

                const isCheckedIn = !!existingAttendance;

                if (isCompliant) {
                    if (!data.attendance_marked && !isCheckedIn) {
                        let snapshotUrl = "";
                        try {
                            snapshotUrl = await uploadToCloudinary(file);
                        } catch (e) {
                            console.error("Snapshot upload failed", e);
                        }

                        await Attendance.create({
                            employeeId: employee.employeeId,
                            timestamp: new Date(),
                            status: AttendanceStatus.PRESENT,
                            detectionData: {
                                helmet: data.ppe?.helmet ?? false,
                                mask: data.ppe?.mask ?? false,
                                vest: data.ppe?.vest ?? false,
                                compliant: true,
                            },
                            snapshotUrl
                        });
                    }

                    // CRITICAL: Always notify AI service that we've handled the compliant state
                    // This clears the AI's session even if already checked in.
                    if (!data.attendance_marked) {
                        await fetch(`${AI_SERVICE_URL}/marked`, { method: "POST" });
                    }

                    return NextResponse.json({
                        ...data,
                        marked: true,
                        alreadyCheckedIn: isCheckedIn,
                        status: "compliant"
                    });
                }

                return NextResponse.json({
                    ...data,
                    marked: data.attendance_marked,
                    alreadyCheckedIn: isCheckedIn,
                    status: "non-compliant"
                });
            }
        }

        return NextResponse.json({ ...data, marked: false });

    } catch (error) {
        console.error("Error in process-frame:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
