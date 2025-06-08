'use strict';

const globalPermissionsJson = require('../../constants/globalPermissions.json');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        // Fetch the role ID using raw SQL
        const [results] = await queryInterface.sequelize.query(
            `SELECT id FROM roles WHERE ref_name = 'superadmin' LIMIT 1;`
        );

        const roleId = results[0]?.id;
        if (!roleId) throw new Error('Superadmin role not found');

        const now = new Date();
        const rolePermissionData = await Promise.all(
            globalPermissionsJson.map(async (permission) => {
                const [results] = await queryInterface.sequelize.query(
                    `SELECT id FROM permissions WHERE ref_name = :ref_name LIMIT 1`,
                    {
                        replacements: { ref_name: permission.ref_name },
                        type: Sequelize.QueryTypes.SELECT
                    }
                );

                return {
                    role_id: roleId,
                    permission_id: results?.id || null,
                    created_at: now
                };
            })
        );

        await queryInterface.bulkInsert('role_permission', rolePermissionData, {});
    },

    async down(queryInterface, Sequelize) {
        const [results] = await queryInterface.sequelize.query(
            `SELECT id FROM roles WHERE ref_name = 'superadmin' LIMIT 1;`
        );

        const roleId = results[0]?.id;

        if (roleId) {
            await queryInterface.bulkDelete('role_permission', {
                role_id: roleId
            }, {});
        }
    }
};
