import { NextFunction, Request, Response } from 'express';
import Role from '../database/models/Role';
import User from '../database/models/User';
import { AppError } from '../middlewares/errorHandler';

const getAll = async (req: Request, res: Response, next: NextFunction) => {
    try {
        let roles = null;

        if (req.isGlobalRole) {
            roles = await Role.findAll();
        } else {
            roles = await Role.findAll({
                where: { channel_id: req?.channel?.id }
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

const find = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const targetRole = await Role.findByPk(req.params.role_id);
        if (!targetRole) throw new AppError('Role not found', 404);

        if (!req.isGlobalRole && targetRole?.channel_id != req?.channel?.id) {
            throw new AppError('Unauthorized to access roles outside your channel', 403);
        }

        res.json({
            status: 1,
            data: targetRole
        });
    } catch (error: unknown) {
        next(error);
    }
};

const add = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.isGlobalRole && req.channel?.id != req.body.channel_id) {
            throw new AppError('You can only add roles within your channel', 403);
        }

        const authorizeUserRoleLevel = await (req.authorizedUser as User).checkPermissionLevel(
            ['add:role', 'admin:role'],
            'global'
        );

        // Level with value 1 is the highest
        if (authorizeUserRoleLevel && authorizeUserRoleLevel > req.body.level) {
            throw new AppError(`You can only add roles with a lower level than yours`, 403);
        }

        const newRole = await Role.create(req.body);

        res.json({
            status: 1,
            data: newRole
        });
    } catch (error: unknown) {
        next(error);
    }
};

const update = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const targetRole = await Role.findByPk(req.params.role_id);
        if (!targetRole) throw new AppError('Role not found', 404);

        if (!req.isGlobalRole && req.channel?.id != targetRole.channel_id) {
            throw new AppError('You can only update roles within your channel', 403);
        }

        const authorizeUserRoleLevel = await (req.authorizedUser as User).checkPermissionLevel(
            ['update:role', 'admin:role'],
            'global'
        );

        if (authorizeUserRoleLevel && targetRole.level <= authorizeUserRoleLevel) {
            throw new AppError(
                "You can't update role level field with a higher level than yours",
                403
            );
        }

        // Level with value 1 is the highest
        if (authorizeUserRoleLevel && req.body.level <= authorizeUserRoleLevel) {
            throw new AppError(
                'New value for role level field must be lower level than yours',
                403
            );
        }

        await targetRole?.update(req.body);

        res.json({
            status: 1,
            data: targetRole
        });
    } catch (error: unknown) {
        next(error);
        return;
    }
};

const destroy = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const role = await Role.findByPk(req.params.role_id);
        if (!role) throw new AppError('Role not found', 404);

        if (!req.isGlobalRole && req.channel?.id != role.channel_id) {
            throw new AppError('You can only delete roles within your channel', 403);
        }

        const authorizeUserRoleLevel = await (req.authorizedUser as User).checkPermissionLevel(
            ['delete:role', 'admin:role'],
            'global'
        );

        // Level with value 1 is the highest
        if (authorizeUserRoleLevel && role.level <= authorizeUserRoleLevel) {
            throw new AppError('You can only delete roles with a lower level than yours', 403);
        }

        const shouldForce = req.query.force === 'true';

        await role?.destroy({ force: shouldForce });

        res.json({
            status: 1,
            message: shouldForce
                ? 'Role successfully deleted permanently'
                : 'Role successfully soft-deleted'
        });
    } catch (error: unknown) {
        next(error);
    }
};

export default {
    getAll,
    find,
    add,
    update,
    destroy
};
