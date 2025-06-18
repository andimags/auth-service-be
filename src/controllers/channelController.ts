import { NextFunction, Request, Response } from 'express';
import Channel from '../database/models/Channel';
import generateApiKey from 'generate-api-key';
import { IRequestWithUserAndChannel } from '../types';
import { AppError } from '../middlewares/errorHandler';
import { getUserChannels, hasAccessToChannel } from '../services/channelService';

const getAll = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const customReq = req as IRequestWithUserAndChannel
        let channels = null;

        if(customReq.isGlobalRole){
            channels =  await Channel.findAll();
        }
        else{
            channels = await getUserChannels(customReq.user.id);
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
        const customReq = req as IRequestWithUserAndChannel
        const channel = await Channel.findByPk(req.params.id);

        if (!channel) {
            res.status(404).json({
                status: 0,
                message: 'Channel not found.'
            });

            return;
        }

        const _hasAccessToChannel = await hasAccessToChannel(customReq.user.id, channel.id);

        if(!customReq.isGlobalRole && !_hasAccessToChannel){
            throw new AppError('You can only view channels associated to your roles.', 403);
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
        const customReq = req as IRequestWithUserAndChannel;

        req.body.api_key = generateApiKey();

        if(!customReq.isGlobalRole){
            throw new AppError('Only authorized users with global scope roles is permitted to add new channel.', 403);
        }

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

            return;
        }

        const customReq = req as IRequestWithUserAndChannel;
        const _hasAccessToChannel = await hasAccessToChannel(customReq.user.id, channel.id);

        if(!customReq.isGlobalRole && !_hasAccessToChannel){
            throw new AppError("You can only update channels you're associated to.", 403);
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

        const customReq = req as IRequestWithUserAndChannel;

        if(!customReq.isGlobalRole){
            throw new AppError("Only authorized users with global role can delete a channel.", 403);
        }

        await channel?.destroy({ force: shouldForce });

        res.json({
            status: 1,
            message: shouldForce
                ? 'Channel successfully deleted permanently.'
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
