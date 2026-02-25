import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IEmployee extends Document {
    name: string;
    employeeId: string;
    department: string;
    ppeRequirements: {
        helmet: boolean;
        mask: boolean;
        cap: boolean;
        vest: boolean;
        gloves: boolean;
    };
    faceImages: string[];
    createdAt: Date;
}

const EmployeeSchema: Schema = new Schema({
    name: { type: String, required: true },
    employeeId: { type: String, required: true, unique: true },
    department: { type: String, required: true },
    ppeRequirements: {
        helmet: { type: Boolean, default: true },
        mask: { type: Boolean, default: true },
        cap: { type: Boolean, default: false },
        vest: { type: Boolean, default: false },
        gloves: { type: Boolean, default: false },
    },
    faceImages: [{ type: String }],
    createdAt: { type: Date, default: Date.now },
});

const Employee: Model<IEmployee> = mongoose.models.Employee || mongoose.model<IEmployee>('Employee', EmployeeSchema);
export default Employee;
