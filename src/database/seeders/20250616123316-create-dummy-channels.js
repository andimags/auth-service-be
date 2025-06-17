'use strict';

const { generateApiKey } = require('generate-api-key');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        const channels = [
            {
                name: 'LCCM Library Sytem',
                ref_name: 'lccm_library_system'
            },
            {
                name: 'Notification Service',
                ref_name: 'notification_service',
            },
            {
                name: 'POS and Inventory System',
                ref_name: 'pos_and_inventory_system'
            }
        ]

        const channelsToInsert = channels.map(channel => {
            return {
                name: channel.name,
                ref_name: channel.ref_name,
                api_key: generateApiKey(),
                created_at: new Date(),
                updated_at: new Date()
            }
        })

        await queryInterface.bulkInsert('channels', channelsToInsert, {});
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.bulkDelete('channels', null, {});
    }
};
