import { NextFunction, Request, Response } from 'express';
import User from '../database/models/User';
import { AppError } from '../middlewares/errorHandler';
import paginate from '../utils/paginate';
import { UserStatusType } from '../constants/enums';

const getAll = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const size = parseInt(req.query.size as string) || 10;
        const searchTerm = (req.query.search as string) || undefined;
        const statusFilter = (req.query.status as string) || undefined;
        const sortField = (req.query.sort_field as string) || undefined;
        const sortDesc =
            typeof req.query.sort_desc === 'string'
                ? req.query.sort_desc === 'true'
                : undefined;

        const paginatedUsers = await paginate(
            User,
            page - 1,
            size,
            {
                searchTerm: searchTerm,
                stringFields: ['username', 'email', 'first_name', 'last_name'],
                enumFilter: statusFilter
                    ? [
                        {
                            field: 'status',
                            value: statusFilter,
                            allowedValues: Object.values(UserStatusType)
                        }
                    ]
                    : []
            },
            {
                field: sortField,
                desc: sortDesc
            }
        );

        res.json(paginatedUsers);
    } catch (error: unknown) {
        next(error);
    }
};

const find = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const targetUser = await User.findByPk(req.params.user_id);

        if (!targetUser) {
            throw new AppError('User not found', 404);
        }

        res.json(targetUser);
    } catch (error: unknown) {
        next(error);
    }
};

const add = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const newUser = await User.create(req.body);

        const user = newUser.toJSON();
        delete user.password;

        res.json(user);
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

        const authorizedUser = req.authorizedUser as User;

        // Skip these validations if user is updating herself
        if (targetUser.id != authorizedUser!.id) {
            const isAuthorizedUserMorePrivileged =
                await authorizedUser?.isMorePrivileged(targetUser);

            if (!isAuthorizedUserMorePrivileged) {
                throw new AppError(
                    "You can't update a user with the same or higher privilege / role level than you",
                    403
                );
            }
        } else {
            // user cannot update their own status
            delete req.body.status;
        }

        await targetUser?.update(req.body);

        res.json(targetUser);
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

        const authorizedUser = req.authorizedUser as User;
        const isAuthorizedUserMorePrivileged =
            await authorizedUser?.isMorePrivileged(targetUser);

        if (!isAuthorizedUserMorePrivileged) {
            throw new AppError(
                "You can't delete a user with the same or higher privilege / role level than you",
                403
            );
        }

        await targetUser?.destroy({ force: shouldForce });

        res.json({
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
