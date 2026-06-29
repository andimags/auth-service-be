'use strict';

const globalPolicies = require('../../constants/globalPolicies.json');
const globalPermissions = require('../../constants/globalPermissions.json');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        const policyRefNames = globalPolicies.map(policy => policy.ref_name);
        const permissionRefNames = globalPermissions.map(permission => permission.ref_name);

        const policies = await queryInterface.sequelize.query(
            'SELECT id, ref_name FROM policies WHERE ref_name IN (:policyRefNames)',
            {
                replacements: { policyRefNames },
                type: Sequelize.QueryTypes.SELECT
            }
        );

        const permissions = await queryInterface.sequelize.query(
            'SELECT id, ref_name FROM permissions WHERE ref_name IN (:permissionRefNames)',
            {
                replacements: { permissionRefNames },
                type: Sequelize.QueryTypes.SELECT
            }
        );

        const policyByRef = Object.fromEntries(policies.map(policy => [policy.ref_name, policy.id]));
        const permissionByRef = Object.fromEntries(permissions.map(permission => [permission.ref_name, permission.id]));

        const policyPermissionsMap = {
            'admin:user': ['auth:admin:user', 'auth:view:user', 'auth:add:user', 'auth:update:user', 'auth:delete:user'],
            'view:user': ['auth:view:user'],
            'add:user': ['auth:add:user', 'auth:view:user'],
            'update:user': ['auth:update:user', 'auth:view:user'],
            'delete:user': ['auth:delete:user', 'auth:view:user'],

            'admin:channel': ['auth:admin:channel', 'auth:view:channel', 'auth:add:channel', 'auth:update:channel', 'auth:delete:channel'],
            'view:channel': ['auth:view:channel'],
            'add:channel': ['auth:add:channel', 'auth:view:channel'],
            'update:channel': ['auth:update:channel', 'auth:view:channel'],
            'delete:channel': ['auth:delete:channel', 'auth:view:channel'],

            'admin:role': ['auth:admin:role', 'auth:view:role', 'auth:add:role', 'auth:update:role', 'auth:delete:role'],
            'view:role': ['auth:view:role'],
            'add:role': ['auth:add:role', 'auth:view:role'],
            'update:role': ['auth:update:role', 'auth:view:role'],
            'delete:role': ['auth:delete:role', 'auth:view:role'],

            'admin:user_role': ['auth:admin:user_role', 'auth:view:user_role', 'auth:assign:user_role', 'auth:update:user_role', 'auth:remove:user_role', 'auth:view:user', 'auth:view:role'],
            'view:user_role': ['auth:view:user_role', 'auth:view:user', 'auth:view:role'],
            'assign:user_role': ['auth:assign:user_role', 'auth:view:user_role', 'auth:view:user', 'auth:view:role'],
            'update:user_role': ['auth:update:user_role', 'auth:view:user_role', 'auth:view:user', 'auth:view:role'],
            'remove:user_role': ['auth:remove:user_role', 'auth:view:user_role', 'auth:view:user', 'auth:view:role'],

            'admin:role_policy': ['auth:admin:role_policy', 'auth:view:role_policy', 'auth:assign:role_policy', 'auth:update:role_policy', 'auth:remove:role_policy', 'auth:view:role', 'auth:view:policy'],
            'view:role_policy': ['auth:view:role_policy', 'auth:view:role', 'auth:view:policy'],
            'assign:role_policy': ['auth:assign:role_policy', 'auth:view:role_policy', 'auth:view:role', 'auth:view:policy'],
            'update:role_policy': ['auth:update:role_policy', 'auth:view:role_policy', 'auth:view:role', 'auth:view:policy'],
            'remove:role_policy': ['auth:remove:role_policy', 'auth:view:role_policy', 'auth:view:role', 'auth:view:policy'],

            'admin:policy': ['auth:admin:policy', 'auth:view:policy', 'auth:add:policy', 'auth:update:policy', 'auth:delete:policy'],
            'view:policy': ['auth:view:policy'],
            'add:policy': ['auth:add:policy', 'auth:view:policy'],
            'update:policy': ['auth:update:policy', 'auth:view:policy'],
            'delete:policy': ['auth:delete:policy', 'auth:view:policy'],

            'admin:permission': ['auth:admin:permission', 'auth:view:permission', 'auth:add:permission', 'auth:update:permission', 'auth:delete:permission'],
            'view:permission': ['auth:view:permission'],
            'add:permission': ['auth:add:permission', 'auth:view:permission'],
            'update:permission': ['auth:update:permission', 'auth:view:permission'],
            'delete:permission': ['auth:delete:permission', 'auth:view:permission'],

            'admin:policy_permission': ['auth:admin:policy_permission', 'auth:view:policy_permission', 'auth:assign:policy_permission', 'auth:update:policy_permission', 'auth:remove:policy_permission', 'auth:view:policy', 'auth:view:permission'],
            'view:policy_permission': ['auth:view:policy_permission', 'auth:view:policy', 'auth:view:permission'],
            'assign:policy_permission': ['auth:assign:policy_permission', 'auth:view:policy_permission', 'auth:view:policy', 'auth:view:permission'],
            'update:policy_permission': ['auth:update:policy_permission', 'auth:view:policy_permission', 'auth:view:policy', 'auth:view:permission'],
            'remove:policy_permission': ['auth:remove:policy_permission', 'auth:view:policy_permission', 'auth:view:policy', 'auth:view:permission'],
        };
        
        const timestamp = new Date();
        const policyPermissionEntries = [];

        for (const policy of globalPolicies) {
            const policyId = policyByRef[policy.ref_name];

            if (!policyId) {
                throw new Error(`Policy not found for ref_name: ${policy.ref_name}`);
            }

            const permissionRefs = policyPermissionsMap[policy.ref_name] || [policy.ref_name];
            const uniquePermissionRefs = [...new Set(permissionRefs)];

            for (const permissionRef of uniquePermissionRefs) {
                const permissionId = permissionByRef[permissionRef];

                if (!permissionId) {
                    throw new Error(`Permission not found for ref_name: ${permissionRef}`);
                }

                policyPermissionEntries.push({
                    policy_id: policyId,
                    permission_id: permissionId,
                    created_at: timestamp
                });
            }
        }

        await queryInterface.bulkInsert('policy_permission', policyPermissionEntries, {});
    },

    async down(queryInterface, Sequelize) {
        const policyRefNames = globalPolicies.map(policy => policy.ref_name);
        const policies = await queryInterface.sequelize.query(
            'SELECT id FROM policies WHERE ref_name IN (:policyRefNames)',
            {
                replacements: { policyRefNames },
                type: Sequelize.QueryTypes.SELECT
            }
        );

        const policyIds = policies.map(policy => policy.id);

        await queryInterface.bulkDelete('policy_permission', {
            policy_id: {
                [Sequelize.Op.in]: policyIds
            }
        }, {});
    }
};
