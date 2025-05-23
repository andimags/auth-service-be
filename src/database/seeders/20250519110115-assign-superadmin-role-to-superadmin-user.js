'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        const [roleResult] = await queryInterface.sequelize.query(
            `SELECT id FROM roles WHERE ref_name = 'superadmin' LIMIT 1;`
        );

        const roleId = roleResult[0]?.id;
        if (!roleId) throw new Error('Superadmin role not found');

        const [userResult] = await queryInterface.sequelize.query(
            `SELECT id FROM users WHERE username = 'superadmin' LIMIT 1;`
        );

        const userId = userResult[0]?.id;
        if (!userId) throw new Error('Superadmin user not found');

        const now = new Date();
        
        const userRoleData = [{
            user_id: userId,
            role_id: roleId,
            created_at: now
        }]

        await queryInterface.bulkInsert('user_role', userRoleData, {});
    },

    async down(queryInterface, Sequelize) {
        const [roleResult] = await queryInterface.sequelize.query(
            `SELECT id FROM roles WHERE ref_name = 'superadmin' LIMIT 1;`
        );

        const roleId = roleResult[0]?.id;
        if (!roleId) throw new Error('Superadmin role not found');

        const [userResult] = await queryInterface.sequelize.query(
            `SELECT id FROM users WHERE username = 'superadmin' LIMIT 1;`
        );

        const userId = userResult[0]?.id;
        if (!userId) throw new Error('Superadmin user not found');

        if (roleId && userId) {
            await queryInterface.bulkDelete('user_role', {
                role_id: roleId,
                user_id: userId
            }, {});
        }
    }
};
