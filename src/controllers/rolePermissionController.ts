import { NextFunction, Request, Response } from 'express';
import Role from '../database/models/Role';
import RolePermission from '../database/models/RolePermission';
import { throwError } from '../middlewares/errorHandler';

// Fetch all permissions assigned to a role
const getRolePermissions = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const role = await Role.findByPk(req.params.role_id);

        if (!role) {
            return throwError('Role not found', 404);
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

        if (!role) {
            return throwError('Role not found', 404);
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
        const role = await Role.findByPk(req.params.role_id);

        if (!role) {
            return throwError('Role not found', 404);
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
