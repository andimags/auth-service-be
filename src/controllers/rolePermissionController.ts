import { NextFunction, Request, Response } from 'express';
import Role from '../database/models/Role';
import User from '../database/models/User';
import { AppError } from '../middlewares/errorHandler';
import { findMissingPermissions } from '../services/permissionService';

// Fetch all permissions assigned to a role
const getRolePermissions = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const targetRole = await Role.findByPk(req.params.role_id);
        if (!targetRole) throw new AppError('Role not found', 404);

        if (!req.isGlobalRole && targetRole?.channel_id != req.channel?.id) {
            throw new AppError(
                "Unauthorized to view this role's permissions",
                403
            );
        }

        const permissions = await targetRole.getPermissions();

        res.json({
            status: 1,
            data: permissions
        });
    } catch (error: unknown) {
        next(error);
    }
};

// Assign one or more permissions to a role
const addRolePermissions = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const targetRole = await Role.findByPk(req.params.role_id);
        if (!targetRole) throw new AppError('Role not found', 404);

        const authorizeUserRoleLevel = await (
            req.authorizedUser as User
        ).hasAnyPermissionLevel(
            ['remove:role_permission', 'admin:role_permission'],
            'global'
        );

        if (
            authorizeUserRoleLevel &&
            targetRole.level <= authorizeUserRoleLevel
        ) {
            throw new AppError(
                'You cannot add permissions from a role with the higher or same level as your role',
                403
            );
        }

        if (!req.isGlobalRole && targetRole?.channel_id != req.channel?.id) {
            throw new AppError(
                'Unauthorized to add permissions to this role',
                403
            );
        }

        const missingPermissions = await findMissingPermissions(
            req.body.permission_ids
        );
        if (missingPermissions.length > 0)
            throw new AppError(
                `Permission IDs ${missingPermissions} do not exist`,
                404
            );

        if (Array.isArray(req.body.permission_ids)) {
            await targetRole.addPermissions(req.body.permission_ids);
        } else {
            await targetRole.addPermission(req.body.permission_ids);
        }

        const permissions = await targetRole.getPermissions();

        res.json({
            status: 1,
            data: permissions
        });
    } catch (error: unknown) {
        next(error);
    }
};

// Replace all permissions of a role
const replaceRolePermissions = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const targetRole = await Role.findByPk(req.params.role_id);
        if (!targetRole) throw new AppError('Role not found', 404);

        const authorizeUserRoleLevel = await (
            req.authorizedUser as User
        ).hasAnyPermissionLevel(
            ['replace:role_permission', 'admin:role_permission'],
            'global'
        );

        if (
            authorizeUserRoleLevel &&
            targetRole.level <= authorizeUserRoleLevel
        ) {
            throw new AppError(
                'You cannot replace permissions from a role with the higher or same level as your role',
                403
            );
        }

        if (!req.isGlobalRole && targetRole?.channel_id != req.channel?.id) {
            throw new AppError(
                'Unauthorized to replace permissions to this role',
                403
            );
        }

        const missingPermissions = await findMissingPermissions(
            req.body.permission_ids
        );
        if (missingPermissions.length > 0)
            throw new AppError(
                `Permission IDs ${missingPermissions} do not exist`,
                404
            );

        await targetRole.setPermissions(req.body.permission_ids);

        const permissions = await targetRole.getPermissions();

        res.json({
            status: 1,
            data: permissions
        });
    } catch (error: unknown) {
        next(error);
    }
};

// Remove a specific permission from a role
const destroyRolePermission = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const targetRole = await Role.findByPk(req.params.role_id);
        if (!targetRole) throw new AppError('Role not found', 404);

        const authorizeUserRoleLevel = await (
            req.authorizedUser as User
        ).hasAnyPermissionLevel(
            ['remove:role_permission', 'admin:role_permission'],
            'global'
        );

        if (
            authorizeUserRoleLevel &&
            targetRole.level <= authorizeUserRoleLevel
        ) {
            throw new AppError(
                'You cannot delete permissions from a role with the higher or same level as your role',
                403
            );
        }

        if (!req.isGlobalRole && targetRole?.channel_id != req.channel?.id) {
            throw new AppError(
                'Unauthorized to delete permissions to this role',
                403
            );
        }

        const missingPermissions = await findMissingPermissions(
            req.body.permission_ids
        );
        if (missingPermissions.length > 0)
            throw new AppError(
                `Permission IDs ${missingPermissions} do not exist`,
                404
            );

        if (Array.isArray(req.body.permission_ids)) {
            await targetRole.removePermissions(req.body.permission_ids);
        } else {
            await targetRole.removePermission(req.body.permission_ids);
        }

        res.json({
            status: 1,
            message: 'Role permission successfully deleted'
        });
    } catch (error: unknown) {
        next(error);
    }
};

export default {
    getRolePermissions,
    addRolePermissions,
    replaceRolePermissions,
    destroyRolePermission
};
