import bcrypt from 'bcrypt';
import { QueryInterface, Sequelize } from 'sequelize';
import { IUser } from '../../types';
import { Seeder } from '../seeders';

const seeder: Seeder = {
    up: async (queryInterface: QueryInterface, sequelize: Sequelize): Promise<void> => {
        const users: Partial<IUser>[] = [
            {
                username: 'superadmin',
                first_name: 'super',
                last_name: 'admin',
                email: 'superadmin@gmail.com',
                password: bcrypt.hashSync('abcd1234', 10),
                created_at: new Date(),
                updated_at: new Date()
            }
        ];

        await queryInterface.bulkInsert('users', users);
    },

    down: async (queryInterface: QueryInterface, sequelize: Sequelize): Promise<void> => {
        await queryInterface.bulkDelete('users', {});
    }
};

export default seeder;
