'use strict';

const bcrypt = require('bcrypt');
const globalPermissions = require('../../constants/globalPermissions.json');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        const timestamp = new Date();
        const permissionsWithTimestamps = globalPermissions.map(permission => ({
            ...permission,
            is_system: true,
            created_at: timestamp,
            updated_at: timestamp
        }));

        await queryInterface.bulkInsert('permissions', permissionsWithTimestamps, {});
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.bulkDelete('permissions', {
            ref_name: {
                [Sequelize.Op.in]: globalPermissions.map(p => p.ref_name)
            }
        }, {});
    }
};
