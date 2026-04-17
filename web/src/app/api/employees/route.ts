import { uploadToCloudinary } from "@/lib/cloudinary";

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Employee from "@/models/Employee";

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const name = formData.get("name") as string;
        const department = formData.get("department") as string;
        const employeeId = formData.get("employeeId") as string;
        const file = formData.get("file") as File;
        const ppeJson = formData.get("ppeRequirements");
        const ppeRequirements = ppeJson ? JSON.parse(ppeJson as string) : {};

        if (!file) {
            return NextResponse.json({ error: "Face image required" }, { status: 400 });
        }

        // 1. Upload to Cloudinary first
        let cloudinaryUrl = "";
        try {
            cloudinaryUrl = await uploadToCloudinary(file);
        } catch (uploadError) {
            console.error("Cloudinary upload failed:", uploadError);
            // Continue? Maybe fail. Let's fail for now to ensure data integrity.
            return NextResponse.json({ error: "Image upload failed" }, { status: 500 });
        }

        // 2. Send to Python Service for Face Registration
        const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:8000";

        // We send just the name and file to Python service to store in 'faces/'
        const backendFormData = new FormData();
        backendFormData.append("name", name); // Using name as identifier for filename in Python service
        backendFormData.append("file", file);

        const pyRes = await fetch(`${AI_SERVICE_URL}/register`, {
            method: "POST",
            body: backendFormData,
        });

        if (!pyRes.ok) {
            return NextResponse.json({ error: "Failed to register face with AI service" }, { status: 500 });
        }

        // 3. Create in MongoDB
        await dbConnect();

        const newEmployee = await Employee.create({
            name,
            department,
            employeeId,
            ppeRequirements,
            faceImages: [cloudinaryUrl],
        });

        return NextResponse.json(newEmployee, { status: 201 });

    } catch (error) {
        console.error("Error creating employee:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function PUT(req: NextRequest) {
    try {
        await dbConnect();
        const formData = await req.formData();
        const id = formData.get("id") as string;
        const name = formData.get("name") as string;
        const department = formData.get("department") as string;
        const employeeId = formData.get("employeeId") as string;
        const file = formData.get("file") as File;
        const ppeJson = formData.get("ppeRequirements");
        const ppeRequirements = ppeJson ? JSON.parse(ppeJson as string) : {};

        const employee = await Employee.findById(id);
        if (!employee) {
            return NextResponse.json({ error: "Employee not found" }, { status: 404 });
        }

        const oldName = employee.name;

        // 1. If NAME changed, we should re-register in AI service OR update the filename.
        // For simplicity, if NAME or FILE changes, we re-run AI registration.
        if (file || name !== oldName) {
            const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:8000";
            const backendFormData = new FormData();
            backendFormData.append("name", name);
            if (file) {
                backendFormData.append("file", file);
            } else {
                 // No new file, but name changed? We would need to rename the file in AI service.
                 // For now, let's just trigger registration if a file is provided.
            }
            
            if (file) {
                 const pyRes = await fetch(`${AI_SERVICE_URL}/register`, {
                    method: "POST",
                    body: backendFormData,
                });
                if (!pyRes.ok) {
                    return NextResponse.json({ error: "Failed to update face with AI service" }, { status: 500 });
                }
            }
        }

        // 2. Upload to Cloudinary if new file
        let cloudinaryUrl = employee.faceImages[0];
        if (file) {
            try {
                cloudinaryUrl = await uploadToCloudinary(file);
            } catch (error) {
                console.error("Cloudinary update failed:", error);
            }
        }

        // 3. Update in MongoDB
        employee.name = name;
        employee.department = department;
        employee.employeeId = employeeId;
        employee.ppeRequirements = ppeRequirements;
        if (file) {
            employee.faceImages = [cloudinaryUrl];
        }

        await employee.save();

        return NextResponse.json(employee);

    } catch (error) {
        console.error("Error updating employee:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
