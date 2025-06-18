import { Op } from 'sequelize';
import User from '../database/models/User';
import { AppError } from '../middlewares/errorHandler';
import Channel from '../database/models/Channel';

/**
 *
 * @param userId
 * @param channelId
 *
 * Returns true if user has roles associated to this specific channel
 */
export async function hasAccessToChannel(userId: number, channelId: number) {
    const user = await User.findByPk(userId);
    if (!user) throw new AppError('User not found.', 404);

    const roles = await user?.getRoles({ where: { channel_id: channelId } });

    return roles.length > 0;
}

/**
 *
 * @param userId
 *
 * Get channels associated to the target user's roles.
 */
export async function getUserChannels(userId: number) {
    const user = await User.findByPk(userId);

    if (!user) throw new AppError('User not found.', 404);

    const roles = await user.getRoles({ where: { channel_id: { [Op.ne]: null } } });
    const channelIds = roles.map((role) => {
        return role.channel_id;
    });

    return await Channel.findAll({ where: { id: { [Op.in]: channelIds } } });
}
