import { NextFunction, Request, Response } from 'express';
import Channel from '../database/models/Channel';
import generateApiKey from 'generate-api-key';

const getAll = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const channels = await Channel.findAll();

        res.json({
            status: 1,
            data: channels
        });
    } catch (error: unknown) {
        next(error);
    }
};

const find = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const channel = await Channel.findByPk(req.params.id);

        if (!channel) {
            res.status(404).json({
                status: 0,
                message: 'Channel not found.'
            });
        }

        res.json({
            status: 1,
            data: channel
        });
    } catch (error: unknown) {
        next(error);
    }
};

const add = async (req: Request, res: Response, next: NextFunction) => {
    try {
        req.body.api_key = generateApiKey();

        const channel = await Channel.create(req.body);

        res.json({
            status: 1,
            data: channel
        });
    } catch (error: unknown) {
        next(error);
    }
};

const update = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const channel = await Channel.findByPk(req.params.id);

        if (!channel) {
            res.status(404).json({
                status: 0,
                message: 'Channel not found.'
            });
        }

        await channel?.update(req.body);

        res.json({
            status: 1,
            data: channel
        });
    } catch (error: unknown) {
        next(error);
    }
};

const destroy = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const shouldForce = req.query.force === 'true';
        const channel = await Channel.findByPk(req.params.id, { paranoid: false });

        if (!channel) {
            res.status(404).json({
                status: 0,
                message: 'Channel not found.'
            });
        }

        await channel?.destroy({force: shouldForce});

        res.json({
            status: 1,
            message: shouldForce ? 'Channel successfully deleted permanently.' : 'Channel successfully soft-deleted'
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
