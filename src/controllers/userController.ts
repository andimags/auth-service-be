import bcrypt from 'bcrypt';
import { NextFunction, Request, Response } from 'express';
import Role from '../database/models/Role';
import User from '../database/models/User';
import { AppError } from '../middlewares/errorHandler';

const getAll = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const users = await User.findAll({ include: Role });

        res.json({
            status: 1,
            data: users
        });
    } catch (error: unknown) {
        next(error);
    }
};

const find = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = await User.findByPk(req.params.id, { include: [Role] });

        if (!user) {
            throw new AppError('User not found', 404);
        }

        res.json({
            status: 1,
            data: user
        });
    } catch (error: unknown) {
        next(error);
    }
};

const add = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const hash = bcrypt.hashSync(req.body.password, 10);
        req.body.password = hash;

        let user = await User.create(req.body);

        if (!user) {
            throw new AppError('User not found', 404);
        }

        if (req.body.role_ids) {
            await user.setRoles(req.body.role_ids);

            user = await user.reload({
                include: [Role]
            });
        }

        res.json({
            status: 1,
            data: user
        });
    } catch (error: unknown) {
        next(error);
    }
};

const update = async (req: Request, res: Response, next: NextFunction) => {
    try {
        let user = await User.findByPk(req.params.id, { include: Role });

        if (req.body.password) {
            const hash = bcrypt.hashSync(req.body.password, 10);
            req.body.password = hash;
        }

        if (!user) {
            throw new AppError('User not found', 404);
        }

        if (req.body.role_ids) {
            await user.setRoles(req.body.role_ids);

            user = await user.reload({
                include: [Role]
            });
        }

        await user?.update(req.body);

        res.json({
            status: 1,
            data: user
        });
    } catch (error: unknown) {
        next(error);
    }
};

const destroy = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const shouldForce = req.query.force === 'true';
        const user = await User.findByPk(req.params.id, { paranoid: false });

        if (!user) {
            res.status(404).json({
                status: 0,
                message: 'User not found.'
            });
        }

        await user?.destroy({ force: shouldForce });

        res.json({
            status: 1,
            message: shouldForce
                ? 'User successfully deleted permanently.'
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
