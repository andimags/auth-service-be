import request from 'supertest';
import app from '../src/app';
import Channel from '../src/database/models/Channel';
import Role from '../src/database/models/Role';
import User from '../src/database/models/User';
import sequelize from '../src/database/sequelize';
import { AppError } from '../src/middlewares/errorHandler';
import { IAuth } from './types';
import {
    createAuthHeaders,
    createAuthUser,
    createRole,
    forceDeleteInstances,
    generateChannelData,
    generateRoleData,
    generateToken,
    generateUserData
} from './utils';

describe('Role Routes', () => {
    let superadminAuth: IAuth = {
        accessToken: null,
        user: null
    };

    let userWithNoPermissionsAuth: IAuth = {
        accessToken: null,
        user: null
    };

    const NON_EXISTENT_ROLE_ID = 999999;
    const DEFAULT_PASSWORD = 'abcd1234';
    const API_BASE_URL = '/api/roles';

    beforeAll(async () => {
        await sequelize.sync();

        superadminAuth.user = await User.create(await generateUserData());
        const superadminRole = await Role.findOne({
            where: { ref_name: 'superadmin' }
        });

        if (!superadminRole) {
            throw new AppError('Superadmin role not found');
        }

        await superadminAuth.user.addRoles([superadminRole]);
        superadminAuth.accessToken = await generateToken(
            superadminAuth.user.email,
            DEFAULT_PASSWORD
        );

        userWithNoPermissionsAuth.user = await User.create(
            await generateUserData()
        );
        userWithNoPermissionsAuth.accessToken = await generateToken(
            userWithNoPermissionsAuth.user.email,
            DEFAULT_PASSWORD
        );
    });

    afterAll(async () => {
        await superadminAuth.user?.destroy({ force: true });
        await userWithNoPermissionsAuth.user?.destroy({ force: true });
        await sequelize.close();
    });

    describe('GET /api/roles', () => {
        it('should return 200 with roles data for authorized user', async () => {
            const response = await request(app)
                .get(API_BASE_URL)
                .set(createAuthHeaders(superadminAuth.accessToken!))
                .expect('Content-Type', /json/)
                .expect(200);

            expect(response.body).toMatchObject({
                data: expect.any(Array),
                status: 1
            });
        });

        it('should return 200 with roles data for a channel-based authorized user, but must only return roles related to their channel', async () => {
            // Auth user must have lower level of role than the target user
            const customAuthUser: IAuth = await createAuthUser();
            const channel = await Channel.create(generateChannelData());
            const customAuthUserRole = await createRole(
                ['admin:role', 'view:role'],
                channel.id,
                5
            );
            await customAuthUser.user?.setRoles(customAuthUserRole);

            const response = await request(app)
                .get(API_BASE_URL)
                .set(
                    createAuthHeaders(
                        customAuthUser.accessToken!,
                        channel.api_key
                    )
                )
                .expect('Content-Type', /json/)
                .expect(200);

            expect(response.body.status).toEqual(1);

            response.body.data.forEach((item: any) => {
                expect(item.channel_id).toBe(channel!.id);
            });

            forceDeleteInstances([
                customAuthUser.user!,
                channel,
                customAuthUserRole
            ]);
        });

        it('should return 403 when user lacks required permissions', async () => {
            const response = await request(app)
                .get(API_BASE_URL)
                .set(createAuthHeaders(userWithNoPermissionsAuth.accessToken!))
                .expect('Content-Type', /json/)
                .expect(403);

            expect(response.body).toEqual({
                message:
                    'You do not have the required permissions to perform this action'
            });
        });
    });

    describe('GET /api/roles/:role_id', () => {
        it('should return 200 with role data for authorized user', async () => {
            const targetRole = await Role.create(generateRoleData());

            const response = await request(app)
                .get(`${API_BASE_URL}/${targetRole.id}`)
                .set(createAuthHeaders(superadminAuth.accessToken!))
                .expect('Content-Type', /json/)
                .expect(200);

            expect(response.body).toMatchObject({
                status: 1,
                data: expect.any(Object)
            });

            forceDeleteInstances([targetRole]);
        });

        it('should return 404 with non-existent permission ID', async () => {
            const response = await request(app)
                .get(`${API_BASE_URL}/${NON_EXISTENT_ROLE_ID}`)
                .set(createAuthHeaders(superadminAuth.accessToken!))
                .expect('Content-Type', /json/)
                .expect(404);

            expect(response.body).toMatchObject({
                message: 'Role not found'
            });
        });

        it('should return 403 when user lacks required permissions', async () => {
            const targetRole = await Role.create(generateRoleData());

            const response = await request(app)
                .get(`${API_BASE_URL}/${targetRole.id}`)
                .set(createAuthHeaders(userWithNoPermissionsAuth.accessToken!))
                .expect('Content-Type', /json/)
                .expect(403);

            expect(response.body).toMatchObject({
                message:
                    'You do not have the required permissions to perform this action'
            });

            forceDeleteInstances([targetRole]);
        });
    });

    describe('POST /api/roles', () => {
        it('should return 200 with permissions data for authorized user', async () => {
            const payload = generateRoleData();

            const response = await request(app)
                .post(`${API_BASE_URL}`)
                .set(createAuthHeaders(superadminAuth.accessToken!))
                .send(payload)
                .expect('Content-Type', /json/)
                .expect(200);

            expect(response.body).toMatchObject({
                status: 1,
                data: {
                    id: expect.any(Number),
                    name: payload.name,
                    ref_name: payload.ref_name,
                    level: payload.level,
                    channel_id: null,
                    scope: payload.scope,
                    updated_at: expect.any(String),
                    created_at: expect.any(String),
                    description: null,
                    deleted_at: null
                }
            });

            await Role.destroy({
                where: { id: response.body.data.id },
                force: true
            });
        });

        it('should return 403 when authorized user does not have required permissions', async () => {
            const payload = generateRoleData();

            const response = await request(app)
                .post(`${API_BASE_URL}`)
                .set(createAuthHeaders(userWithNoPermissionsAuth.accessToken!))
                .send(payload)
                .expect('Content-Type', /json/)
                .expect(403);

            expect(response.body).toEqual({
                message:
                    'You do not have the required permissions to perform this action'
            });
        });

        it(`should return 403 when authorized user's required permissions are attached to a wrong channel`, async () => {
            const payload = generateRoleData();
            const customAuthUser: IAuth = await createAuthUser();
            const wrongChannel = await Channel.create(
                await generateChannelData()
            );
            const correctChannel = await Channel.create(
                await generateChannelData()
            );
            const customAuthUserRole = await createRole(
                ['admin:role', 'add:role'],
                correctChannel.id
            );

            await customAuthUser.user?.setRoles(customAuthUserRole);

            // Mocking authorized user creating a role not within their channel
            payload.channel_id = wrongChannel.id;

            const response = await request(app)
                .post(`${API_BASE_URL}`)
                .set(
                    createAuthHeaders(
                        customAuthUser.accessToken!,
                        correctChannel.api_key
                    )
                )
                .send(payload)
                .expect('Content-Type', /json/)
                .expect(403);

            expect(response.body).toEqual({
                message: 'You can only add roles within your channel'
            });

            await forceDeleteInstances([
                customAuthUser.user!,
                wrongChannel,
                correctChannel,
                customAuthUserRole
            ]);
        });

        it(`should return 403 when authorized user is adding role equal or higher than his role level`, async () => {
            const payload = generateRoleData(undefined, 1); // Generate role data with highest role level possible
            const customAuthUser: IAuth = await createAuthUser();
            // Making role with the lowest possible role-level
            const customAuthRole = await createRole(
                ['admin:role', 'add:role'],
                undefined,
                5
            );
            await customAuthUser.user?.setRoles(customAuthRole);

            const response = await request(app)
                .post(`${API_BASE_URL}`)
                .set(createAuthHeaders(customAuthUser.accessToken!))
                .send(payload)
                .expect('Content-Type', /json/)
                .expect(403);

            expect(response.body).toEqual({
                message: 'You can only add roles with a lower level than yours'
            });

            await forceDeleteInstances([customAuthUser.user!, customAuthRole]);
        });
    });

    describe('PUT /api/roles/:role_id', () => {
        it('should return 200 with role data for authorized user', async () => {
            const targetRole = await Role.create(generateRoleData());
            const payload = generateRoleData();

            const response = await request(app)
                .put(`${API_BASE_URL}/${targetRole!.id}`)
                .set(createAuthHeaders(superadminAuth.accessToken!))
                .send(payload)
                .expect('Content-Type', /json/)
                .expect(200);

            expect(response.body).toMatchObject({
                status: 1,
                data: {
                    id: expect.any(Number),
                    name: payload.name,
                    description: null,
                    ref_name: payload.ref_name,
                    level: payload.level,
                    channel_id: null,
                    scope: payload.scope,
                    created_at: expect.any(String),
                    updated_at: expect.any(String),
                    deleted_at: null
                }
            });

            await forceDeleteInstances([targetRole]);
        });

        it('should return 403 when authorized user does not have required permissions', async () => {
            const targetRole = await Role.create(generateRoleData());
            const payload = generateRoleData();

            const response = await request(app)
                .put(`${API_BASE_URL}/${targetRole!.id}`)
                .set(createAuthHeaders(userWithNoPermissionsAuth.accessToken!))
                .send(payload)
                .expect('Content-Type', /json/)
                .expect(403);

            expect(response.body).toEqual({
                message:
                    'You do not have the required permissions to perform this action'
            });

            await forceDeleteInstances([targetRole]);
        });

        it('should return 404 when the target permission does not exist', async () => {
            const payload = generateRoleData();

            const response = await request(app)
                .put(`${API_BASE_URL}/${NON_EXISTENT_ROLE_ID}`)
                .set(createAuthHeaders(superadminAuth.accessToken!))
                .send(payload)
                .expect('Content-Type', /json/);
            // .expect(404);

            expect(response.body).toEqual({
                message: 'Role not found'
            });
        });

        it(`should return 403 when authorized user's required permissions are attached to a wrong channel`, async () => {
            const payload = generateRoleData();
            const targetRole = await Role.create(generateRoleData());
            const customAuthUser: IAuth = await createAuthUser();
            const wrongChannel = await Channel.create(
                await generateChannelData()
            );
            const correctChannel = await Channel.create(
                await generateChannelData()
            );
            const customAuthUserRole = await createRole(
                ['admin:role', 'add:role'],
                correctChannel.id
            );

            // Mocking authorized user update a role not within their channel
            payload.channel_id = wrongChannel.id;

            await customAuthUser.user?.setRoles(customAuthUserRole);

            const response = await request(app)
                .put(`${API_BASE_URL}/${targetRole!.id}`)
                .set(
                    createAuthHeaders(
                        customAuthUser.accessToken!,
                        correctChannel.api_key
                    )
                )
                .send(payload)
                .expect('Content-Type', /json/)
                .expect(403);

            expect(response.body).toEqual({
                message: 'You can only update roles within your channel'
            });

            forceDeleteInstances([
                targetRole,
                customAuthUser.user!,
                wrongChannel,
                correctChannel,
                customAuthUserRole
            ]);
        });

        it(`should return 403 when authorized user's role level is lower than the target role level`, async () => {
            const payload = generateRoleData();

            // Target role must be higher than the auth user's role
            const targetRole = await createRole(
                ['admin:role', 'add:role'],
                undefined,
                3
            );

            // Low level role to be attach to the custom auth user (level value defaults to 5)
            const customAuthUser: IAuth = await createAuthUser();
            const customAuthUserRole = await createRole([
                'admin:role',
                'add:role'
            ]);
            await customAuthUser.user?.setRoles(customAuthUserRole);

            const response = await request(app)
                .put(`${API_BASE_URL}/${targetRole.id}`)
                .set(createAuthHeaders(customAuthUser.accessToken!))
                .send(payload)
                .expect('Content-Type', /json/)
                .expect(403);

            expect(response.body).toEqual({
                message: `You can't update role level field with a higher level than yours`
            });

            await forceDeleteInstances([
                targetRole,
                customAuthUser.user!,
                customAuthUserRole
            ]);
        });

        it(`should return 403 when the payload level property is higher than the authorized user's role level`, async () => {
            // Make the payload level property to the highest value possible
            const payload = generateRoleData();
            payload.level = 1;

            // Create low level target role, making sure that the auth user has the ability to update this
            const targetRole = await Role.create(
                await generateRoleData(undefined, 5)
            );

            // Low level role to be attach to the custom auth user, set role level to 4 so it's still able to update the targetRole
            const customAuthUser: IAuth = await createAuthUser();
            const customAuthUserRole = await createRole(
                ['admin:role', 'add:role'],
                undefined,
                4
            );
            await customAuthUser.user?.setRoles(customAuthUserRole);

            const response = await request(app)
                .put(`${API_BASE_URL}/${targetRole.id}`)
                .set(createAuthHeaders(customAuthUser.accessToken!))
                .send(payload)
                .expect('Content-Type', /json/)
                .expect(403);

            expect(response.body).toEqual({
                message: `New value for role level field must be lower level than yours`
            });

            await forceDeleteInstances([
                customAuthUser.user!,
                targetRole,
                customAuthUserRole
            ]);
        });
    });

    describe('DELETE /api/role/:role_id', () => {
        it('should return 200 with permissions data for authorized user', async () => {
            const targetRole = await Role.create(await generateRoleData());

            const response = await request(app)
                .delete(`${API_BASE_URL}/${targetRole!.id}`)
                .set(createAuthHeaders(superadminAuth.accessToken!))
                .expect('Content-Type', /json/)
                .expect(200);

            expect(response.body).toMatchObject({
                status: 1,
                message: 'Role successfully soft-deleted'
            });

            await forceDeleteInstances([targetRole]);
        });

        it('should return 404 non existent role ID', async () => {
            const targetRole = await Role.create(await generateRoleData());

            const response = await request(app)
                .delete(`${API_BASE_URL}/${NON_EXISTENT_ROLE_ID}`)
                .set(createAuthHeaders(superadminAuth.accessToken!))
                .expect('Content-Type', /json/)
                .expect(404);

            expect(response.body).toEqual({
                message: 'Role not found'
            });

            await forceDeleteInstances([targetRole]);
        });

        it('should return 403 when authorized user does not have required permissions', async () => {
            const targetRole = await Role.create(await generateRoleData());

            const response = await request(app)
                .delete(`${API_BASE_URL}/${targetRole!.id}`)
                .set(createAuthHeaders(userWithNoPermissionsAuth.accessToken!))
                .expect('Content-Type', /json/)
                .expect(403);

            expect(response.body).toEqual({
                message:
                    'You do not have the required permissions to perform this action'
            });

            await forceDeleteInstances([targetRole]);
        });

        it(`should return 403 when the authorized user's required permissions are tied to a channel-based role that belongs to a different channel`, async () => {
            const wrongChannel = await Channel.create(
                await generateChannelData()
            );
            const correctChannel = await Channel.create(
                await generateChannelData()
            );

            // Target role to delete that is not within the authorized user's roles (uses wrongChannel.id)
            const targetRole = await Role.create(
                await generateRoleData(wrongChannel.id)
            );

            // Auth user's role being in the correct channel
            const customAuthUser: IAuth = await createAuthUser();
            const customAuthUserRole = await createRole(
                ['admin:role', 'add:role'],
                correctChannel.id
            );
            await customAuthUser.user?.setRoles(customAuthUserRole);

            const response = await request(app)
                .delete(`${API_BASE_URL}/${targetRole!.id}`)
                .set(
                    createAuthHeaders(
                        customAuthUser.accessToken!,
                        correctChannel.api_key
                    )
                )
                .expect('Content-Type', /json/)
                .expect(403);

            expect(response.body).toEqual({
                message: 'You can only delete roles within your channel'
            });

            await forceDeleteInstances([
                wrongChannel,
                correctChannel,
                targetRole,
                customAuthUser.user!,
                customAuthUserRole
            ]);
        });

        it(`should return 403 when the authorized user's role level is equal or lower than the target role`, async () => {
            // Target role's level must be higher than the auth user's role level
            const targetRole = await Role.create(
                await generateRoleData(undefined, 3)
            );

            const customAuthUser: IAuth = await createAuthUser();
            const customAuthUserRole = await createRole(
                ['admin:role', 'add:role'],
                undefined,
                5
            );
            await customAuthUser.user?.setRoles(customAuthUserRole);

            const response = await request(app)
                .delete(`${API_BASE_URL}/${targetRole!.id}`)
                .set(createAuthHeaders(customAuthUser.accessToken!))
                .expect('Content-Type', /json/)
                .expect(403);

            expect(response.body).toEqual({
                message:
                    'You can only delete roles with a lower level than yours'
            });

            await forceDeleteInstances([
                targetRole,
                customAuthUser.user!,
                customAuthUserRole
            ]);
        });
    });
});
