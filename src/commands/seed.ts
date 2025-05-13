import { runSeeders } from '../database/seeders';

console.log('Starting database seeder...');
runSeeders()
    .then(() => {
        console.log('Seeding completed successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('Seeding failed:', error);
        process.exit(1);
    });
