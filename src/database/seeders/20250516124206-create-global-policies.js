'use strict';

const bcrypt = require('bcrypt');
const globalPolicies = require('../../constants/globalPolicies.json');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        const timestamp = new Date();
        const policiesWithTimestamps = globalPolicies.map(policy => ({
            ...policy,
            is_system: true,
            created_at: timestamp,
            updated_at: timestamp
        }));

        await queryInterface.bulkInsert('policies', policiesWithTimestamps, {});
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.bulkDelete('policies', {
            ref_name: {
                [Sequelize.Op.in]: globalPolicies.map(p => p.ref_name)
            }
        }, {});
    }
};
