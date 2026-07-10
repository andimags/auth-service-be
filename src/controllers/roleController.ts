import { NextFunction, Request, Response } from 'express';
import { RoleScopeType } from '../constants/enums';
import Channel from '../database/models/Channel';
import Role from '../database/models/Role';
import { AppError } from '../middlewares/errorHandler';
import paginate from '../utils/paginate';
import { HttpStatus } from '../constants/httpStatus';

const getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const page = Number.parseInt(req.query.page as string);
        const size = Number.parseInt(req.query.size as string);

        if(!req.query.page && !req.query.size){
            const roles = await Role.findAll();
            res.json(roles);
            return;
        }

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
                baseWhere: req.channel ? { channel_id: req.channel.id } : undefined,
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

        res.json(paginatedRoles);
    } catch (error: unknown) {
        next(error);
    }
};

const find = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const targetRole = await Role.findByPk(req.params.role_id, {
            include: [
                { model: Channel, as: 'channel' }
            ]
        });
        
        if (!targetRole) throw new AppError('Role not found', HttpStatus.NOT_FOUND);

        if (!req.isGlobalScope && targetRole?.channel_id != req?.channel?.id) {
            throw new AppError(
                'Unauthorized to access roles outside your channel',
                HttpStatus.FORBIDDEN
            );
        }

        res.json(targetRole);
    } catch (error: unknown) {
        next(error);
    }
};

const add = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        if(req.body.channel_id){
            const channel = await Channel.findByPk(req.body.channel_id);

            if (!channel) {
                throw new AppError('Channel does not exist', HttpStatus.BAD_REQUEST);
            }
        }

        if (!req.isGlobalScope && req.channel?.id != req.body.channel_id) {
            throw new AppError(
                'You can only add roles within your channel',
                HttpStatus.FORBIDDEN
            );
        }

        const newRole = await Role.create(req.body);

        res.json(newRole);
    } catch (error: unknown) {
        next(error);
    }
};

const update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const targetRole = await Role.findByPk(req.params.role_id);
        if (!targetRole) throw new AppError('Role not found', HttpStatus.NOT_FOUND);

        if (!req.isGlobalScope && req.channel?.id != targetRole.channel_id) {
            throw new AppError(
                'You can only update roles within your channel',
                HttpStatus.FORBIDDEN
            );
        }

        await targetRole?.update(req.body);

        res.json(targetRole);
    } catch (error: unknown) {
        next(error);
    }
};

const destroy = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const role = await Role.findByPk(req.params.role_id);
        if (!role) throw new AppError('Role not found', HttpStatus.NOT_FOUND);

        if (!req.isGlobalScope && req.channel?.id != role.channel_id) {
            throw new AppError(
                'You can only delete roles within your channel',
                HttpStatus.FORBIDDEN
            );
        }

        const shouldForce = req.query.force === 'true';

        await role?.destroy({ force: shouldForce });

        res.json({
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
