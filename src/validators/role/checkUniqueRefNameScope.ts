import { CustomValidator } from "express-validator";
import { Op } from "sequelize";
import Role from "../../database/models/Role";

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