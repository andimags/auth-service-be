import { NextFunction, Request, Response } from 'express';
import Role from '../database/models/Role';
import RolePermission from '../database/models/RolePermission';
import User from '../database/models/User';
import { AppError } from '../middlewares/errorHandler';
import { checkPermissionLevel, findMissingPermissions } from '../services/permissionService';
import { IRequestWithUserAndChannel } from '../types';

// Fetch all permissions assigned to a role
const getRolePermissions = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const customReq = req as IRequestWithUserAndChannel;
        const role = await Role.findByPk(req.params.role_id);

        if (!customReq.isGlobalRole && role?.channel_id != customReq.channel?.id) {
            throw new AppError("Unauthorized to view this role's permissions.", 403);
        }

        if (!role) {
            throw new AppError('Role not found', 404);
        }

        const permissions = await role.getPermissions();

        res.json({
            status: 1,
            data: permissions
        });
    } catch (error: unknown) {
        next(error);
    }
};

// Assign one or more permissions to a role
const addRolePermissions = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const role = await Role.findByPk(req.params.role_id);
        const authorizedUser = (await User.findByPk(req.authorizedUser.id))!;
        const authorizeUserRoleLevel = (await checkPermissionLevel(
            authorizedUser,
            ['remove:role_permission', 'admin:role_permission'],
            'global'
        ))!;

        if (!role) {
            throw new AppError('Role not found', 404);
        }

        if (role.level <= authorizeUserRoleLevel) {
            throw new AppError(
                "You cannot replace permissions from a role with the higher or same level as your permission's role.",
                403
            );
        }

        if (!req.isGlobalRole && role?.channel_id != req.channel?.id) {
            throw new AppError('Unauthorized to add permissions to this role.', 403);
        }

        const missingPermissions = await findMissingPermissions(req.body.permission_ids);

        console.log(missingPermissions);

        if (missingPermissions.length > 0) {
            throw new AppError(`Permission IDs ${missingPermissions} do not exist.`, 403);
        }

        await role.addPermissions(req.body.permission_ids);

        const permissions = await role.getPermissions();

        res.json({
            status: 1,
            data: permissions
        });
    } catch (error: unknown) {
        next(error);
    }
};

// Replace all permissions of a role
const replaceRolePermissions = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const customReq = req as IRequestWithUserAndChannel;
        const role = await Role.findByPk(req.params.role_id);
        const authorizedUser = (await User.findByPk(customReq.user.id))!;
        const authorizeUserRoleLevel = (await checkPermissionLevel(
            authorizedUser,
            ['remove:role_permission', 'admin:role_permission'],
            'global'
        ))!;

        if (!role) {
            throw new AppError('Role not found', 404);
        }

        if (role.level <= authorizeUserRoleLevel) {
            throw new AppError(
                "You cannot replace permissions from a role with the higher or same level as your permission's role.",
                403
            );
        }

        if (!customReq.isGlobalRole && role?.channel_id != customReq.channel?.id) {
            throw new AppError('Unauthorized to replace permissions to this role.', 403);
        }

        const missingPermissions = await findMissingPermissions(customReq.body.role_ids);

        if (missingPermissions.length > 0) {
            throw new AppError(`Permission IDs ${missingPermissions} do not exist.`, 403);
        }

        await role.setPermissions(req.body.permission_ids);

        const permissions = await role.getPermissions();

        res.json({
            status: 1,
            data: permissions
        });
    } catch (error: unknown) {
        next(error);
    }
};

// Remove a specific permission from a role
const destroyRolePermission = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const customReq = req as IRequestWithUserAndChannel;
        const role = await Role.findByPk(customReq.params.role_id);
        const authorizedUser = (await User.findByPk(customReq.user.id))!;
        const authorizeUserRoleLevel = (await checkPermissionLevel(
            authorizedUser,
            ['remove:role_permission', 'admin:role_permission'],
            'global'
        ))!;

        if (!role) {
            throw new AppError('Role not found', 404);
        }

        if (role.level <= authorizeUserRoleLevel) {
            throw new AppError(
                "You cannot delete a permission from a role with the higher or same level as your permission's role.",
                403
            );
        }

        await RolePermission.destroy({
            where: {
                permission_id: req.params.permission_id,
                role_id: req.params.role_id
            }
        });

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
