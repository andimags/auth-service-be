'use strict';

const bcrypt = require('bcrypt');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.bulkInsert('roles', [{
            name: 'superadmin',
            description: 'Full system access',
            ref_name: 'superadmin',
            level: 1,
            scope: 'global',
            created_at: new Date(),
            updated_at: new Date()
        }], {});
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.bulkDelete('roles', {
            name: 'superadmin'
        }, {});
    }
};
