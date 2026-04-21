/**
 * Database Seeder Script
 * 
 * This script seeds the database with initial test data for development and testing.
 * 
 * Usage:
 *   npm run seed
 *   OR
 *   ts-node -r tsconfig-paths/register scripts/seed-database.ts
 */

import { connect, disconnect, Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { ConfigService } from '@nestjs/config';

interface SeedData {
    products: any[];
    categories: any[];
}

const seedData: SeedData = {
    categories: [
        {
            name: 'Electronics',
            description: 'Electronic devices and accessories',
            parentId: null,
            slug: 'electronics',
            status: 'active',
            sortOrder: 1,
        },
        {
            name: 'Computers',
            description: 'Laptops, desktops, and computer accessories',
            parentId: null,
            slug: 'computers',
            status: 'active',
            sortOrder: 2,
        },
        {
            name: 'Smartphones',
            description: 'Mobile phones and smartphones',
            parentId: null,
            slug: 'smartphones',
            status: 'active',
            sortOrder: 3,
        },
        {
            name: 'Audio',
            description: 'Headphones, speakers, and audio equipment',
            parentId: null,
            slug: 'audio',
            status: 'active',
            sortOrder: 4,
        },
        {
            name: 'Accessories',
            description: 'Electronic accessories and peripherals',
            parentId: null,
            slug: 'accessories',
            status: 'active',
            sortOrder: 5,
        },
    ],
    products: [
        {
            name: 'Premium Wireless Headphones',
            description: 'High-quality wireless headphones with active noise cancellation',
            sku: 'WH-001',
            price: 299.99,
            currency: 'USD',
            stock: 100,
            categoryId: 'cat-audio',
            sellerId: 'seller-001',
            images: ['headphones-1.jpg', 'headphones-2.jpg'],
            attributes: {
                brand: 'TechBrand',
                color: 'Black',
                weight: '250g',
                batteryLife: '30 hours',
            },
            status: 'active',
        },
        {
            name: 'Wireless Bluetooth Speaker',
            description: 'Portable bluetooth speaker with 360° sound',
            sku: 'SP-001',
            price: 149.99,
            currency: 'USD',
            stock: 150,
            categoryId: 'cat-audio',
            sellerId: 'seller-001',
            images: ['speaker-1.jpg'],
            attributes: {
                brand: 'SoundMaster',
                color: 'Blue',
                batteryLife: '12 hours',
                waterproof: true,
            },
            status: 'active',
        },
        {
            name: 'Professional Laptop Stand',
            description: 'Ergonomic aluminum laptop stand',
            sku: 'LS-001',
            price: 79.99,
            currency: 'USD',
            stock: 200,
            categoryId: 'cat-accessories',
            sellerId: 'seller-002',
            images: ['laptop-stand.jpg'],
            attributes: {
                material: 'Aluminum',
                weight: '1.5kg',
                adjustable: true,
            },
            status: 'active',
        },
        {
            name: 'USB-C Hub with 7 Ports',
            description: 'Multi-port USB-C hub for laptops',
            sku: 'USB-001',
            price: 49.99,
            currency: 'USD',
            stock: 300,
            categoryId: 'cat-accessories',
            sellerId: 'seller-002',
            images: ['usb-hub.jpg'],
            attributes: {
                ports: 7,
                powerDelivery: '100W',
                color: 'Space Gray',
            },
            status: 'active',
        },
        {
            name: 'Mechanical Gaming Keyboard',
            description: 'RGB mechanical keyboard with Cherry MX switches',
            sku: 'KB-001',
            price: 199.99,
            currency: 'USD',
            stock: 50,
            categoryId: 'cat-accessories',
            sellerId: 'seller-001',
            images: ['keyboard-1.jpg'],
            attributes: {
                switchType: 'Cherry MX Red',
                backlight: 'RGB',
                wireless: false,
            },
            status: 'active',
        },
        {
            name: 'Wireless Mouse',
            description: 'Ergonomic wireless mouse with precision tracking',
            sku: 'MS-001',
            price: 59.99,
            currency: 'USD',
            stock: 250,
            categoryId: 'cat-accessories',
            sellerId: 'seller-002',
            images: ['mouse-1.jpg'],
            attributes: {
                dpi: '16000',
                wireless: true,
                battery: 'Rechargeable',
            },
            status: 'active',
        },
        {
            name: 'Smartphone Case - Premium',
            description: 'Shockproof case for flagship smartphones',
            sku: 'SC-001',
            price: 29.99,
            currency: 'USD',
            stock: 500,
            categoryId: 'cat-accessories',
            sellerId: 'seller-001',
            images: ['case-1.jpg'],
            attributes: {
                material: 'TPU',
                compatible: 'iPhone 15',
                color: 'Transparent',
            },
            status: 'active',
        },
        {
            name: 'Fast Charger - 65W',
            description: 'GaN fast charger for laptops and phones',
            sku: 'CH-001',
            price: 39.99,
            currency: 'USD',
            stock: 400,
            categoryId: 'cat-accessories',
            sellerId: 'seller-002',
            images: ['charger-1.jpg'],
            attributes: {
                power: '65W',
                technology: 'GaN',
                ports: 2,
            },
            status: 'active',
        },
        {
            name: 'Portable Power Bank - 20000mAh',
            description: 'High-capacity power bank with fast charging',
            sku: 'PB-001',
            price: 69.99,
            currency: 'USD',
            stock: 180,
            categoryId: 'cat-accessories',
            sellerId: 'seller-001',
            images: ['powerbank-1.jpg'],
            attributes: {
                capacity: '20000mAh',
                ports: 3,
                wireless: true,
            },
            status: 'active',
        },
        {
            name: 'Monitor Stand - Adjustable',
            description: 'Adjustable monitor stand for ergonomic viewing',
            sku: 'MS-002',
            price: 89.99,
            currency: 'USD',
            stock: 120,
            categoryId: 'cat-accessories',
            sellerId: 'seller-002',
            images: ['monitor-stand.jpg'],
            attributes: {
                maxLoad: '10kg',
                adjustableHeight: '10cm',
                material: 'Steel',
            },
            status: 'active',
        },
    ],
};

async function seedDatabase() {
    console.log('🌱 Starting database seeding...');

    try {
        // Connect to database
        const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/product_service';
        console.log(`📊 Connecting to MongoDB: ${mongoUri}`);

        const conn = await connect(mongoUri);
        const db = conn.connection;
        console.log('✅ Connected to MongoDB');

        // Clear existing collections
        console.log('🧹 Clearing existing data...');
        await db.dropDatabase();
        console.log('✅ Cleared database');

        // Seed categories
        console.log('📁 Seeding categories...');
        for (const category of seedData.categories) {
            const newCategory = {
                ...category,
                _id: `cat-${category.slug}`,
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            await db.collection('categories').insertOne(newCategory);
            console.log(`   ✅ Created category: ${category.name}`);
        }
        console.log(`✅ Seeded ${seedData.categories.length} categories`);

        // Seed products
        console.log('📦 Seeding products...');
        for (const product of seedData.products) {
            const newProduct = {
                ...product,
                _id: `prod-${product.sku}`,
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            await db.collection('products').insertOne(newProduct);
            console.log(`   ✅ Created product: ${product.name}`);
        }
        console.log(`✅ Seeded ${seedData.products.length} products`);

        // Close connections
        await disconnect();

        console.log('\n✨ Database seeding completed successfully!');
        console.log(`\n📊 Summary:`);
        console.log(`   - Categories: ${seedData.categories.length}`);
        console.log(`   - Products: ${seedData.products.length}`);
        console.log('\n🚀 You can now start to application with: npm run start:dev');

    } catch (error) {
        console.error('❌ Error during database seeding:', error);
        process.exit(1);
    }
}

// Run seeder
seedDatabase()
    .then(() => {
        console.log('\n✅ Seeder completed');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Seeder failed:', error);
        process.exit(1);
    });