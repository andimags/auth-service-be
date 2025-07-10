'use strict';

const { faker } = require('@faker-js/faker');
const { default: hashPassowrd } = require('../../utils/hashPassword');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        const usersToInsert = Array.from({ length: 50 }).map(() => {
            const FIRST_NAME = faker.person.firstName();
            const LAST_NAME = faker.person.lastName();
            const DEFAULT_PASSWORD = hashPassowrd('abcd1234')

            return {
                username: `${FIRST_NAME}_${LAST_NAME}`,
                email: `${FIRST_NAME}_${LAST_NAME}@gmail.com`,
                first_name: FIRST_NAME,
                last_name: LAST_NAME,
                password: DEFAULT_PASSWORD,
                status: 'active',
                created_at: new Date(),
                updated_at: new Date()
            };
        });

        await queryInterface.bulkInsert('users', usersToInsert, {});
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.bulkDelete('users', null, {});
    }
};
