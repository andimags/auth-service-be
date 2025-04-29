import { NextFunction, Request, Response } from 'express';
import Role from '../database/models/Role';

const getAll = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const roles = await Role.findAll();

        res.json({
            status: 1,
            data: roles
        });
    } catch (error: unknown) {
        next(error);
    }
};

const find = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const role = await Role.findByPk(req.params.id);

        if (!role) {
            res.status(404).json({
                status: 0,
                message: 'Role not found.'
            });
        }

        res.json({
            status: 1,
            data: role 
        });
    } catch (error: unknown) {
        next(error);
    }
};

const add = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const role = await Role.create(req.body);

        res.json({
            status: 1,
            data: role
        });
    } catch (error: unknown) {
        next(error);
    }
};

const update = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const role = await Role.findByPk(req.params.id);

        if (!role) {
            res.status(404).json({
                status: 0,
                message: 'Role not found.'
            });
        }

        await role?.update(req.body);

        res.json({
            status: 1,
            data: role
        });
    } catch (error: unknown) {
        next(error);
    }
};

const destroy = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const role = await Role.findByPk(req.params.id);

        if (!role) {
            res.status(404).json({
                status: 0,
                message: 'Role not found.'
            });
        }

        await role?.destroy();

        res.json({
            status: 1
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
