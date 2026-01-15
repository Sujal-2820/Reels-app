require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./config/database');
const { Plan } = require('./models');

const defaultPlans = [
    {
        name: 'Private Monthly',
        description: 'Upload private reels for 30 days',
        durationDays: 30,
        price: 99, // INR
        features: [
            'Unlimited private reels',
            'Private link sharing',
            'No ads'
        ],
        isActive: true
    },
    {
        name: 'Private Yearly',
        description: 'Upload private reels for 365 days',
        durationDays: 365,
        price: 499, // INR
        features: [
            'Unlimited private reels',
            'Private link sharing',
            'No ads',
            'Priority support'
        ],
        isActive: true
    }
];

const seedPlans = async () => {
    try {
        await connectDB();

        // Check if plans already exist
        const existingPlans = await Plan.countDocuments();

        if (existingPlans > 0) {
            console.log('Plans already exist. Skipping seed.');
            process.exit(0);
        }

        // Insert default plans
        await Plan.insertMany(defaultPlans);

        console.log('✅ Plans seeded successfully!');
        console.log('Inserted plans:');
        defaultPlans.forEach(plan => {
            console.log(`  - ${plan.name}: ₹${plan.price} for ${plan.durationDays} days`);
        });

        process.exit(0);
    } catch (error) {
        console.error('❌ Seed error:', error);
        process.exit(1);
    }
};

seedPlans();
