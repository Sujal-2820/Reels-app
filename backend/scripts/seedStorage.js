const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const Plan = require('../models/Plan');

dotenv.config({ path: path.join(__dirname, '../.env') });

const seedStoragePlans = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB...');

        const storagePlans = [
            {
                name: 'Private Storage 50GB',
                price: 299,
                durationDays: 30,
                uploadLimit: 50,
                storageLimit: 51200, // 50GB in MB
                features: ['50GB Private Storage', 'Higher Upload Priority', 'No Auto-Deletion'],
                isActive: true,
                type: 'storage'
            },
            {
                name: 'Private Storage 100GB',
                price: 499,
                durationDays: 30,
                uploadLimit: 100,
                storageLimit: 102400, // 100GB in MB
                features: ['100GB Private Storage', 'Maximum Upload Priority', 'No Auto-Deletion'],
                isActive: true,
                type: 'storage'
            }
        ];

        console.log('Seeding storage plans...');
        for (const plan of storagePlans) {
            await Plan.findOneAndUpdate(
                { name: plan.name },
                plan,
                { upsert: true, new: true }
            );
        }

        console.log('Storage plans seeded successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Seed error:', error);
        process.exit(1);
    }
};

seedStoragePlans();
