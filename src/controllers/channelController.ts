import { NextFunction, Request, Response } from 'express';
import Channel from '../database/models/Channel';
import { AppError } from '../middlewares/errorHandler';
import User from '../database/models/User';

const getAll = async (req: Request, res: Response, next: NextFunction) => {
    try {
        let channels = null;

        if (req.isGlobalRole) {
            channels = await Channel.findAll();
        } else {
            channels = await (req.authorizedUser as User).getChannels();
        }

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
        const channel = await Channel.findByPk(req.params.channel_id);
        if (!channel) throw new AppError('Channel not found', 404);

        const authorizedUserHasAccessToChannel =
            await req.authorizedUser.hasAccessToChannel(channel.id);

        if (!req.isGlobalRole && !authorizedUserHasAccessToChannel) {
            throw new AppError(
                'You can only view channels associated to your roles',
                403
            );
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
        const channel = await Channel.findByPk(req.params.channel_id);
        if (!channel) throw new AppError('Channel not found', 404);

        const authorizedUserHasAccessToChannel =
            await req.authorizedUser.hasAccessToChannel(channel.id);

        if (!req.isGlobalRole && !authorizedUserHasAccessToChannel) {
            throw new AppError(
                "You can only update channels you're associated to",
                403
            );
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
        const channel = await Channel.findByPk(req.params.channel_id, {
            paranoid: false
        });
        if (!channel) throw new AppError('Channel not found', 404);

        await channel?.destroy({ force: shouldForce });

        res.json({
            status: 1,
            message: shouldForce
                ? 'Channel successfully deleted permanently'
                : 'Channel successfully soft-deleted'
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
