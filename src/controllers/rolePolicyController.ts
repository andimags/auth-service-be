import { NextFunction, Request, Response } from 'express';
import Role from '../database/models/Role';
import { AppError } from '../middlewares/errorHandler';
import { findMissingPolicyIds } from '../services/policyService';

const getRolePolicies = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const targetRole = await Role.findByPk(req.params.role_id);
        if (!targetRole) throw new AppError('Role not found', 404);

        if (!req.isGlobalScope && targetRole?.channel_id != req.channel?.id) {
            throw new AppError(
                "Unauthorized to view this role's permissions",
                403
            );
        }

        const policies = await targetRole.getPolicies();

        res.json(policies);
    } catch (error: unknown) {
        next(error);
    }
};

// Assign one or more permissions to a role
const addRolePolicies = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const targetRole = await Role.findByPk(req.params.role_id);
        if (!targetRole) throw new AppError('Role not found', 404);

        if (!req.isGlobalScope && targetRole?.channel_id != req.channel?.id) {
            throw new AppError(
                'Unauthorized to add policies to this role',
                403
            );
        }

        const missingPolicyIds = await findMissingPolicyIds(
            req.body.policy_ids
        );
        if (missingPolicyIds.length > 0)
            throw new AppError(
                `Policy IDs ${missingPolicyIds} do not exist`,
                404
            );

        if (Array.isArray(req.body.policy_ids)) {
            await targetRole.addPolicies(req.body.policy_ids);
        } else {
            await targetRole.addPolicy(req.body.policy_ids);
        }

        const permissions = await targetRole.getPolicies();

        res.json(permissions);
    } catch (error: unknown) {
        next(error);
    }
};

// Replace all permissions of a role
const replaceRolePolicies = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const targetRole = await Role.findByPk(req.params.role_id);
        if (!targetRole) throw new AppError('Role not found', 404);

        if (!req.isGlobalScope && targetRole?.channel_id != req.channel?.id) {
            throw new AppError(
                'Unauthorized to replace permissions to this role',
                403
            );
        }

        const missingPolicyIds = await findMissingPolicyIds(
            req.body.policy_ids
        );
        if (missingPolicyIds.length > 0)
            throw new AppError(
                `Policy IDs ${missingPolicyIds} do not exist`,
                404
            );

        await targetRole.setPolicies(req.body.policy_ids);

        const policies = await targetRole.getPolicies();

        res.json(policies);
    } catch (error: unknown) {
        next(error);
    }
};

// Remove a specific permission from a role
const destroyRolePolicies = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const targetRole = await Role.findByPk(req.params.role_id);
        if (!targetRole) throw new AppError('Role not found', 404);

        if (!req.isGlobalScope && targetRole?.channel_id != req.channel?.id) {
            throw new AppError(
                'Unauthorized to delete permissions to this role',
                403
            );
        }

        const missingPolicyIds = await findMissingPolicyIds(
            req.body.policy_ids
        );
        if (missingPolicyIds.length > 0)
            throw new AppError(
                `Policy IDs ${missingPolicyIds} do not exist`,
                404
            );

        if (Array.isArray(req.body.policy_ids)) {
            await targetRole.removePolicies(req.body.policy_ids);
        } else {
            await targetRole.removePolicy(req.body.policy_ids);
        }

        res.json({
            message: 'Role policy successfully deleted'
        });
    } catch (error: unknown) {
        next(error);
    }
};

export default {
    getRolePolicies,
    addRolePolicies,
    replaceRolePolicies,
    destroyRolePolicies
};
