
import { Metadata } from 'next';
import LiveCamera from '@/components/LiveCamera';

export const metadata: Metadata = {
    title: 'Live Attendance | Smart PPE',
    description: 'Live camera feed for attendance tracking and PPE detection.',
};

export default function LiveAttendancePage() {
    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Live Attendance Monitor</h2>
            </div>
            <div className="grid gap-4">
                <LiveCamera />
            </div>
        </div>
    );
}
