"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import Webcam from "react-webcam";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import { AlertCircle, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface DetectionResult {
    state: string;
    name: string;
    recognized: boolean;
    face_location?: { top: number; right: number; bottom: number; left: number };
    ppe: Record<string, boolean>;
    required: Record<string, boolean>;
    time_left: number;
    marked: boolean;
    alreadyCheckedIn?: boolean;
}

export default function LiveCamera() {
    const webcamRef = useRef<Webcam>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [lastResult, setLastResult] = useState<DetectionResult | null>(null);
    const [cameraActive, setCameraActive] = useState(true);

    const capture = useCallback(async () => {
        if (webcamRef.current && webcamRef.current.getScreenshot && !isProcessing) {
            const imageSrc = webcamRef.current.getScreenshot();
            if (!imageSrc) return;

            setIsProcessing(true);

            try {
                const res = await fetch(imageSrc);
                const blob = await res.blob();
                const formData = new FormData();
                formData.append("file", blob, "frame.jpg");

                const response = await fetch("/api/process-frame", {
                    method: "POST",
                    body: formData,
                });

                const data = await response.json();
                setLastResult(data);
                drawOverlay(data);

            } catch (error) {
                console.error("Error processing frame:", error);
            } finally {
                setIsProcessing(false);
            }
        }
    }, [isProcessing]);

    // Capture loop
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (cameraActive) {
            interval = setInterval(() => {
                capture();
            }, 1000); // 1 second polling for better real-time feel
        }
        return () => clearInterval(interval);
    }, [cameraActive, capture]);

    const drawOverlay = (data: any) => {
        const canvas = canvasRef.current;
        const video = webcamRef.current?.video;

        if (!canvas || !video || !data) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (data.face_location) {
            const { top, right, bottom, left } = data.face_location;
            const width = right - left;
            const height = bottom - top;

            // Box color based on state
            let color = "#cbd5e1"; // Idle/Unknown
            if (data.state === "FACE_RECOGNIZED" || data.state === "WAITING_FOR_PPE") color = "#f59e0b"; // Yellow
            if (data.state === "PPE_COMPLIANT" || data.state === "COMPLETED") color = "#10b981"; // Green
            if (data.state === "TIMEOUT") color = "#ef4444"; // Red

            ctx.strokeStyle = color;
            ctx.lineWidth = 4;
            ctx.strokeRect(left, top, width, height);

            ctx.font = "bold 24px sans-serif";
            ctx.fillStyle = color;
            ctx.fillText(`${data.name}`, left, top - 15);
        }
    };

    const getStatusConfig = (state: string, result: any): { text: string; color: string; icon: React.ReactNode } => {
        switch (state) {
            case "FACE_RECOGNIZED":
                return { text: "Face recognized - Identity Locked", color: "bg-yellow-500", icon: <CheckCircle className="h-6 w-6" /> };
            case "WAITING_FOR_PPE":
                const missing: string[] = [];
                if (result?.required) {
                    for (const [item, req] of Object.entries(result.required)) {
                        if (req && !result.ppe?.[item]) missing.push(item);
                    }
                }
                return { text: `Please wear: ${missing.join(", ") || "required PPE"} (${result.time_left}s)`, color: "bg-yellow-500 animate-pulse", icon: <AlertCircle className="h-6 w-6" /> };
            case "PPE_COMPLIANT":
            case "COMPLETED":
                return { text: (result.marked || state === "COMPLETED") ? "Attendance Marked! Thank you." : "PPE Verified - Marking...", color: "bg-emerald-500", icon: <CheckCircle className="h-6 w-6" /> };
            case "TIMEOUT":
                return { text: "Timeout - PPE Compliance Failed", color: "bg-red-500", icon: <AlertCircle className="h-6 w-6" /> };
            case "IDLE":
            default:
                return { text: "Scanning for faces...", color: "bg-slate-700", icon: null };
        }
    };

    const status = getStatusConfig(lastResult?.state || "IDLE", lastResult);

    return (
        <div className="flex flex-col gap-6">
            <div className="relative rounded-xl overflow-hidden border-4 border-slate-900 bg-black aspect-video max-h-[600px] shadow-2xl">
                {cameraActive ? (
                    <>
                        <Webcam
                            audio={false}
                            ref={webcamRef}
                            screenshotFormat="image/jpeg"
                            className="w-full h-full object-cover"
                            videoConstraints={{
                                width: 1280,
                                height: 720,
                                facingMode: "user"
                            }}
                        />
                        <canvas
                            ref={canvasRef}
                            className="absolute top-0 left-0 w-full h-full"
                        />
                        {/* Status Bar Overlay */}
                        <div className="absolute top-0 left-0 right-0 p-4 flex justify-center pointer-events-none">
                            <div className={cn("px-6 py-2 rounded-full text-white font-bold flex items-center gap-3 shadow-lg transition-colors duration-300", status.color)}>
                                {status.icon}
                                {status.text}
                            </div>
                        </div>

                        {/* Attendance Counter / Timer */}
                        {lastResult && lastResult.time_left > 0 && lastResult.state !== "PPE_COMPLIANT" && (
                            <div className="absolute bottom-6 right-6">
                                <div className="bg-black/60 backdrop-blur-md text-white w-16 h-16 rounded-full flex items-center justify-center border-2 border-yellow-500 text-2xl font-black">
                                    {lastResult.time_left}
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="flex items-center justify-center h-full text-white uppercase tracking-widest font-bold">Camera Offline</div>
                )}
            </div>

            <div className="grid md:grid-cols-2 gap-6">
                <Card className="border-2 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xl flex items-center gap-2">
                            <div className={cn("w-3 h-3 rounded-full", lastResult?.recognized ? "bg-emerald-500" : "bg-slate-300")} />
                            User Information
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {lastResult && lastResult.name !== "Unknown" ? (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-muted-foreground">Identity:</span>
                                    <span className="font-bold text-lg">{lastResult.name}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-muted-foreground">Status:</span>
                                    <span className={cn("font-bold px-3 py-1 rounded-full text-sm",
                                        lastResult.marked ? "bg-emerald-100 text-emerald-800" :
                                            lastResult.state === "TIMEOUT" ? "bg-red-100 text-red-800" : "bg-yellow-100 text-yellow-800")}>
                                        {lastResult.marked ? "Checked In" :
                                            lastResult.state === "TIMEOUT" ? "Refused" : "Pending"}
                                    </span>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-400 mb-2" />
                                <p>Awaiting Identity Recognition...</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="border-2 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xl">Required PPE Verification</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 gap-3">
                            {lastResult?.required ? (
                                Object.entries(lastResult.required).map(([item, required]) => (
                                    required && (
                                        <div key={item} className={cn(
                                            "flex items-center justify-between p-3 rounded-lg border-2 transition-all duration-300",
                                            lastResult.ppe?.[item] ? "bg-emerald-50 border-emerald-200" : "bg-slate-50 border-slate-100"
                                        )}>
                                            <span className="capitalize font-semibold text-slate-700">{item}</span>
                                            {lastResult.ppe?.[item] ? (
                                                <div className="flex items-center gap-2 text-emerald-600 font-bold">
                                                    <CheckCircle className="h-5 w-5" />
                                                    Detected
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2 text-slate-400">
                                                    <AlertCircle className="h-5 w-5" />
                                                    Missing
                                                </div>
                                            )}
                                        </div>
                                    )
                                ))
                            ) : (
                                <p className="text-center py-6 text-muted-foreground">Lock identity to view requirements</p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="flex justify-center">
                <Button
                    variant="outline"
                    size="sm"
                    className="text-slate-500 border-slate-200"
                    onClick={() => fetch("http://localhost:8000/reset", { method: "POST" })}
                >
                    Administrative Reset
                </Button>
            </div>
        </div>
    );
}
