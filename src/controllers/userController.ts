import { NextFunction, Request, Response } from 'express';
import User from '../database/models/User';
import { AppError } from '../middlewares/errorHandler';
import paginate from '../utils/paginate';

const getAll = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const size = parseInt(req.query.size as string) || 10;
        const searchTerm = (req.query.search as string) || undefined;
        const statusFilter = (req.query.status as string) || undefined;

        const paginatedUsers = await paginate(User, page - 1, size, {
            searchTerm: searchTerm,
            stringFields: [
                'username',
                'email',
                'first_name',
                'last_name'            
            ],
            enumFilter: statusFilter
            ? [
                {
                    field: 'status',
                    value: statusFilter
                }
                ]
            : []
        });

        res.json({
            status: 1,
            ...paginatedUsers
        });
    } catch (error: unknown) {
        next(error);
    }
};

const find = async (req: Request, res: Response, next: NextFunction) => {
    try {
        console.log('hello world');
        const authorizedUserHasPermissions = await (
            req.authorizedUser as User
        ).hasAnyPermission(['view:user', 'admin:user']);

        if (
            !authorizedUserHasPermissions &&
            req.authorizedUser.id != parseInt(req.params.user_id)
        ) {
            throw new AppError(
                'You do not have the required permissions to perform this action',
                403
            );
        }

        const targetUser = await User.findByPk(req.params.user_id);

        if (!targetUser) {
            throw new AppError('User not found', 404);
        }

        res.json({
            status: 1,
            data: targetUser
        });
    } catch (error: unknown) {
        next(error);
    }
};

const add = async (req: Request, res: Response, next: NextFunction) => {
    try {
        let newUser = await User.create(req.body);

        res.json({
            status: 1,
            data: newUser
        });
    } catch (error: unknown) {
        next(error);
    }
};

const update = async (req: Request, res: Response, next: NextFunction) => {
    try {
        let targetUser = await User.findByPk(req.params.user_id);

        if (!targetUser) {
            throw new AppError('User not found', 404);
        }

        const authorizedUser = req.authorizedUser;

        const authorizedUserHasAnyPermission =
            await authorizedUser!.hasAnyPermission([
                'update:user',
                'admin:user'
            ]);

        // Skip these validations if user is updating herself
        if (targetUser.id != authorizedUser!.id) {
            if (!authorizedUserHasAnyPermission) {
                throw new AppError(
                    'You do not have the required permissions to perform this action',
                    403
                );
            }

            const isAuthorizedUserMorePrivileged =
                await authorizedUser?.isMorePrivilegedThan(targetUser.id);

            if (!isAuthorizedUserMorePrivileged) {
                throw new AppError(
                    "You can't update a user with the same or higher privilege / role level than you",
                    403
                );
            }
        } else {
            delete req.body.status;
            delete req.body.username;
        }

        await targetUser?.update(req.body);

        res.json({
            status: 1,
            data: targetUser
        });
    } catch (error: unknown) {
        next(error);
    }
};

const destroy = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const shouldForce = req.query.force === 'true';

        const targetUser = await User.findByPk(req.params.user_id, {
            paranoid: false
        });
        if (!targetUser) throw new AppError('User not found', 404);

        if (targetUser?.username == 'superadmin')
            throw new AppError('Cannot delete superadmin user', 403);

        const authorizedUser = req.authorizedUser;
        const isAuthorizedUserMorePrivileged =
            await authorizedUser?.isMorePrivilegedThan(targetUser.id);

        if (!isAuthorizedUserMorePrivileged) {
            throw new AppError(
                "You can't delete a user with the same or higher privilege / role level than you",
                403
            );
        }

        await targetUser?.destroy({ force: shouldForce });

        res.json({
            status: 1,
            message: shouldForce
                ? 'User successfully deleted permanently'
                : 'User successfully soft-deleted'
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
