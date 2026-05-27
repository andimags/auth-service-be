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
            'admin:user': ['admin:user', 'view:user', 'add:user', 'update:user', 'delete:user'],
            'view:user': ['view:user'],
            'add:user': ['add:user', 'view:user'],
            'update:user': ['update:user', 'view:user'],
            'delete:user': ['delete:user', 'view:user'],

            'admin:channel': ['admin:channel', 'view:channel', 'add:channel', 'update:channel', 'delete:channel'],
            'view:channel': ['view:channel'],
            'add:channel': ['add:channel', 'view:channel'],
            'update:channel': ['update:channel', 'view:channel'],
            'delete:channel': ['delete:channel', 'view:channel'],

            'admin:role': ['admin:role', 'view:role', 'add:role', 'update:role', 'delete:role'],
            'view:role': ['view:role'],
            'add:role': ['add:role', 'view:role'],
            'update:role': ['update:role', 'view:role'],
            'delete:role': ['delete:role', 'view:role'],

            'admin:user_role': ['admin:user_role', 'view:user_role', 'assign:user_role', 'update:user_role', 'remove:user_role', 'view:user', 'view:role'],
            'view:user_role': ['view:user_role', 'view:user', 'view:role'],
            'assign:user_role': ['assign:user_role', 'view:user_role', 'view:user', 'view:role'],
            'update:user_role': ['update:user_role', 'view:user_role', 'view:user', 'view:role'],
            'remove:user_role': ['remove:user_role', 'view:user_role', 'view:user', 'view:role'],

            'admin:role_policy': ['admin:role_policy', 'view:role_policy', 'assign:role_policy', 'update:role_policy', 'remove:role_policy', 'view:role', 'view:policy'],
            'view:role_policy': ['view:role_policy', 'view:role', 'view:policy'],
            'assign:role_policy': ['assign:role_policy', 'view:role_policy', 'view:role', 'view:policy'],
            'update:role_policy': ['update:role_policy', 'view:role_policy', 'view:role', 'view:policy'],
            'remove:role_policy': ['remove:role_policy', 'view:role_policy', 'view:role', 'view:policy'],

            'admin:policy': ['admin:policy', 'view:policy', 'add:policy', 'update:policy', 'delete:policy'],
            'view:policy': ['view:policy'],
            'add:policy': ['add:policy', 'view:policy'],
            'update:policy': ['update:policy', 'view:policy'],
            'delete:policy': ['delete:policy', 'view:policy'],

            'admin:permission': ['admin:permission', 'view:permission', 'add:permission', 'update:permission', 'delete:permission'],
            'view:permission': ['view:permission'],
            'add:permission': ['add:permission', 'view:permission'],
            'update:permission': ['update:permission', 'view:permission'],
            'delete:permission': ['delete:permission', 'view:permission'],

            'admin:policy_permission': ['admin:policy_permission', 'view:policy_permission', 'assign:policy_permission', 'update:policy_permission', 'remove:policy_permission', 'view:policy', 'view:permission'],
            'view:policy_permission': ['view:policy_permission', 'view:policy', 'view:permission'],
            'assign:policy_permission': ['assign:policy_permission', 'view:policy_permission', 'view:policy', 'view:permission'],
            'update:policy_permission': ['update:policy_permission', 'view:policy_permission', 'view:policy', 'view:permission'],
            'remove:policy_permission': ['remove:policy_permission', 'view:policy_permission', 'view:policy', 'view:permission']
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
