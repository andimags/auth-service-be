// src/database/seeder.ts
import fs from 'fs';
import path from 'path';
import { QueryInterface, Sequelize } from 'sequelize';
import sequelize from '../sequelize';

// Seeder interface
export interface Seeder {
    up: (queryInterface: QueryInterface, sequelize: Sequelize) => Promise<void>;
    down: (queryInterface: QueryInterface, sequelize: Sequelize) => Promise<void>;
}

// Run all seeders
export const runSeeders = async (): Promise<void> => {
    // Test connection
    try {
        await sequelize.authenticate();
        console.log('Database connection established successfully.');
    } catch (error) {
        console.error('Unable to connect to the database:', (error as Error).message);
        process.exit(1);
    }

    // Get all seed files
    const seedsDir = path.resolve(__dirname, '../seeders');
    const seedFiles = fs
        .readdirSync(seedsDir)
        .filter(
            (file) => file.endsWith('.js') || file.endsWith('.ts') && !file.startsWith('index.')
        )
        .sort(); // Sort to ensure consistent order

    console.log(`Found ${seedFiles.length} seed files to run`);

    // Execute each seed file
    for (const file of seedFiles) {
        const seedPath = path.join(seedsDir, file);
        console.log(`Running seed: ${file}`);

        try {
            // Import the seed file
            const seedModule = await import(seedPath);
            const seed = seedModule.default || seedModule;

            if (typeof seed.up === 'function') {
                await seed.up(sequelize.getQueryInterface(), sequelize);
                console.log(`✅ Successfully executed: ${file}`);
            } else {
                console.warn(`⚠️ Skipping ${file}: no 'up' function found`);
            }
        } catch (error) {
            console.error(`❌ Error executing ${file}:`, (error as Error).message);
            console.error('Stopping seeder due to error');
            process.exit(1);
        }
    }

    console.log('All seeds completed successfully!');
    await sequelize.close();
};

// Execute if run directly
if (require.main === module) {
    runSeeders().catch((error) => {
        console.error('Seeder error:', error);
        process.exit(1);
    });
}
