"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma = new client_1.PrismaClient();
async function main() {
    const adminPasswordHash = await bcryptjs_1.default.hash('admin123', 10);
    const studentPinHash = await bcryptjs_1.default.hash('123456', 10);
    // 1. Create System Settings
    await prisma.systemSetting.upsert({
        where: { key: 'PROGRAM_TIMEZONE' },
        update: { value: 'Asia/Kolkata' },
        create: { key: 'PROGRAM_TIMEZONE', value: 'Asia/Kolkata' },
    });
    await prisma.systemSetting.upsert({
        where: { key: 'FN_CUTOFF' },
        update: { value: '23:59' },
        create: { key: 'FN_CUTOFF', value: '23:59' },
    });
    await prisma.systemSetting.upsert({
        where: { key: 'AN_CUTOFF' },
        update: { value: '23:59' },
        create: { key: 'AN_CUTOFF', value: '23:59' },
    });
    await prisma.systemSetting.upsert({
        where: { key: 'ATTENDANCE_THRESHOLD' },
        update: { value: '75' },
        create: { key: 'ATTENDANCE_THRESHOLD', value: '75' },
    });
    // 2. Create Admin
    const admin = await prisma.admin.upsert({
        where: { email: 'admin@arvr.com' },
        update: {},
        create: {
            name: 'System Admin',
            email: 'admin@arvr.com',
            passwordHash: adminPasswordHash,
        },
    });
    // 3. Create Batch
    const batch = await prisma.batch.upsert({
        where: { name: 'AR/VR Development - Batch 1' },
        update: {},
        create: {
            name: 'AR/VR Development - Batch 1',
            startDate: new Date('2026-08-01'),
            endDate: new Date('2026-08-30'),
            trainingDays: 10,
            status: 'ACTIVE',
        },
    });
    // 5. Create Training Days
    const tasks = [
        { day: 1, title: 'Unity VR Setup & XR Interaction Toolkit', desc: 'Initialize Unity XR project, set up Rig, Controllers and basic locomotion.' },
        { day: 2, title: '3D Asset Import & Spatial Audio', desc: 'Import 3D models into Unity, configure colliders, materials, and 3D spatial sound sources.' },
        { day: 3, title: 'Raycast & Socket Interactors', desc: 'Implement object grab interactors, raycast pointers, and socket snap points for VR tools.' },
        { day: 4, title: 'Augmented Reality Image Tracking', desc: 'Set up AR Foundation, AR Tracked Image Manager, and overlay 3D AR content on target images.' },
        { day: 5, title: 'AR Plane Detection & Hit Testing', desc: 'Detect surface planes in real world and instantiate AR models via touch raycasting.' },
    ];
    for (const t of tasks) {
        await prisma.trainingDay.upsert({
            where: {
                batchId_dayNumber: {
                    batchId: batch.id,
                    dayNumber: t.day,
                },
            },
            update: {
                taskTitle: t.title,
                taskDescription: t.desc,
            },
            create: {
                batchId: batch.id,
                dayNumber: t.day,
                date: new Date(Date.now() + (t.day - 1) * 86400000),
                taskTitle: t.title,
                taskDescription: t.desc,
            },
        });
    }
    // 6. Create Demo Student
    const student = await prisma.student.upsert({
        where: { registerNo: '21CS001' },
        update: {},
        create: {
            name: 'John Doe',
            registerNo: '21CS001',
            contactNumber: '9876543210',
            email: 'john@student.edu',
            department: 'Computer Science',
            year: '3rd Year',
            section: 'A',
            batchId: batch.id,
            pinHash: studentPinHash,
        },
    });
    console.log('Seed completed successfully!');
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
