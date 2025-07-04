import { NextFunction, Request, Response } from 'express';
import User from '../database/models/User';
import { AppError } from '../middlewares/errorHandler';
import { findMissingRoles, userCanManageRoles } from '../services/roleService';

// Fetch all roles assigned to a user
const getUserRoles = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const targetUser = await User.findByPk(req.params.user_id);
        if (!targetUser) throw new AppError('User not found', 404);

        let roles = null;

        // Only show user roles within their channel if the authenticated user's role is not global
        if (req.isGlobalRole) {
            roles = await targetUser.getRoles();
        } else {
            roles = await targetUser.getRoles({
                where: {
                    channel_id: req?.channel?.id
                }
            });
        }

        res.json({
            status: 1,
            data: roles
        });
    } catch (error: unknown) {
        next(error);
    }
};

// Assign one or more roles to a user
const addUserRoles = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const targetUser = await User.findByPk(req.params.user_id);
        if (!targetUser) throw new AppError('User not found', 404);

        const missingRoles = await findMissingRoles(req.body.role_ids);

        if (missingRoles.length > 0) {
            throw new AppError(`Role IDs ${missingRoles} do not exist`, 404);
        }

        const authUserRoleLevel = await (req.authorizedUser as User).checkPermissionLevel(
            ['assign:user_role', 'admin:user_role'],
            'global'
        );
        const authUserCanAssignRoles = await userCanManageRoles(
            req.body.role_ids,
            authUserRoleLevel!,
            req.channel?.id,
            req.isGlobalRole
        );

        // If the request is made by a channel-based role, it ensures that they can only attach role ids within their channel
        if (!authUserCanAssignRoles)
            throw new AppError(
                'One or more roles cannot be added: they either belong to a different channel or have a level equal to or higher than your own',
                403
            );

        if (Array.isArray(req.body.role_ids)) {
            await targetUser.addRoles(req.body.role_ids);
        } else {
            await targetUser.addRole(req.body.role_ids);
        }

        const roles = await targetUser.getRoles();

        res.json({
            status: 1,
            data: roles
        });
    } catch (error: unknown) {
        next(error);
    }
};

// Replace all roles of a user
const replaceUserRoles = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const targetUser = await User.findByPk(req.params.user_id);
        if (!targetUser) throw new AppError('User not found', 404);
        if (targetUser.username == 'superadmin')
            throw new AppError("Superadmin's roles cannot be updated", 403);

        const missingRoles = await findMissingRoles(req.body.role_ids);
        if (missingRoles.length > 0)
            throw new AppError(`Role IDs ${missingRoles} do not exist`, 404);

        const authUserRoleLevel = await (req.authorizedUser as User).checkPermissionLevel(
            ['assign:user_role', 'admin:user_role'],
            'global'
        );

        const authUserCanAssignRoles = await userCanManageRoles(
            req.body.role_ids,
            authUserRoleLevel!,
            req.channel?.id,
            req.isGlobalRole
        );

        if (!authUserCanAssignRoles)
            throw new AppError(
                'One or more roles cannot be replaced: they either belong to a different channel or have a level equal to or higher than your own',
                403
            );

        await targetUser.setRoles(req.body.role_ids);

        const updatedRoles = await targetUser.getRoles();

        res.json({
            status: 1,
            data: updatedRoles
        });
    } catch (error: unknown) {
        next(error);
    }
};

// Remove a specific role from a user
const destroyUserRole = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const targetUser = await User.findByPk(req.params.user_id);
        if (!targetUser) throw new AppError('User not found', 404);
        if (targetUser.username == 'superadmin')
            throw new AppError("Superadmin's roles cannot be deleted", 403);

        const missingRoles = await findMissingRoles(req.body.role_ids);
        if (missingRoles.length > 0)
            throw new AppError(`Role IDs ${missingRoles} do not exist`, 404);

        const authUserRoleLevel = await (req.authorizedUser as User).checkPermissionLevel(
            ['assign:user_role', 'admin:user_role'],
            'global'
        );
        const authUserCanAssignRoles = await userCanManageRoles(
            req.body.role_ids,
            authUserRoleLevel!,
            req.channel?.id,
            req.isGlobalRole
        );

        if (!authUserCanAssignRoles)
            throw new AppError(
                'One or more roles cannot be deleted: they either belong to a different channel or have a level equal to or higher than your own',
                403
            );

        if (Array.isArray(req.body.role_ids)) {
            await targetUser.removeRoles(req.body.role_ids);
        } else {
            await targetUser.removeRole(req.body.role_ids);
        }

        const remainingRoles = await targetUser.getRoles();

        res.json({
            status: 1,
            message: 'User role successfully deleted',
            data: remainingRoles
        });
    } catch (error: unknown) {
        next(error);
    }
};

export default {
    getUserRoles,
    addUserRoles,
    replaceUserRoles,
    destroyUserRole
};
