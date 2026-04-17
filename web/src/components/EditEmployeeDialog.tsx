"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Edit2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { IEmployee } from "@/models/Employee";

interface EditEmployeeDialogProps {
    employee: IEmployee;
}

export default function EditEmployeeDialog({ employee }: EditEmployeeDialogProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [file, setFile] = useState<File | null>(null);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);

        const formData = new FormData(e.currentTarget);
        const ppe = {
            helmet: formData.get("helmet") === "on",
            mask: formData.get("mask") === "on",
            vest: formData.get("vest") === "on",
            cap: formData.get("cap") === "on",
            gloves: formData.get("gloves") === "on",
        };

        const submitData = new FormData();
        submitData.append("id", String(employee._id)); // MongoDB ID
        submitData.append("name", formData.get("name") as string);
        submitData.append("employeeId", formData.get("employeeId") as string);
        submitData.append("department", formData.get("department") as string);
        submitData.append("ppeRequirements", JSON.stringify(ppe));
        if (file) {
            submitData.append("file", file);
        }

        try {
            const res = await fetch("/api/employees", {
                method: "PUT",
                body: submitData,
            });

            if (res.ok) {
                setOpen(false);
                window.location.reload();
            } else {
                alert("Failed to update employee");
            }
        } catch (error) {
            console.error(error);
            alert("Error updating employee");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="sm">
                    <Edit2 className="h-4 w-4 mr-1" />
                    Edit
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Edit Employee</DialogTitle>
                    <DialogDescription>
                        Update employee details or PPE requirements.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right">
                            Name
                        </Label>
                        <Input id="name" name="name" defaultValue={employee.name} className="col-span-3" required />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="employeeId" className="text-right">
                            ID
                        </Label>
                        <Input id="employeeId" name="employeeId" defaultValue={employee.employeeId} className="col-span-3" required />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="department" className="text-right">
                            Dept
                        </Label>
                        <Input id="department" name="department" defaultValue={employee.department} className="col-span-3" required />
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right">PPE</Label>
                        <div className="col-span-3 flex flex-wrap gap-4">
                            <div className="flex items-center space-x-2">
                                <Checkbox id="helmet" name="helmet" defaultChecked={employee.ppeRequirements.helmet} />
                                <label htmlFor="helmet" className="text-sm font-medium leading-none">
                                    Helmet
                                </label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Checkbox id="mask" name="mask" defaultChecked={employee.ppeRequirements.mask} />
                                <label htmlFor="mask" className="text-sm font-medium leading-none">
                                    Mask
                                </label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Checkbox id="vest" name="vest" defaultChecked={employee.ppeRequirements.vest} />
                                <label htmlFor="vest" className="text-sm font-medium leading-none">
                                    Vest
                                </label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Checkbox id="cap" name="cap" defaultChecked={employee.ppeRequirements.cap} />
                                <label htmlFor="cap" className="text-sm font-medium leading-none">
                                    Cap
                                </label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Checkbox id="gloves" name="gloves" defaultChecked={employee.ppeRequirements.gloves} />
                                <label htmlFor="gloves" className="text-sm font-medium leading-none">
                                    Gloves
                                </label>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="photo" className="text-right text-xs">
                            New Photo (Optional)
                        </Label>
                        <Input
                            id="photo"
                            type="file"
                            accept="image/*"
                            className="col-span-3"
                            onChange={(e) => setFile(e.target.files?.[0] || null)}
                        />
                    </div>

                    <DialogFooter>
                        <Button type="submit" disabled={loading}>
                            {loading ? "Updating..." : "Update Employee"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
