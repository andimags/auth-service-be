import { NextFunction, Request, Response } from 'express';
import User from '../database/models/User';
import UserRole from '../database/models/UserRole';
import { throwError } from '../middlewares/errorHandler';

// Fetch all roles assigned to a user
const getUserRoles = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = await User.findByPk(req.params.user_id);

        if (!user) {
            return throwError('User not found', 404);
        }

        const roles = await user.getRoles();

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
        const user = await User.findByPk(req.params.user_id);

        if (!user) {
            return throwError('User not found', 404);
        }

        await user.addRoles(req.body.role_ids);

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
        const user = await User.findByPk(req.params.user_id);

        if (!user) {
            return throwError('User not found', 404);
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
        await UserRole.destroy({
            where: {
                user_id: req.params.user_id,
                role_id: req.params.role_id
            }
        });

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
