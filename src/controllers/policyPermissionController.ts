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
        const targetPolicy = await Policy.findByPk(req.params.policy_id);
        if (!targetPolicy) throw new AppError('Policy not found', 404);

        const permissions = await targetPolicy.getPermissions();

        res.json(permissions);
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
        const targetPolicy = await Policy.findByPk(req.params.policy_id);
        if (!targetPolicy) throw new AppError('Policy not found', 404);

        const missingPermissionIds = await findMissingPermissionIds(
            req.body.permission_ids
        );
        if (missingPermissionIds.length > 0)
            throw new AppError(
                `Permission IDs ${missingPermissionIds} do not exist`,
                404
            );

        if (Array.isArray(req.body.permission_ids)) {
            await targetPolicy.addPermissions(req.body.permission_ids);
        } else {
            await targetPolicy.addPermission(req.body.permission_ids);
        }

        const permissions = await targetPolicy.getPermissions();

        res.json(permissions);
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
        const targetPolicy = await Policy.findByPk(req.params.policy_id);
        if (!targetPolicy) throw new AppError('Policy not found', 404);

        const missingPermissionIds = await findMissingPermissionIds(
            req.body.permission_ids
        );

        if (missingPermissionIds.length > 0)
            throw new AppError(
                `Permission IDs ${missingPermissionIds} do not exist`,
                404
            );

        await targetPolicy.setPermissions(req.body.permission_ids);

        const permissions = await targetPolicy.getPermissions();

        res.json(permissions);
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
        const targetPolicy = await Policy.findByPk(req.params.policy_id);
        if (!targetPolicy) throw new AppError('Policy not found', 404);

        const missingPermissionIds = await findMissingPermissionIds(
            req.body.permission_ids
        );
        if (missingPermissionIds.length > 0)
            throw new AppError(
                `Permission IDs ${missingPermissionIds} do not exist`,
                404
            );

        if (Array.isArray(req.body.permission_ids)) {
            await targetPolicy.removePermissions(req.body.permission_ids);
        } else {
            await targetPolicy.removePermission(req.body.permission_ids);
        }

        res.json({
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
