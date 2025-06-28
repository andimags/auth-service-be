import request from 'supertest';
import app from '../src/app';
import Channel from '../src/database/models/Channel';
import Role from '../src/database/models/Role';
import User from '../src/database/models/User';
import sequelize from '../src/database/sequelize';
import { AppError } from '../src/middlewares/errorHandler';
import {
    cleanupUserRoles,
    createAuthHeaders,
    createRole,
    generateChannelData,
    generateToken,
    generateUserData
} from './utils';

describe('Channel Routes', () => {
    let superadminUser: User;
    let superadminToken: string;

    const NON_EXISTENT_CHANNEL_ID = 999999;
    const DEFAULT_PASSWORD = 'abcd1234';
    const API_BASE_URL = '/api/channels';

    beforeAll(async () => {
        await sequelize.sync();

        superadminUser = await User.create(await generateUserData());
        const superadminRole = await Role.findOne({ where: { ref_name: 'superadmin' } });

        if (!superadminRole) {
            throw new AppError('Superadmin role not found');
        }

        await superadminUser.addRoles([superadminRole]);
        superadminToken = await generateToken(superadminUser.email, DEFAULT_PASSWORD);
    });

    afterAll(async () => {
        await superadminUser?.destroy({ force: true });
        await sequelize.close();
    });

    describe('GET /api/channels', () => {
        let userWithNoPermissions: User;
        let userWithNoPermissionsToken: string;

        beforeAll(async () => {
            userWithNoPermissions = await User.create(await generateUserData());
            userWithNoPermissionsToken = await generateToken(
                userWithNoPermissions.email,
                DEFAULT_PASSWORD
            );
        });

        afterAll(async () => {
            await userWithNoPermissions?.destroy({ force: true });
        });

        it('should return 200 with channels data for authorized user', async () => {
            const response = await request(app)
                .get(API_BASE_URL)
                .set(createAuthHeaders(superadminToken))
                .expect('Content-Type', /json/)
                .expect(200);

            expect(response.body).toMatchObject({
                data: expect.any(Array),
                status: 1
            });
        });

        it('should return 403 when user lacks required permissions', async () => {
            const response = await request(app)
                .get(API_BASE_URL)
                .set(createAuthHeaders(userWithNoPermissionsToken))
                .expect('Content-Type', /json/)
                .expect(403);

            expect(response.body).toEqual({
                message: 'You do not have the required permissions to perform this action'
            });
        });
    });

    describe('GET /api/channels/:channel_id', () => {
        let authorizedUser: User;
        let token: string;
        let targetChannel: Channel;

        beforeAll(async () => {
            authorizedUser = await User.create(await generateUserData());
            token = await generateToken(authorizedUser.email, DEFAULT_PASSWORD);
            targetChannel = await Channel.create(await generateChannelData());
        });

        afterEach(async () => {
            await cleanupUserRoles(authorizedUser);
        });

        afterAll(async () => {
            await authorizedUser?.destroy({ force: true });
            await targetChannel?.destroy({ force: true });
        });

        it('should return 200 with channel data for superadmin', async () => {
            const response = await request(app)
                .get(`${API_BASE_URL}/${targetChannel.id}`)
                .set(createAuthHeaders(superadminToken))
                .expect('Content-Type', /json/)
                .expect(200);

            expect(response.body).toMatchObject({
                data: expect.objectContaining({
                    id: targetChannel.id
                }),
                status: 1
            });
        });

        it('should return 404 when channel does not exist', async () => {
            await request(app)
                .get(`${API_BASE_URL}/${NON_EXISTENT_CHANNEL_ID}`)
                .set(createAuthHeaders(superadminToken))
                .expect('Content-Type', /json/)
                .expect(404)
                .expect({
                    message: 'Channel not found'
                });
        });

        it('should return 403 when user lacks required permissions', async () => {
            await request(app)
                .get(`${API_BASE_URL}/${targetChannel.id}`)
                .set(createAuthHeaders(token))
                .expect('Content-Type', /json/)
                .expect(403)
                .expect({
                    message: 'You do not have the required permissions to perform this action'
                });
        });

        it('should return 403 when user has channel permissions but for wrong channel', async () => {
            const wrongChannel = await Channel.create(await generateChannelData());
            const role = await createRole(['admin:channel'], wrongChannel.id);

            await authorizedUser.setRoles(role);

            await request(app)
                .get(`${API_BASE_URL}/${targetChannel.id}`)
                .set(createAuthHeaders(token, wrongChannel.api_key))
                .expect('Content-Type', /json/)
                .expect(403)
                .expect({
                    message: 'You can only view channels associated to your roles'
                });

            await wrongChannel.destroy({ force: true });
        });
    });

    describe('POST /api/channels', () => {
        let authorizedUser: User;
        let token: string;
        let createdChannel: Channel | null = null;

        beforeAll(async () => {
            authorizedUser = await User.create(await generateUserData());
            token = await generateToken(authorizedUser.email, DEFAULT_PASSWORD);
        });

        afterEach(async () => {
            await cleanupUserRoles(authorizedUser);
            if (createdChannel) {
                await createdChannel.destroy({ force: true });
                createdChannel = null;
            }
        });

        afterAll(async () => {
            await authorizedUser?.destroy({ force: true });
        });

        it('should create channel and return 200 for authorized user', async () => {
            const channelData = await generateChannelData();

            const response = await request(app)
                .post(API_BASE_URL)
                .set(createAuthHeaders(superadminToken))
                .send(channelData)
                .expect('Content-Type', /json/)
                .expect(200);

            expect(response.body).toMatchObject({
                data: expect.objectContaining({
                    name: channelData.name,
                    ref_name: channelData.ref_name,
                    description: channelData.description
                }),
                status: 1
            });

            createdChannel = await Channel.findByPk(response.body.data.id);
        });

        it('should return 403 when user lacks required permissions', async () => {
            await request(app)
                .post(API_BASE_URL)
                .set(createAuthHeaders(token))
                .send(await generateChannelData())
                .expect('Content-Type', /json/)
                .expect(403)
                .expect({
                    message: 'You do not have the required permissions to perform this action'
                });
        });
    });

    describe('PUT /api/channels/:channel_id', () => {
        let authorizedUser: User;
        let token: string;
        let targetChannel: Channel;

        beforeAll(async () => {
            authorizedUser = await User.create(await generateUserData());
            token = await generateToken(authorizedUser.email, DEFAULT_PASSWORD);
            targetChannel = await Channel.create(await generateChannelData());
        });

        afterEach(async () => {
            await cleanupUserRoles(authorizedUser);
        });

        afterAll(async () => {
            await authorizedUser?.destroy({ force: true });
            await targetChannel?.destroy({ force: true });
        });

        it('should update channel and return 200 for authorized user', async () => {
            const updateData = await generateChannelData();

            const response = await request(app)
                .put(`${API_BASE_URL}/${targetChannel.id}`)
                .set(createAuthHeaders(superadminToken))
                .send(updateData)
                .expect('Content-Type', /json/)
                .expect(200);

            expect(response.body).toMatchObject({
                data: expect.objectContaining({
                    name: updateData.name,
                    ref_name: updateData.ref_name,
                    description: updateData.description
                }),
                status: 1
            });
        });

        it('should return 404 when channel does not exist', async () => {
            await request(app)
                .put(`${API_BASE_URL}/${NON_EXISTENT_CHANNEL_ID}`)
                .set(createAuthHeaders(superadminToken))
                .send(await generateChannelData())
                .expect('Content-Type', /json/)
                .expect(404)
                .expect({
                    message: 'Channel not found'
                });
        });

        it('should return 403 when user lacks required permissions', async () => {
            await request(app)
                .put(`${API_BASE_URL}/${targetChannel.id}`)
                .set(createAuthHeaders(token))
                .send(await generateChannelData())
                .expect('Content-Type', /json/)
                .expect(403)
                .expect({
                    message: 'You do not have the required permissions to perform this action'
                });
        });

        it('should return 403 when user has permissions but for wrong channel', async () => {
            const unrelatedChannel = await Channel.create(await generateChannelData());
            const role = await createRole(['admin:channel'], unrelatedChannel.id);

            await authorizedUser.setRoles(role);

            await request(app)
                .put(`${API_BASE_URL}/${targetChannel.id}`)
                .set(createAuthHeaders(token, unrelatedChannel.api_key))
                .send(await generateChannelData())
                .expect('Content-Type', /json/)
                .expect(403)
                .expect({
                    message: "You can only update channels you're associated to"
                });

            await unrelatedChannel.destroy({ force: true });
        });
    });

    describe('DELETE /api/channels/:channel_id', () => {
        let authorizedUser: User;
        let token: string;
        let targetChannel: Channel;

        beforeAll(async () => {
            authorizedUser = await User.create(await generateUserData());
            token = await generateToken(authorizedUser.email, DEFAULT_PASSWORD);
            targetChannel = await Channel.create(await generateChannelData());
        });

        afterEach(async () => {
            await cleanupUserRoles(authorizedUser);

            // Restore channel if soft-deleted
            const deletedChannel = await Channel.findByPk(targetChannel.id, { paranoid: false });
            if (deletedChannel?.deletedAt) {
                await deletedChannel.restore();
            }
        });

        afterAll(async () => {
            await authorizedUser?.destroy({ force: true });
            await targetChannel?.destroy({ force: true });
        });

        it('should soft delete channel and return 200', async () => {
            await request(app)
                .delete(`${API_BASE_URL}/${targetChannel.id}`)
                .set(createAuthHeaders(superadminToken))
                .expect('Content-Type', /json/)
                .expect(200)
                .expect({
                    status: 1,
                    message: 'Channel successfully soft-deleted'
                });
        });

        it('should return 404 when channel does not exist', async () => {
            await request(app)
                .delete(`${API_BASE_URL}/${NON_EXISTENT_CHANNEL_ID}`)
                .set(createAuthHeaders(superadminToken))
                .expect('Content-Type', /json/)
                .expect(404)
                .expect({
                    message: 'Channel not found'
                });
        });

        it('should return 403 when user lacks required permissions', async () => {
            await request(app)
                .delete(`${API_BASE_URL}/${targetChannel.id}`)
                .set(createAuthHeaders(token))
                .expect('Content-Type', /json/)
                .expect(403)
                .expect({
                    message: 'You do not have the required permissions to perform this action'
                });
        });

        it('should force delete channel when force=true', async () => {
            const channelToDelete = await Channel.create(await generateChannelData());

            await request(app)
                .delete(`${API_BASE_URL}/${channelToDelete.id}?force=true`)
                .set(createAuthHeaders(superadminToken))
                .expect('Content-Type', /json/)
                .expect(200)
                .expect({
                    status: 1,
                    message: 'Channel successfully deleted permanently'
                });
        });
    });
});
