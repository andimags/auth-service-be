import { NextFunction, Request, Response } from 'express';
import Channel from '../database/models/Channel';
import { AppError } from '../middlewares/errorHandler';
import paginate from '../utils/paginate';

const getAll = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const size = parseInt(req.query.size as string) || 10;
        const searchTerm = (req.query.search as string) || undefined;
        const sortField = (req.query.sort_field as string) || undefined;
        const sortDesc =
            typeof req.query.sort_desc === 'string'
                ? req.query.sort_desc === 'true'
                : undefined;

        const paginatedChannels = await paginate(
            Channel,
            page - 1,
            size,
            {
                searchTerm: searchTerm,
                stringFields: ['name', 'description', 'ref_name', 'api_key']
            },
            {
                field: sortField,
                desc: sortDesc
            }
        );

        res.json(paginatedChannels);
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

        if (!req.isGlobalScope && !authorizedUserHasAccessToChannel) {
            throw new AppError(
                'You can only view channels associated to your roles',
                403
            );
        }

        res.json(channel);
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

        if (!req.isGlobalScope && !authorizedUserHasAccessToChannel) {
            throw new AppError(
                "You can only update channels you're associated to",
                403
            );
        }

        await channel?.update(req.body);

        res.json(channel);
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
