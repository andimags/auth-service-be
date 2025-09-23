import { NextFunction, Request, Response } from 'express';
import Role from '../database/models/Role';
import User from '../database/models/User';
import { AppError } from '../middlewares/errorHandler';
import paginate from '../utils/paginate';
import { RoleScopeType } from '../constants/enums';
import Channel from '../database/models/Channel';

const getAll = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const size = parseInt(req.query.size as string) || 10;
        const searchTerm = (req.query.search as string) || undefined;
        const scopeFilter = (req.query.scope as string) || undefined;
        const sortField = (req.query.sort_field as string) || undefined;
        const sortDesc =
            typeof req.query.sort_desc === 'string'
                ? req.query.sort_desc === 'true'
                : undefined;

        const paginatedRoles = await paginate(
            Role,
            page - 1,
            size,
            {
                searchTerm: searchTerm,
                stringFields: ['name', 'description', 'ref_name'],
                enumFilter: scopeFilter
                    ? [
                          {
                              field: 'scope',
                              value: scopeFilter,
                              allowedValues: Object.values(RoleScopeType)
                          }
                      ]
                    : []
            },
            {
                field: sortField,
                desc: sortDesc
            },
            [
                { model: Channel, as: 'channel' }
            ]
        );

        res.json({
            status: 1,
            ...paginatedRoles
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
            throw new AppError(
                'Unauthorized to access roles outside your channel',
                403
            );
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
            throw new AppError(
                'You can only add roles within your channel',
                403
            );
        }

        const authorizeUserRoleLevel = await (
            req.authorizedUser as User
        ).hasAnyPermissionLevel(['add:role', 'admin:role'], 'global');

        // Level with value 1 is the highest
        if (authorizeUserRoleLevel && authorizeUserRoleLevel > req.body.level) {
            throw new AppError(
                `You can only add roles with a lower level than yours`,
                403
            );
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
            throw new AppError(
                'You can only update roles within your channel',
                403
            );
        }

        const authorizeUserRoleLevel = await (
            req.authorizedUser as User
        ).hasAnyPermissionLevel(['update:role', 'admin:role'], 'global');

        if (
            authorizeUserRoleLevel &&
            targetRole.level <= authorizeUserRoleLevel
        ) {
            throw new AppError(
                "You can't update role level field with a higher level than yours",
                403
            );
        }

        // Level with value 1 is the highest
        if (
            authorizeUserRoleLevel &&
            req.body.level <= authorizeUserRoleLevel
        ) {
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
            throw new AppError(
                'You can only delete roles within your channel',
                403
            );
        }

        const authorizeUserRoleLevel = await (
            req.authorizedUser as User
        ).hasAnyPermissionLevel(['delete:role', 'admin:role'], 'global');

        // Level with value 1 is the highest
        if (authorizeUserRoleLevel && role.level <= authorizeUserRoleLevel) {
            throw new AppError(
                'You can only delete roles with a lower level than yours',
                403
            );
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
