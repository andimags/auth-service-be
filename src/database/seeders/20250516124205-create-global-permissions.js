'use strict';

const bcrypt = require('bcrypt');
const permissionsJson = require('../../data/permissions.json');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        const timestamp = new Date();
        const permissionsWithTimestamps = permissionsJson.map(permission => ({
            ...permission,
            created_at: timestamp,
            updated_at: timestamp
        }));

        await queryInterface.bulkInsert('permissions', permissionsWithTimestamps, {});
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.bulkDelete('permissions', {
            ref_name: {
                [Sequelize.Op.in]: permissionsJson.map(p => p.ref_name)
            }
        }, {});
    }
};
