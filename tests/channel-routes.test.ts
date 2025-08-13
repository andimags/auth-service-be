import Channel from '../src/database/models/Channel';
import Role from '../src/database/models/Role';
import sequelize from '../src/database/sequelize';
import { AppError } from '../src/middlewares/errorHandler';
import { IAuth } from './types';
import {
    createAuthHeaders,
    createAuthUser,
    createRole,
    forceDeleteInstances,
    generateChannelData
} from './utils';

describe('Channel Routes', () => {
    let superadminAuth: IAuth = {
        accessToken: null,
        user: null,
        agent: null
    };

    let userWithNoPermissionsAuth: IAuth = {
        accessToken: null,
        user: null,
        agent: null
    };

    const NON_EXISTENT_CHANNEL_ID = 999999;
    const API_BASE_URL = '/api/channels';

    const SUPERADMIN_AGENT = null; // preserves cookies
    const USER_WITH_NO_PERMISSIONS_AGENT = null; // preserves cookies

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
        it('should return 200 with channels data for authorized user', async () => {
            console.log('superadminAuth', superadminAuth);
            const response = await superadminAuth
                .agent!.get(API_BASE_URL)
                .set(createAuthHeaders(superadminAuth.accessToken!))
                .expect('Content-Type', /json/)
                .expect(200);

            expect(response.body).toMatchObject({
                status: expect.any(Number),
                count: expect.any(Number),
                rows: expect.any(Array),
                totalPages: expect.any(Number),
                currentPage: expect.any(Number)
            });

            expect(response.body.rows).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        id: expect.any(Number),
                        name: expect.any(String),
                        description: null,
                        ref_name: expect.any(String),
                        api_key: expect.any(String),
                        created_at: expect.any(String),
                        updated_at: expect.any(String),
                        deleted_at: null
                    })
                ])
            );
        });

        it('should return 403 when user lacks required permissions', async () => {
            const response = await userWithNoPermissionsAuth
                .agent!.get(API_BASE_URL)
                .set(createAuthHeaders(userWithNoPermissionsAuth.accessToken!))
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

            const response = await superadminAuth
                .agent!.get(`${API_BASE_URL}/${targetChannel.id}`)
                .set(createAuthHeaders(superadminAuth.accessToken!))
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
            await superadminAuth
                .agent!.get(`${API_BASE_URL}/${NON_EXISTENT_CHANNEL_ID}`)
                .set(createAuthHeaders(superadminAuth.accessToken!))
                .expect('Content-Type', /json/)
                .expect(404)
                .expect({
                    message: 'Channel not found'
                });
        });

        it('should return 403 when user lacks required permissions', async () => {
            const targetChannel = await Channel.create(generateChannelData());

            await userWithNoPermissionsAuth.agent
                .get(`${API_BASE_URL}/${targetChannel.id}`)
                .set(createAuthHeaders(userWithNoPermissionsAuth.accessToken!))
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
            const wrongChannel = await Channel.create(
                await generateChannelData()
            );
            const customAuthUser: IAuth = await createAuthUser(
                wrongChannel.api_key
            );
            const customAuthUserRole = await createRole(
                ['admin:channel'],
                wrongChannel.id
            );
            await customAuthUser.user!.setRoles(customAuthUserRole);

            await customAuthUser
                .agent!.get(`${API_BASE_URL}/${targetChannel.id}`)
                .set(createAuthHeaders(customAuthUser.accessToken!))
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

            const response = await superadminAuth
                .agent!.post(API_BASE_URL)
                .set(createAuthHeaders(superadminAuth.accessToken!))
                .send(payload)
                .expect('Content-Type', /json/)
                .expect(200);

            expect(response.body).toMatchObject({
                status: 1,
                data: {
                    id: expect.any(Number),
                    name: payload.name,
                    description: payload.description,
                    ref_name: payload.ref_name,
                    updated_at: expect.any(String),
                    created_at: expect.any(String),
                    api_key: expect.any(String),
                    deleted_at: null
                }
            });

            const createdChannel = await Channel.findByPk(
                response.body.data.id
            );
            await forceDeleteInstances([createdChannel!]);
        });

        it('should return 403 when user lacks required permissions', async () => {
            await userWithNoPermissionsAuth
                .agent!.post(API_BASE_URL)
                .set(createAuthHeaders(userWithNoPermissionsAuth.accessToken!))
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

            const response = await superadminAuth
                .agent!.put(`${API_BASE_URL}/${targetChannel.id}`)
                .set(createAuthHeaders(superadminAuth.accessToken!))
                .send(payload)
                .expect('Content-Type', /json/)
                .expect(200);

            expect(response.body).toMatchObject({
                status: 1,
                data: {
                    id: expect.any(Number),
                    name: payload.name,
                    description: payload.description,
                    ref_name: payload.ref_name,
                    updated_at: expect.any(String),
                    created_at: expect.any(String),
                    api_key: expect.any(String),
                    deleted_at: null
                }
            });

            await forceDeleteInstances([targetChannel]);
        });

        it('should return 404 when channel does not exist', async () => {
            await superadminAuth
                .agent!.put(`${API_BASE_URL}/${NON_EXISTENT_CHANNEL_ID}`)
                .set(createAuthHeaders(superadminAuth.accessToken!))
                .send(await generateChannelData())
                .expect('Content-Type', /json/)
                .expect(404)
                .expect({
                    message: 'Channel not found'
                });
        });

        it('should return 403 when user lacks required permissions', async () => {
            const targetChannel = await Channel.create(generateChannelData());

            await userWithNoPermissionsAuth
                .agent!.put(`${API_BASE_URL}/${targetChannel.id}`)
                .set(createAuthHeaders(userWithNoPermissionsAuth.accessToken!))
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

            // Auth user will have the correct permissions but in wrong channel
            const wrongChannel = await Channel.create(
                await generateChannelData()
            );
            const customAuthUser: IAuth = await createAuthUser(
                wrongChannel.api_key!
            );
            const customAuthUserRole = await createRole(
                ['admin:channel'],
                wrongChannel.id
            );

            await customAuthUser.user!.setRoles(customAuthUserRole);

            await customAuthUser
                .agent!.put(`${API_BASE_URL}/${targetChannel.id}`)
                .set(createAuthHeaders(customAuthUser.accessToken!))
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

            await superadminAuth
                .agent!.delete(`${API_BASE_URL}/${targetChannel.id}`)
                .set(createAuthHeaders(superadminAuth.accessToken!))
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

            await superadminAuth
                .agent!.delete(`${API_BASE_URL}/${targetChannel.id}?force=true`)
                .set(createAuthHeaders(superadminAuth.accessToken!))
                .expect('Content-Type', /json/)
                .expect(200)
                .expect({
                    status: 1,
                    message: 'Channel successfully deleted permanently'
                });
        });

        it('should return 404 when channel does not exist', async () => {
            await superadminAuth
                .agent!.delete(`${API_BASE_URL}/${NON_EXISTENT_CHANNEL_ID}`)
                .set(createAuthHeaders(superadminAuth.accessToken!))
                .expect('Content-Type', /json/)
                .expect(404)
                .expect({
                    message: 'Channel not found'
                });
        });

        it('should return 403 when user lacks required permissions', async () => {
            const targetChannel = await Channel.create(generateChannelData());

            await userWithNoPermissionsAuth
                .agent!.delete(`${API_BASE_URL}/${targetChannel.id}`)
                .set(createAuthHeaders(userWithNoPermissionsAuth.accessToken!))
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
