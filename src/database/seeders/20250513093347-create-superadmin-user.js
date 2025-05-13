'use strict';

const bcrypt = require('bcrypt');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.bulkInsert('users', [{
            username: 'superadmin',
            first_name: 'super',
            last_name: 'admin',
            email: 'superadmin@gmail.com',
            password: bcrypt.hashSync('abcd1234', 10),
            created_at: new Date(),
            updated_at: new Date()
        }], {});
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.bulkDelete('users', {
            username: 'superadmin'
        }, {});
    }
};
