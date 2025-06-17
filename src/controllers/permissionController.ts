import { NextFunction, Request, Response } from 'express';
import Permission from '../database/models/Permission';
import { IRequestWithUserAndChannel } from '../types';
import User from '../database/models/User';
import { getUserPermissions } from '../services/permissionService';

const getAll = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const customReq = req as IRequestWithUserAndChannel;
        const authorizedUser = (await User.findByPk(customReq.user.id))!;
        let permissions = null;

        if(customReq.isGlobalRole){
            permissions = await Permission.findAll();
        }
        else{
            permissions = await getUserPermissions(customReq.user.id, (customReq.channel!.id));
        }

        res.json({
            status: 1,
            data: permissions
        });
    } catch (error: unknown) {
        next(error);
    }
};

const find = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const permission = await Permission.findByPk(req.params.id);

        if (!permission) {
            res.status(404).json({
                status: 0,
                message: 'Permission not found.'
            });
        }

        res.json({
            status: 1,
            data: permission
        });
    } catch (error: unknown) {
        next(error);
    }
};

const add = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const permission = await Permission.create(req.body);

        res.json({
            status: 1,
            data: permission
        });
    } catch (error: unknown) {
        next(error);
    }
};

const update = async (req: Request, res: Response, next: NextFunction) => {
    try {
        res.send('passed middleware');
        const permission = await Permission.findByPk(req.params.id);

        if (!permission) {
            res.status(404).json({
                status: 0,
                message: 'Permission not found.'
            });
        }

        await permission?.update(req.body);

        res.json({
            status: 1,
            data: permission
        });
    } catch (error: unknown) {
        next(error);
    }
};

const destroy = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const shouldForce = req.query.force === 'true';
        const permission = await Permission.findByPk(req.params.id, { paranoid: false });

        if (!permission) {
            res.status(404).json({
                status: 0,
                message: 'Permission not found.'
            });
        }

        await permission?.destroy({ force: shouldForce });

        res.json({
            status: 1,
            message: shouldForce
                ? 'Permission successfully deleted permanently.'
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
