'use strict';

const { faker } = require('@faker-js/faker');
const bcrypt = require('bcrypt');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        const DEFAULT_PASSWORD = 'abcd1234';

        const usersToInsert = [
            ...Array.from({ length: 50 }).map(() => {
                const FIRST_NAME = faker.person.firstName();
                const LAST_NAME = faker.person.lastName();

                return {
                    username: `${FIRST_NAME}_${LAST_NAME}`,
                    email: `${FIRST_NAME}_${LAST_NAME}@gmail.com`,
                    first_name: FIRST_NAME,
                    last_name: LAST_NAME,
                    password: bcrypt.hashSync(DEFAULT_PASSWORD, 10),
                    status: 'active',
                    created_at: new Date(),
                    updated_at: new Date(),
                };
            }),

            // Hardcoded user
            {
                username: 'andimags',
                email: 'andimags@gmail.com',
                first_name: 'Andi',
                last_name: 'Mags',
                password: bcrypt.hashSync(DEFAULT_PASSWORD, 10),
                status: 'active',
                created_at: new Date(),
                updated_at: new Date(),
            },
        ];

        await queryInterface.bulkInsert('users', usersToInsert, {});
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.bulkDelete('users', null, {});
    }
};
