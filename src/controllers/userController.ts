import bcrypt from 'bcrypt';
import { NextFunction, Request, Response } from 'express';
import User from '../database/models/User';
import { AppError } from '../middlewares/errorHandler';
import { isUserMorePrivilegedThan } from '../services/roleService';
import { IRequestWithUserAndChannel } from '../types';
import { userHasPermissions } from '../services/permissionService';

const getAll = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const users = await User.findAll();

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
        const customReq = req as IRequestWithUserAndChannel;
        const _userHasPermissions = await userHasPermissions(
            customReq.user.id,
            ['view:user', 'admin:user'],
        );

        if(!_userHasPermissions && customReq.user.id != parseInt(req.params.id)){
            throw new AppError('Unauthorized', 403);
        }

        const user = await User.findByPk(req.params.id);

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
        let user = await User.findByPk(req.params.id);

        if (!user) {
            throw new AppError('User not found', 404);
        }

        const customReq = req as IRequestWithUserAndChannel;

        // Skip these validations if user is updating herself
        if(user.id != customReq.user.id){
            // Prevent changing superadmin's username
            if (user.username === 'superadmin') {
                const { username, ...rest } = req.body;
                req.body = rest;
            }

            const isAuthorizedUserMorePrivileged = await isUserMorePrivilegedThan(customReq.user.id, user.id);

            if(!isAuthorizedUserMorePrivileged){
                throw new AppError("You can't update a user with the same or higher privilege / role level than you.", 403);
            }
        }

        if (req.body.password) {
            const hash = bcrypt.hashSync(req.body.password, 10);
            req.body.password = hash;
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
        if (!user) throw new AppError('User not found.', 404);

        if (user?.username == 'superadmin') throw new AppError('Cannot delete superadmin user.');

        const customReq = req as IRequestWithUserAndChannel;
        const isAuthorizedUserMorePrivileged = await isUserMorePrivilegedThan(customReq.user.id, user.id);

        if(!isAuthorizedUserMorePrivileged){
            throw new AppError("You can't delete a user with the same or higher privilege / role level than you.", 403);
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
