const mongoose = require('mongoose');
require('dotenv').config();
const { Plan } = require('../models');
const connectDB = require('../config/database');

const plans = [
    {
        name: 'Basic',
        price: 199,
        durationDays: 30,
        uploadLimit: 10,
        storageLimit: 1024, // 1GB
        features: ['Ad-free experience', 'Public reel uploads', 'Standard support'],
        isActive: true
    },
    {
        name: 'Silver',
        price: 499,
        durationDays: 30,
        uploadLimit: 25,
        storageLimit: 5120, // 5GB
        features: ['Ad-free experience', 'Blue verification tick', 'Increased reel reach', 'Priority support'],
        isActive: true
    },
    {
        name: 'Gold',
        price: 999,
        durationDays: 30,
        uploadLimit: 100,
        storageLimit: 20480, // 20GB
        features: ['Ad-free experience', 'Gold verification tick', 'Maximum reel reach', '24/7 Priority support', 'Unlimited storage'],
        isActive: true
    }
];

const seedPlans = async () => {
    try {
        await connectDB();

        console.log('Clearing existing plans...');
        await Plan.deleteMany({});

        console.log('Seeding plans...');
        await Plan.insertMany(plans);

        console.log('Plans seeded successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Error seeding plans:', error);
        process.exit(1);
    }
};

seedPlans();
