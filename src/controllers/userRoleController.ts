import { NextFunction, Request, Response } from 'express';
import User from '../database/models/User';
import { AppError } from '../middlewares/errorHandler';
import { findMissingRoles, findRolesNotInChannel } from '../services/roleService';

// Fetch all roles assigned to a user
const getUserRoles = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const targetUser = await User.findByPk(req.params.user_id);
        if (!targetUser) throw new AppError('User not found', 404);

        let roles = null;

        // Only show user roles within their channel if the authenticated user's role is not global
        if (req.isGlobalScope) {
            roles = await targetUser.getRoles();
        } else {
            roles = await targetUser.getRoles({
                where: {
                    channel_id: req?.channel?.id
                }
            });
        }

        res.json(roles);
    } catch (error: unknown) {
        next(error);
    }
};

// Assign one or more roles to a user
const addUserRoles = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const targetUser = await User.findByPk(req.params.user_id);
        if (!targetUser) throw new AppError('User not found', 404);

        const missingRoles = await findMissingRoles(req.body.role_ids);

        if (missingRoles.length > 0) {
            throw new AppError(`Role IDs ${missingRoles} do not exist`, 404);
        }

        const authUserIsMorePrivileged = await req.authorizedUser?.isMorePrivileged(targetUser);

        if (!authUserIsMorePrivileged) {
            throw new AppError(
                'You can only assign roles to users with a lower privilege level than yourself',
                403
            );
        }

        if(!req.isGlobalScope) {
            const rolesNotInChannel = await findRolesNotInChannel(
                req.body.role_ids,
                req.channel!.id
            );

            if (rolesNotInChannel.length > 0) {
                throw new AppError(
                    `Role IDs ${rolesNotInChannel} do not belong to your channel and cannot be assigned`,
                    403
                );
            }
        }

        if (Array.isArray(req.body.role_ids)) {
            await targetUser.addRoles(req.body.role_ids);
        } else {
            await targetUser.addRole(req.body.role_ids);
        }

        const roles = await targetUser.getRoles();

        res.json(roles);
    } catch (error: unknown) {
        next(error);
    }
};

// Replace all roles of a user
const replaceUserRoles = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const targetUser = await User.findByPk(req.params.user_id);
        if (!targetUser) throw new AppError('User not found', 404);
        if (targetUser.username == 'superadmin')
            throw new AppError("Superadmin's roles cannot be updated", 403);

        const missingRoles = await findMissingRoles(req.body.role_ids);
        if (missingRoles.length > 0)
            throw new AppError(`Role IDs ${missingRoles} do not exist`, 404);


        const authUserIsMorePrivileged = await req.authorizedUser?.isMorePrivileged(targetUser);

        if (!authUserIsMorePrivileged) {
            throw new AppError(
                'You can only assign roles to users with a lower privilege level than yourself',
                403
            );
        }

        if(!req.isGlobalScope) {
            const rolesNotInChannel = await findRolesNotInChannel(
                req.body.role_ids,
                req.channel!.id
            );

            if (rolesNotInChannel.length > 0) {
                throw new AppError(
                    `Role IDs ${rolesNotInChannel} do not belong to your channel and cannot be assigned`,
                    403
                );
            }
        }

        await targetUser.setRoles(req.body.role_ids);

        const updatedRoles = await targetUser.getRoles();

        res.json(updatedRoles);
    } catch (error: unknown) {
        next(error);
    }
};

// Remove a specific role from a user
const destroyUserRole = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const targetUser = await User.findByPk(req.params.user_id);
        if (!targetUser) throw new AppError('User not found', 404);
        if (targetUser.username == 'superadmin')
            throw new AppError("Superadmin's roles cannot be deleted", 403);

        const missingRoles = await findMissingRoles(req.body.role_ids);
        if (missingRoles.length > 0)
            throw new AppError(`Role IDs ${missingRoles} do not exist`, 404);

        const authUserIsMorePrivileged = await req.authorizedUser?.isMorePrivileged(targetUser);

        if (!authUserIsMorePrivileged) {
            throw new AppError(
                'You can only assign roles to users with a lower privilege level than yourself',
                403
            );
        }

        if(!req.isGlobalScope) {
            const rolesNotInChannel = await findRolesNotInChannel(
                req.body.role_ids,
                req.channel!.id
            );

            if (rolesNotInChannel.length > 0) {
                throw new AppError(
                    `Role IDs ${rolesNotInChannel} do not belong to your channel and cannot be assigned`,
                    403
                );
            }
        }

        if (Array.isArray(req.body.role_ids)) {
            await targetUser.removeRoles(req.body.role_ids);
        } else {
            await targetUser.removeRole(req.body.role_ids);
        }

        const remainingRoles = await targetUser.getRoles();

        res.json(remainingRoles);
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
