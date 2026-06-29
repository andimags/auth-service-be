import { NextFunction, Request, Response } from 'express';
import { PermissionAccessLevelType, PermissionScopeType } from '../constants/enums';
import Permission from '../database/models/Permission';
import User from '../database/models/User';
import { AppError } from '../middlewares/errorHandler';
import paginate from '../utils/paginate';

const getAll = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const page = Number.parseInt(req.query.page as string);
        const size = Number.parseInt(req.query.size as string);

        if(!req.query.page && !req.query.size){
            const permissions = await Permission.findAll();
            res.json(permissions);
            return;
        }

        const searchTerm = (req.query.search as string) || undefined;
        const scopeFilter = (req.query.scope as string) || undefined;
        const accessLevelFilter = (req.query.access_level as string) || undefined;
        const isSystemFilter = (req.query.is_system as string) || undefined;
        console.log('isSystemFilter', isSystemFilter)
        const sortField = (req.query.sort_field as string) || undefined;
        const sortDesc =
            typeof req.query.sort_desc === 'string'
                ? req.query.sort_desc === 'true'
                : undefined;

        const paginatedRoles = await paginate(
            Permission,
            page - 1,
            size,
            {
                searchTerm: searchTerm,
                stringFields: ['name', 'description', 'ref_name'],
                enumFilter:  [
                ...(scopeFilter
                    ? [{
                        field: "scope",
                        value: scopeFilter,
                        allowedValues: Object.values(PermissionScopeType) as string[],
                    }]
                    : []),
                ...(accessLevelFilter
                    ? [{
                        field: "access_level",
                        value: accessLevelFilter,
                        allowedValues: Object.values(PermissionAccessLevelType) as string[],
                    }]
                    : []),
                ...(isSystemFilter
                    ? [{
                        field: "is_system",
                        value: isSystemFilter,
                        allowedValues: ['true', 'false'],
                    }]
                    : []),
                ]
            },
            {
                field: sortField,   
                desc: sortDesc
            }
        );

        res.json(paginatedRoles);
    } catch (error: unknown) {
        next(error);
    }
};


const find = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const targetPermission = await Permission.findByPk(
            req.params.permission_id
        );
        if (!targetPermission) throw new AppError('Permission not found', 404);

        const hasAccessToPermission = await req.authorizedUser?.hasPermissions(
            targetPermission.ref_name,
            req.isGlobalScope ? 'global' : 'channel',
            req.isGlobalScope ? undefined : req.channel?.id
        );

        if (!req.isGlobalScope && !hasAccessToPermission) {
            throw new AppError(
                'You are not authorized to view this permission',
                403
            );
        }

        res.json(targetPermission);
    } catch (error: unknown) {
        next(error);
    }
};

const add = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const permission = await Permission.create(req.body);

        res.json(permission);
    } catch (error: unknown) {
        next(error);
    }
};

const update = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const targetPermission = await Permission.findByPk(
            req.params.permission_id
        );
        if (!targetPermission) throw new AppError('Permission not found', 404);

        const hasAccessToPermission = await (
            req.authorizedUser as User
        ).hasPermissions(
            targetPermission.ref_name,
            req.isGlobalScope ? 'global' : 'channel',
            req.isGlobalScope ? undefined : req.channel?.id
        );

        if (!req.isGlobalScope && !hasAccessToPermission) {
            throw new AppError(
                'You are not authorized to update this permission',
                403
            );
        }

        await targetPermission?.update(req.body);

        res.json(targetPermission);
    } catch (error: unknown) {
        next(error);
    }
};

const destroy = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const shouldForce = req.query.force === 'true';
        const targetPermission = await Permission.findByPk(
            req.params.permission_id,
            {
                paranoid: false
            }
        );
        if (!targetPermission) throw new AppError('Permission not found', 404);

        await targetPermission?.destroy({ force: shouldForce });

        res.json({
            message: shouldForce
                ? 'Permission successfully deleted permanently'
                : 'Permission successfully soft-deleted'
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
