"use client";

import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        // Simulate login
        setTimeout(() => {
            router.push("/dashboard");
        }, 1000);
    };

    return (
        <Card className="w-[350px]">
            <CardHeader className="text-center">
                <div className="flex justify-center mb-2">
                    <ShieldCheck className="h-12 w-12 text-emerald-500" />
                </div>
                <CardTitle className="text-2xl">Smart PPE System</CardTitle>
                <CardDescription>Enter your credentials to access</CardDescription>
            </CardHeader>
            <form onSubmit={handleLogin}>
                <CardContent>
                    <div className="grid w-full items-center gap-4">
                        <div className="flex flex-col space-y-1.5">
                            <Label htmlFor="email">Username</Label>
                            <Input id="email" placeholder="admin" required />
                        </div>
                        <div className="flex flex-col space-y-1.5">
                            <Label htmlFor="password">Password</Label>
                            <Input id="password" type="password" required />
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-between">
                    <Button variant="outline" type="button">Cancel</Button>
                    <Button type="submit" disabled={loading}>
                        {loading ? "Logging in..." : "Login"}
                    </Button>
                </CardFooter>
            </form>
        </Card>
    );
}
