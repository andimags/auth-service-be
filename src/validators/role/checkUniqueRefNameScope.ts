import { CustomValidator } from 'express-validator';
import { Op } from 'sequelize';
import Role from '../../database/models/Role';

// NOTE: this enforces ref_name uniqueness scoped to {scope}, while
// role/addValidator.ts enforces uniqueness *globally* (via isUniqueField) — the two
// validators disagree on the uniqueness key for the same field. Not a deliberate
// design; see ENGINEERING_AUDIT.md for the candidate fixes. Left as-is pending a
// product decision on the intended key (global / {scope} / {scope, channel_id}).
export const checkUniqueRefNameScope: CustomValidator = async (_, { req }) => {
    const { ref_name, scope } = req.body;
    const role_id = req.params?.role_id ? Number(req.params.role_id) : null;

    if (!ref_name && !scope) return true;

    let currentScope = scope;
    let currentRefName = ref_name;

    if (role_id) {
        const currentRole = await Role.findByPk(role_id);
        // Skip validation if role doesn't exist - let controller handle it
        if (!currentRole) return true;

        if (scope === undefined) currentScope = currentRole.scope;
        if (ref_name === undefined) currentRefName = currentRole.ref_name;
    }

    const existing = await Role.findOne({
        where: {
            scope: currentScope,
            ref_name: currentRefName,
            ...(role_id && { id: { [Op.ne]: role_id } })
        }
    });

    if (existing) {
        throw new Error(
            `Role with scope '${currentScope}' and ref_name '${currentRefName}' already exists`
        );
    }

    return true;
};
