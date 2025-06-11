import { NextFunction, Request, Response } from 'express';
import User from '../database/models/User';
import { AppError } from '../middlewares/errorHandler';
import { findMissingRoles, isRoleAssignable } from '../services/roleService';
import { IRequestWithUserAndChannel } from '../types';

// Fetch all roles assigned to a user
const getUserRoles = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const customReq = req as IRequestWithUserAndChannel;
        const user = await User.findByPk(req.params.user_id);

        if (!user) {
            throw new AppError('User not found', 404);
        }

        let roles = null;

        // Only show user roles within their channel if the authenticated user's role is not global
        if (customReq.isGlobalRole) {
            roles = await user.getRoles();
        } else {
            roles = await user.getRoles({
                where: {
                    channel_id: customReq?.channel?.id
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
        const customReq = req as IRequestWithUserAndChannel;
        const user = await User.findByPk(req.params.user_id);

        if (!user) {
            throw new AppError('User not found', 404);
        }

        const missingRoles = await findMissingRoles(customReq.body.role_ids);

        if (missingRoles.length > 0) {
            throw new AppError(`Role IDs ${missingRoles} do not exist.`, 403);
        }

        const _isRoleAssignable = await isRoleAssignable(
            customReq.body.role_ids,
            customReq.channel?.id ?? null
        );

        // If the request is made by a channel-based role, it ensures that they can only attach role ids within their channel
        if (!customReq.isGlobalRole && !_isRoleAssignable) {
            throw new AppError('You can only attach roles to this user within your channel.', 403);
        }

        await user.addRoles(customReq.body.role_ids);

        const roles = await user.getRoles();

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
        const customReq = req as IRequestWithUserAndChannel;
        const user = await User.findByPk(req.params.user_id);

        if (!user) {
            throw new AppError('User not found', 404);
        }

        if (user.username == 'superadmin') {
            throw new AppError("Superadmin's roles cannot be updated.", 403);
        }

        const missingRoles = await findMissingRoles(customReq.body.role_ids);

        if (missingRoles.length > 0) {
            throw new AppError(`Role IDs ${missingRoles} do not exist.`, 403);
        }

        const _isRoleAssignable = await isRoleAssignable(
            customReq.body.role_ids,
            customReq.channel?.id ?? null
        );

        if (!customReq.isGlobalRole && !_isRoleAssignable) {
            throw new AppError('You can only attach roles to this user within your channel.', 403);
        }

        await user.setRoles(req.body.role_ids);

        const roles = await user.getRoles();

        res.json({
            status: 1,
            data: roles
        });
    } catch (error: unknown) {
        next(error);
    }
};

// Remove a specific role from a user
const destroyUserRole = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const customReq = req as IRequestWithUserAndChannel;
        const user = await User.findByPk(req.params.user_id);

        if (!user) {
            throw new AppError('User not found', 404);
        }

        if (user.username == 'superadmin') {
            throw new AppError("Superadmin's roles cannot be updated.", 403);
        }

        const missingRoles = await findMissingRoles(customReq.body.role_ids);

        if (missingRoles.length > 0) {
            throw new AppError(`Role IDs ${missingRoles} do not exist.`, 403);
        }

        const _isRoleAssignable = await isRoleAssignable(
            customReq.body.role_ids,
            customReq.channel?.id ?? null
        );

        // If the request is made by a channel-based role, it ensures that they can only remove role ids within their channel
        if (!customReq.isGlobalRole && !_isRoleAssignable) {
            throw new AppError('You can only remove roles to this user within your channel.', 403);
        }

        await user.removeRoles(customReq.body.role_ids);

        res.json({
            status: 1,
            message: 'User role successfully deleted'
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
