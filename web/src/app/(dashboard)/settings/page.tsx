
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export default function SettingsPage() {
    return (
        <div className="space-y-6">
            <div className="space-y-0.5">
                <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
                <p className="text-muted-foreground">
                    Manage system configurations and compliance thresholds.
                </p>
            </div>
            <div className="grid gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Camera Settings</CardTitle>
                        <CardDescription>
                            Configure camera input and resolution.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <div className="space-y-1">
                            <Label htmlFor="camera-source">Camera Source</Label>
                            <Input id="camera-source" placeholder="Default Webcam" disabled />
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button>Save changes</Button>
                    </CardFooter>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>AI Thresholds</CardTitle>
                        <CardDescription>
                            Adjust sensitivity for detection.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <div className="space-y-1">
                            <Label htmlFor="conf">Confidence Threshold</Label>
                            <Input id="conf" type="number" defaultValue="0.5" step="0.1" max="1" min="0" />
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button>Update Model</Button>
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
}
