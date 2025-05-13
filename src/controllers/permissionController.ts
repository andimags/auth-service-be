import { NextFunction, Request, Response } from 'express';
import Permission from '../database/models/Permission';

const getAll = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const permissions = await Permission.findAll();

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

        await permission?.destroy({force: shouldForce});

        res.json({
            status: 1,
            message: shouldForce ? 'Permission successfully deleted permanently.' : 'Permission successfully soft-deleted'
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
