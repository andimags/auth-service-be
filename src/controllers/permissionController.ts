import { NextFunction, Request, Response } from 'express';
import { PermissionAccessLevelType, PermissionScopeType } from '../constants/enums';
import Permission from '../database/models/Permission';
import { AppError } from '../middlewares/errorHandler';
import paginate from '../utils/paginate';
import { HttpStatus } from '../constants/httpStatus';
import { getScopeType } from '../utils/getScopeType';

const getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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
                            field: 'scope',
                            value: scopeFilter,
                            allowedValues: Object.values(PermissionScopeType) as string[],
                        }]
                        : []),
                    ...(accessLevelFilter
                        ? [{
                            field: 'access_level',
                            value: accessLevelFilter,
                            allowedValues: Object.values(PermissionAccessLevelType) as string[],
                        }]
                        : []),
                    ...(isSystemFilter
                        ? [{
                            field: 'is_system',
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


const find = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const targetPermission = await Permission.findByPk(
            req.params.permission_id
        );
        if (!targetPermission) throw new AppError('Permission not found', HttpStatus.NOT_FOUND);

        const hasAccessToPermission = await req.authorizedUser?.hasPermissions(
            targetPermission.ref_name,
            getScopeType(req.isGlobalScope),
            req.isGlobalScope ? undefined : req.channel?.id
        );

        if (!req.isGlobalScope && !hasAccessToPermission) {
            throw new AppError(
                'You are not authorized to view this permission',
                HttpStatus.FORBIDDEN
            );
        }

        res.json(targetPermission);
    } catch (error: unknown) {
        next(error);
    }
};

const add = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const permission = await Permission.create(req.body);

        res.json(permission);
    } catch (error: unknown) {
        next(error);
    }
};

const update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const targetPermission = await Permission.findByPk(
            req.params.permission_id
        );
        if (!targetPermission) throw new AppError('Permission not found', HttpStatus.NOT_FOUND);

        const hasAccessToPermission = await (
            req.authorizedUser!
        ).hasPermissions(
            targetPermission.ref_name,
            getScopeType(req.isGlobalScope),
            req.isGlobalScope ? undefined : req.channel?.id
        );

        if (!req.isGlobalScope && !hasAccessToPermission) {
            throw new AppError(
                'You are not authorized to update this permission',
                HttpStatus.FORBIDDEN
            );
        }

        await targetPermission?.update(req.body);

        res.json(targetPermission);
    } catch (error: unknown) {
        next(error);
    }
};

const destroy = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const shouldForce = req.query.force === 'true';
        const targetPermission = await Permission.findByPk(
            req.params.permission_id,
            {
                paranoid: false
            }
        );
        if (!targetPermission) throw new AppError('Permission not found', HttpStatus.NOT_FOUND);

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
