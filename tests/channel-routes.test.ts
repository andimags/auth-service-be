import request from 'supertest';
import app from '../src/app';
import Channel from '../src/database/models/Channel';
import Role from '../src/database/models/Role';
import User from '../src/database/models/User';
import sequelize from '../src/database/sequelize';
import { AppError } from '../src/middlewares/errorHandler';
import {
    createAuthHeaders,
    createAuthUser,
    createRole,
    forceDeleteInstances,
    generateChannelData,
    generateToken,
    generateUserData
} from './utils';

describe('Channel Routes', () => {
    interface IAuth {
        token: string | null;
        user: User | null;
    }

    let superadminAuth: IAuth = {
        token: null,
        user: null
    };

    let userWithNoPermissionsAuth: IAuth = {
        token: null,
        user: null
    };

    const NON_EXISTENT_CHANNEL_ID = 999999;
    const DEFAULT_PASSWORD = 'abcd1234';
    const API_BASE_URL = '/api/channels';

    beforeAll(async () => {
        await sequelize.sync();

        superadminAuth = await createAuthUser();
        const superadminRole = await Role.findOne({
            where: { ref_name: 'superadmin' }
        });

        if (!superadminRole) {
            throw new AppError('Superadmin role not found');
        }

        await superadminAuth.user!.addRoles([superadminRole]);
        superadminAuth.token = await generateToken(
            superadminAuth.user!.email,
            DEFAULT_PASSWORD
        );

        userWithNoPermissionsAuth = await createAuthUser();
    });

    afterAll(async () => {
        await forceDeleteInstances([
            superadminAuth.user!,
            userWithNoPermissionsAuth.user!
        ]);
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
                .set(createAuthHeaders(superadminAuth.token!))
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
                message:
                    'You do not have the required permissions to perform this action'
            });
        });
    });

    describe('GET /api/channels/:channel_id', () => {
        it('should return 200 with channel data for superadmin', async () => {
            const targetChannel = await Channel.create(generateChannelData());

            const response = await request(app)
                .get(`${API_BASE_URL}/${targetChannel.id}`)
                .set(createAuthHeaders(superadminAuth.token!))
                .expect('Content-Type', /json/)
                .expect(200);

            expect(response.body).toMatchObject({
                data: expect.objectContaining({
                    id: targetChannel.id
                }),
                status: 1
            });

            await forceDeleteInstances([targetChannel]);
        });

        it('should return 404 when channel does not exist', async () => {
            await request(app)
                .get(`${API_BASE_URL}/${NON_EXISTENT_CHANNEL_ID}`)
                .set(createAuthHeaders(superadminAuth.token!))
                .expect('Content-Type', /json/)
                .expect(404)
                .expect({
                    message: 'Channel not found'
                });
        });

        it('should return 403 when user lacks required permissions', async () => {
            const targetChannel = await Channel.create(generateChannelData());

            await request(app)
                .get(`${API_BASE_URL}/${targetChannel.id}`)
                .set(createAuthHeaders(userWithNoPermissionsAuth.token!))
                .expect('Content-Type', /json/)
                .expect(403)
                .expect({
                    message:
                        'You do not have the required permissions to perform this action'
                });

            await forceDeleteInstances([targetChannel]);
        });

        it('should return 403 when user has channel permissions but logged in a wrong channel', async () => {
            const targetChannel = await Channel.create(generateChannelData());

            // Auth user will have correct permissions but attached to a role with diff channel
            const customAuthUser: IAuth = await createAuthUser();
            const wrongChannel = await Channel.create(
                await generateChannelData()
            );
            const customAuthUserRole = await createRole(
                ['admin:channel'],
                wrongChannel.id
            );
            await customAuthUser.user!.setRoles(customAuthUserRole);

            await request(app)
                .get(`${API_BASE_URL}/${targetChannel.id}`)
                .set(
                    createAuthHeaders(
                        customAuthUser.token!,
                        wrongChannel.api_key
                    )
                )
                .expect('Content-Type', /json/)
                .expect(403)
                .expect({
                    message:
                        'You can only view channels associated to your roles'
                });

            await forceDeleteInstances([
                targetChannel,
                customAuthUser.user!,
                wrongChannel,
                customAuthUserRole
            ]);
        });
    });

    describe('POST /api/channels', () => {
        it('should create channel and return 200 for authorized user', async () => {
            const payload = await generateChannelData();

            const response = await request(app)
                .post(API_BASE_URL)
                .set(createAuthHeaders(superadminAuth.token!))
                .send(payload)
                .expect('Content-Type', /json/)
                .expect(200);

            expect(response.body).toMatchObject({
                data: expect.objectContaining({
                    name: payload.name,
                    ref_name: payload.ref_name,
                    description: payload.description
                }),
                status: 1
            });

            const createdChannel = await Channel.findByPk(
                response.body.data.id
            );
            await forceDeleteInstances([createdChannel!]);
        });

        it('should return 403 when user lacks required permissions', async () => {
            await request(app)
                .post(API_BASE_URL)
                .set(createAuthHeaders(userWithNoPermissionsAuth.token!))
                .send(await generateChannelData())
                .expect('Content-Type', /json/)
                .expect(403)
                .expect({
                    message:
                        'You do not have the required permissions to perform this action'
                });
        });
    });

    describe('PUT /api/channels/:channel_id', () => {
        it('should update channel and return 200 for authorized user', async () => {
            const targetChannel = await Channel.create(generateChannelData());
            const payload = await generateChannelData();

            const response = await request(app)
                .put(`${API_BASE_URL}/${targetChannel.id}`)
                .set(createAuthHeaders(superadminAuth.token!))
                .send(payload)
                .expect('Content-Type', /json/)
                .expect(200);

            expect(response.body).toMatchObject({
                data: expect.objectContaining({
                    name: payload.name,
                    ref_name: payload.ref_name,
                    description: payload.description
                }),
                status: 1
            });

            await forceDeleteInstances([targetChannel]);
        });

        it('should return 404 when channel does not exist', async () => {
            await request(app)
                .put(`${API_BASE_URL}/${NON_EXISTENT_CHANNEL_ID}`)
                .set(createAuthHeaders(superadminAuth.token!))
                .send(await generateChannelData())
                .expect('Content-Type', /json/)
                .expect(404)
                .expect({
                    message: 'Channel not found'
                });
        });

        it('should return 403 when user lacks required permissions', async () => {
            const targetChannel = await Channel.create(generateChannelData());

            await request(app)
                .put(`${API_BASE_URL}/${targetChannel.id}`)
                .set(createAuthHeaders(userWithNoPermissionsAuth.token!))
                .send(await generateChannelData())
                .expect('Content-Type', /json/)
                .expect(403)
                .expect({
                    message:
                        'You do not have the required permissions to perform this action'
                });

            await forceDeleteInstances([targetChannel]);
        });

        it('should return 403 when user has permissions but for wrong channel', async () => {
            const targetChannel = await Channel.create(generateChannelData());

            // Auth usr will have the correct permissions but in wrong channel
            const customAuthUser: IAuth = await createAuthUser();
            const wrongChannel = await Channel.create(
                await generateChannelData()
            );
            const customAuthUserRole = await createRole(
                ['admin:channel'],
                wrongChannel.id
            );

            await customAuthUser.user!.setRoles(customAuthUserRole);

            await request(app)
                .put(`${API_BASE_URL}/${targetChannel.id}`)
                .set(
                    createAuthHeaders(
                        customAuthUser.token!,
                        wrongChannel.api_key
                    )
                )
                .send(await generateChannelData())
                .expect('Content-Type', /json/)
                .expect(403)
                .expect({
                    message: "You can only update channels you're associated to"
                });

            await forceDeleteInstances([
                targetChannel,
                customAuthUser.user!,
                wrongChannel,
                customAuthUserRole
            ]);
        });
    });

    describe('DELETE /api/channels/:channel_id', () => {
        it('should soft delete channel and return 200', async () => {
            const targetChannel = await Channel.create(generateChannelData());

            await request(app)
                .delete(`${API_BASE_URL}/${targetChannel.id}`)
                .set(createAuthHeaders(superadminAuth.token!))
                .expect('Content-Type', /json/)
                .expect(200)
                .expect({
                    status: 1,
                    message: 'Channel successfully soft-deleted'
                });

            await forceDeleteInstances([targetChannel]);
        });

        it('should force delete channel when force=true', async () => {
            const targetChannel = await Channel.create(generateChannelData());

            await request(app)
                .delete(`${API_BASE_URL}/${targetChannel.id}?force=true`)
                .set(createAuthHeaders(superadminAuth.token!))
                .expect('Content-Type', /json/)
                .expect(200)
                .expect({
                    status: 1,
                    message: 'Channel successfully deleted permanently'
                });
        });

        it('should return 404 when channel does not exist', async () => {
            await request(app)
                .delete(`${API_BASE_URL}/${NON_EXISTENT_CHANNEL_ID}`)
                .set(createAuthHeaders(superadminAuth.token!))
                .expect('Content-Type', /json/)
                .expect(404)
                .expect({
                    message: 'Channel not found'
                });
        });

        it('should return 403 when user lacks required permissions', async () => {
            const targetChannel = await Channel.create(generateChannelData());

            await request(app)
                .delete(`${API_BASE_URL}/${targetChannel.id}`)
                .set(createAuthHeaders(userWithNoPermissionsAuth.token!))
                .expect('Content-Type', /json/)
                .expect(403)
                .expect({
                    message:
                        'You do not have the required permissions to perform this action'
                });

            await forceDeleteInstances([targetChannel]);
        });
    });
});
