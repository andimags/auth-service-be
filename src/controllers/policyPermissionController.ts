import { NextFunction, Request, Response } from 'express';
import Policy from '../database/models/Policy';
import { AppError } from '../middlewares/errorHandler';
import { findMissingPermissionIds } from '../services/permissionService';

const getPolicyPermissions = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const targetPolicy = await Policy.findByPk(req.params.role_id);
        if (!targetPolicy) throw new AppError('Policy not found', 404);

        const permissions = await targetPolicy.getPermissions();

        res.json({
            status: 1,
            data: permissions
        });
    } catch (error: unknown) {
        next(error);
    }
};

// Assign one or more permissions to a role
const addPolicyPermissions = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const targetPolicy = await Policy.findByPk(req.params.role_id);
        if (!targetPolicy) throw new AppError('Policy not found', 404);

        const missingPermissionIds = await findMissingPermissionIds(
            req.body.policy_ids
        );
        if (missingPermissionIds.length > 0)
            throw new AppError(
                `Permission IDs ${missingPermissionIds} do not exist`,
                404
            );

        if (Array.isArray(req.body.policy_ids)) {
            await targetPolicy.addPermissions(req.body.policy_ids);
        } else {
            await targetPolicy.addPermission(req.body.policy_ids);
        }

        const permissions = await targetPolicy.getPermissions();

        res.json({
            status: 1,
            data: permissions
        });
    } catch (error: unknown) {
        next(error);
    }
};

// Replace all permissions of a role
const replacePolicyPermissions = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const targetPolicy = await Policy.findByPk(req.params.role_id);
        if (!targetPolicy) throw new AppError('Policy not found', 404);

        const missingPermissionIds = await findMissingPermissionIds(
            req.body.policy_ids
        );

        if (missingPermissionIds.length > 0)
            throw new AppError(
                `Permission IDs ${missingPermissionIds} do not exist`,
                404
            );

        await targetPolicy.setPermissions(req.body.policy_ids);

        const permissions = await targetPolicy.getPermissions();

        res.json({
            status: 1,
            data: permissions
        });
    } catch (error: unknown) {
        next(error);
    }
};

// Remove a specific permission from a role
const destroyPolicyPermissions = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const targetPolicy = await Policy.findByPk(req.params.role_id);
        if (!targetPolicy) throw new AppError('Policy not found', 404);

        const missingPermissionIds = await findMissingPermissionIds(
            req.body.policy_ids
        );
        if (missingPermissionIds.length > 0)
            throw new AppError(
                `Permission IDs ${missingPermissionIds} do not exist`,
                404
            );

        if (Array.isArray(req.body.policy_ids)) {
            await targetPolicy.removePermissions(req.body.policy_ids);
        } else {
            await targetPolicy.removePermission(req.body.policy_ids);
        }

        res.json({
            status: 1,
            message: 'Policy permission successfully deleted'
        });
    } catch (error: unknown) {
        next(error);
    }
};

export default {
    getPolicyPermissions,
    addPolicyPermissions,
    replacePolicyPermissions,
    destroyPolicyPermissions
};
