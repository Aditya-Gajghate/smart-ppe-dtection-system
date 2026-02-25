import mongoose, { Schema, Document, Model } from 'mongoose';

export enum AttendanceStatus {
    PRESENT = 'PRESENT',
    REJECTED = 'REJECTED',
    ABSENT = 'ABSENT'
}

export interface IAttendance extends Document {
    employeeId: string; // Foreign Key? Or just string for simplicity
    timestamp: Date;
    status: AttendanceStatus;
    detectionData: {
        helmet: boolean;
        mask: boolean;
        vest: boolean;
        cap: boolean;
        gloves: boolean;
        compliant: boolean;
        confidence: number;
    };
    snapshotUrl: string;
}

const AttendanceSchema: Schema = new Schema({
    employeeId: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    status: { type: String, enum: Object.values(AttendanceStatus), default: AttendanceStatus.ABSENT },
    detectionData: {
        helmet: { type: Boolean, default: false },
        mask: { type: Boolean, default: false },
        vest: { type: Boolean, default: false },
        cap: { type: Boolean, default: false },
        gloves: { type: Boolean, default: false },
        compliant: { type: Boolean, default: false },
        confidence: { type: Number, default: 0 }
    },
    snapshotUrl: { type: String }
});

const Attendance: Model<IAttendance> = mongoose.models.Attendance || mongoose.model<IAttendance>('Attendance', AttendanceSchema);
export default Attendance;
