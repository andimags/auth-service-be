import app from './app';
import sequelize from './database/sequelize';

const port = process.env.PORT ?? 3000;

app.listen(port, () => {
    void (async () => {
        // Drops all tables and recreates them
        // await sequelize.sync({ force: true });
        // Sync models with new columns on existing tables
        await sequelize.sync({ alter: true });
        console.log('All models were synchronized successfully.');
        console.log(`Server running on port ${port}`);
    })();
});
