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
import { Plus, UserPlus } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

export default function AddEmployeeDialog() {
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

        // Convert logic to append properly
        const submitData = new FormData();
        submitData.append("name", formData.get("name") as string);
        submitData.append("employeeId", formData.get("employeeId") as string);
        submitData.append("department", formData.get("department") as string);
        submitData.append("ppeRequirements", JSON.stringify(ppe));
        if (file) {
            submitData.append("file", file);
        }

        try {
            const res = await fetch("/api/employees", {
                method: "POST",
                body: submitData,
            });

            if (res.ok) {
                setOpen(false);
                // Optimistic update or refresh needed. Use router.refresh() 
                window.location.reload();
            } else {
                alert("Failed to add employee");
            }
        } catch (error) {
            console.error(error);
            alert("Error adding employee");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Add Employee
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Add New Employee</DialogTitle>
                    <DialogDescription>
                        Register a new employee and their face data for recognition.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right">
                            Name
                        </Label>
                        <Input id="name" name="name" className="col-span-3" required />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="employeeId" className="text-right">
                            ID
                        </Label>
                        <Input id="employeeId" name="employeeId" className="col-span-3" required />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="department" className="text-right">
                            Dept
                        </Label>
                        <Input id="department" name="department" className="col-span-3" required />
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right">PPE</Label>
                        <div className="col-span-3 flex flex-wrap gap-4">
                            <div className="flex items-center space-x-2">
                                <Checkbox id="helmet" name="helmet" defaultChecked />
                                <label htmlFor="helmet" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                    Helmet
                                </label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Checkbox id="mask" name="mask" defaultChecked />
                                <label htmlFor="mask" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                    Mask
                                </label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Checkbox id="vest" name="vest" />
                                <label htmlFor="vest" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                    Vest
                                </label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Checkbox id="cap" name="cap" />
                                <label htmlFor="cap" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                    Cap
                                </label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Checkbox id="gloves" name="gloves" />
                                <label htmlFor="gloves" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                    Gloves
                                </label>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="photo" className="text-right">
                            Photo
                        </Label>
                        <Input
                            id="photo"
                            type="file"
                            accept="image/*"
                            className="col-span-3"
                            onChange={(e) => setFile(e.target.files?.[0] || null)}
                            required
                        />
                    </div>

                    <DialogFooter>
                        <Button type="submit" disabled={loading}>
                            {loading ? "Saving..." : "Save Employee"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
