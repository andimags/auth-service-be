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
    generateRoleData,
    generateToken,
    generateUserData
} from './utils';

describe('Role Routes', () => {
    interface IAuth {
        token: string | null,
        user: User | null
    }

    let superadminAuth: IAuth = {
        token: null,
        user: null
    };

    let userWithNoPermissionsAuth: IAuth = {
        token: null,
        user: null
    };

    const NON_EXISTENT_ROLE_ID = 999999;
    const DEFAULT_PASSWORD = 'abcd1234';
    const API_BASE_URL = '/api/roles';

    beforeAll(async () => {
        await sequelize.sync();

        superadminAuth.user = await User.create(await generateUserData());
        const superadminRole = await Role.findOne({ where: { ref_name: 'superadmin' } });

        if (!superadminRole) {
            throw new AppError('Superadmin role not found');
        }

        await superadminAuth.user.addRoles([superadminRole]);
        superadminAuth.token = await generateToken(superadminAuth.user.email, DEFAULT_PASSWORD);

        userWithNoPermissionsAuth.user = await User.create(await generateUserData());
        userWithNoPermissionsAuth.token = await generateToken(
            userWithNoPermissionsAuth.user.email,
            DEFAULT_PASSWORD
        );
    });

    afterAll(async () => {
        await superadminAuth.user?.destroy({ force: true });
        await sequelize.close();
    });

    describe('GET /api/roles', () => {
        // Test an authorized user with different roles or permissions for every it function (assign them inside it function)
        // All roles and permissions for this authorized user will be force deleted for every it function
        let customAuth: IAuth = {
            token: null,
            user: null
        };

        let channel: Channel | null;

        beforeAll(async() => {
            customAuth.user = await User.create(await generateUserData());
            customAuth.token = await generateToken(customAuth.user.email, DEFAULT_PASSWORD);
        })

        afterEach(async () => {
            await cleanupUserRoles(customAuth.user!);
        })

        afterAll(async () => {
            await channel?.destroy({ force: true });
            await customAuth.user?.destroy({ force: true });
        });

        it('should return 200 with roles data for authorized user', async () => {
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

        it('should return 200 with roles data for a channel-based authorized user, but must only return roles related to their channel', async () => {
            channel = await Channel.create(await generateChannelData());
            const role = await createRole(
                ['admin:role', 'view:role'],
                channel.id
            );

            await customAuth.user?.setRoles(role);

            const response = await request(app)
                .get(API_BASE_URL)
                .set(createAuthHeaders(customAuth.token!, channel.api_key))
                .expect('Content-Type', /json/)
                .expect(200);

            expect(response.body.status).toEqual(1);

            response.body.data.forEach((item: any) => {
                expect(item.channel_id).toBe(channel!.id);
            });
        });

        it('should return 403 when user lacks required permissions', async () => {
            const response = await request(app)
                .get(API_BASE_URL)
                .set(createAuthHeaders(userWithNoPermissionsAuth.token!))
                .expect('Content-Type', /json/)
                .expect(403);

            expect(response.body).toEqual({
                message: 'You do not have the required permissions to perform this action'
            });
        });
    });

    describe('GET /api/roles/:role_id', () => {
        let targetRole: Role;

        beforeAll( async () => {
            targetRole = await Role.create( generateRoleData());
        })

        afterAll(async () => {
            await targetRole?.destroy({ force: true });
        })

        it('should return 200 with role data for authorized user', async () => {
            const response = await request(app)
                .get(`${API_BASE_URL}/${targetRole.id}`)
                .set(createAuthHeaders(superadminAuth.token!))
                .expect('Content-Type', /json/)
                .expect(200);

            expect(response.body).toMatchObject({
                status: 1,
                data: expect.any(Object)
            });
        });

        it('should return 404 with non-existent permission ID', async () => {
            const response = await request(app)
                .get(`${API_BASE_URL}/${NON_EXISTENT_ROLE_ID}`)
                .set(createAuthHeaders(superadminAuth.token!))
                .expect('Content-Type', /json/)
                .expect(404);

            expect(response.body).toMatchObject({
                message: 'Role not found'
            });
        });

        it('should return 403 when user lacks required permissions', async () => {
            const response = await request(app)
                .get(`${API_BASE_URL}/${targetRole.id}`)
                .set(createAuthHeaders(userWithNoPermissionsAuth.token!))
                .expect('Content-Type', /json/)
                .expect(403);

            expect(response.body).toMatchObject({
                message: 'You do not have the required permissions to perform this action'
            });
        });
    });
    
    describe('POST /api/roles', () => {
        // Test an authorized user with different roles or permissions for every it function (assign them inside it function)
        // All roles and permissions for this authorized user will be force deleted for every it function
        let customAuth: IAuth = {
            token: null,
            user: null
        };

        beforeAll(async() => {
            customAuth.user = await User.create(await generateUserData());
            customAuth.token = await generateToken(customAuth.user.email, DEFAULT_PASSWORD);
        })

        afterAll(async () => {
            await customAuth.user?.destroy({ force: true });
        });

        it('should return 200 with permissions data for authorized user', async () => {
            const payload = generateRoleData();

            const response = await request(app)
                .post(`${API_BASE_URL}`)
                .set(createAuthHeaders(superadminAuth.token!))
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
                    channel_id: payload.channel_id,
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
                .set(createAuthHeaders(userWithNoPermissionsAuth.token!))
                .send(payload)
                .expect('Content-Type', /json/)
                .expect(403);

            expect(response.body).toEqual({
                message: 'You do not have the required permissions to perform this action'
            });
        });

        it(`should return 403 when authorized user's required permissions are attached to a wrong channel`, async () => {
            const payload = generateRoleData();
            const wrongChannel = await Channel.create(await generateChannelData());
            const correctChannel = await Channel.create(await generateChannelData());
            const role = await createRole(['admin:role', 'add:role'], correctChannel.id);
            
            // Mocking authorized user creating a role not within their channel
            payload.channel_id = wrongChannel.id;

            await customAuth.user?.setRoles(role);

            const response = await request(app)
                .post(`${API_BASE_URL}`)
                .set(createAuthHeaders(customAuth.token!, correctChannel.api_key))
                .send(payload)
                .expect('Content-Type', /json/)
                .expect(403);

            expect(response.body).toEqual({
                message: 'You can only add roles within your channel'
            });

            await correctChannel?.destroy({ force: true });
            await wrongChannel?.destroy({ force: true });
            await cleanupUserRoles(customAuth.user!);
        });

        it(`should return 403 when authorized user is adding role equal or higher than his role level`, async () => {
            const payload = generateRoleData(undefined, 1); // Generate role data with highest role level possible
            // Making role with the lowest possible role-level
            const customAuthRole = await createRole(['admin:role', 'add:role'], undefined, 5);
            await customAuth.user?.setRoles(customAuthRole);

            const response = await request(app)
                .post(`${API_BASE_URL}`)
                .set(createAuthHeaders(customAuth.token!))
                .send(payload)
                .expect('Content-Type', /json/)
                .expect(403);

            expect(response.body).toEqual({
                message: 'You can only add roles with a lower level than yours'
            });

            await cleanupUserRoles(customAuth.user!);
        });
    });

    describe('PUT /api/roles/:role_id', () => {
        let targetRole: Role | null;

        // For testing of different roles & permissions scenario. Attach roles & permissions for every it function
        let customAuth: IAuth = {
            token: null,
            user: null
        };

        beforeAll(async () => {
            targetRole = await Role.create(await generateRoleData());
            customAuth.user = await User.create(await generateUserData());
            customAuth.token = await generateToken(
                customAuth.user.email,
                DEFAULT_PASSWORD
            );
        })

        afterAll(async () => {
            await targetRole?.destroy({ force: true });
            await cleanupUserRoles(customAuth.user!);
        })

        it('should return 200 with role data for authorized user', async () => {
            const payload = generateRoleData();

            const response = await request(app)
                .put(`${API_BASE_URL}/${targetRole!.id}`)
                .set(createAuthHeaders(superadminAuth.token!))
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
                    channel_id: payload.channel_id,
                    scope: payload.scope,
                    created_at: expect.any(String),
                    updated_at: expect.any(String),
                    deleted_at: null
                }
            });
        });

        it('should return 403 when authorized user does not have required permissions', async () => {
            const payload = generateRoleData();

            const response = await request(app)
                .put(`${API_BASE_URL}/${targetRole!.id}`)
                .set(createAuthHeaders(userWithNoPermissionsAuth.token!))
                .send(payload)
                .expect('Content-Type', /json/)
                .expect(403);

            expect(response.body).toEqual({
                message: 'You do not have the required permissions to perform this action'
            });
        });

        it('should return 404 when the target permission does not exist', async () => {
            const payload = generateRoleData();

            const response = await request(app)
                .put(`${API_BASE_URL}/${NON_EXISTENT_ROLE_ID}`)
                .set(createAuthHeaders(superadminAuth.token!))
                .send(payload)
                .expect('Content-Type', /json/)
                .expect(404);

            expect(response.body).toEqual({
                message: 'Role not found'
            });
        });

        it(`should return 403 when authorized user's required permissions are attached to a wrong channel`, async () => {
            const payload = generateRoleData();
            const wrongChannel = await Channel.create(await generateChannelData());
            const correctChannel = await Channel.create(await generateChannelData());
            const role = await createRole(['admin:role', 'add:role'], correctChannel.id);
            
            // Mocking authorized user update a role not within their channel
            payload.channel_id = wrongChannel.id;

            await customAuth.user?.setRoles(role);

            const response = await request(app)
                .put(`${API_BASE_URL}/${targetRole!.id}`)
                .set(createAuthHeaders(customAuth.token!, correctChannel.api_key))
                .send(payload)
                .expect('Content-Type', /json/)
                .expect(403);

            expect(response.body).toEqual({
                message: 'You can only update roles within your channel'
            });

            await correctChannel?.destroy({ force: true });
            await wrongChannel?.destroy({ force: true });
            await cleanupUserRoles(customAuth.user!);
        });

        it(`should return 403 when authorized user's role level is lower than the target role level`, async () => {
            const payload = generateRoleData();
            const highLevelTargetRole = await createRole(['admin:role', 'add:role'], undefined, 1);
            // Low level role to be attach to the custom auth user (level value defaults to 5)
            const lowLevelRole = await createRole(['admin:role', 'add:role']);
            
            await customAuth.user?.setRoles(lowLevelRole);

            const response = await request(app)
                .put(`${API_BASE_URL}/${highLevelTargetRole.id}`)
                .set(createAuthHeaders(customAuth.token!))
                .send(payload)
                .expect('Content-Type', /json/)
                .expect(403);

            expect(response.body).toEqual({
                message: `You can't update role level field with a higher level than yours`
            });

            await cleanupUserRoles(customAuth.user!);
            await highLevelTargetRole?.destroy({force: true});
            await lowLevelRole?.destroy({force: true});
        });

        it(`should return 403 when the payload level property is higher than the authorized user's role level`, async () => {
            const payload = generateRoleData();
            // Make the payload level property to the highest value possible
            payload.level = 1;

            // Create low level target role, making sure that the auth user has the ability to update this
            const lowLevelTargetRole = await Role.create(await generateRoleData(undefined, 5));

            // Low level role to be attach to the custom auth user, set role level to 4 so it's still able to update the lowLevelTargetRole
            const lowLevelRole = await createRole(['admin:role', 'add:role'], undefined, 4);
            
            await customAuth.user?.setRoles(lowLevelRole);

            const response = await request(app)
                .put(`${API_BASE_URL}/${lowLevelTargetRole.id}`)
                .set(createAuthHeaders(customAuth.token!))
                .send(payload)
                .expect('Content-Type', /json/)
                .expect(403);

            expect(response.body).toEqual({
                message: `New value for role level field must be lower level than yours`
            });

            await cleanupUserRoles(customAuth.user!);
            await lowLevelTargetRole?.destroy({force: true});
            await lowLevelRole?.destroy({force: true});
        });
    });

    describe('DELETE /api/role/:role_id', () => {
        // For testing of different roles & permissions scenario. Attach roles & permissions for every it function
        let customAuth: IAuth = {
            token: null,
            user: null
        };

        beforeAll(async () => {
            customAuth.user = await User.create(await generateUserData());
            customAuth.token = await generateToken(
                customAuth.user.email,
                DEFAULT_PASSWORD
            );
        })

        afterEach(async () => {
            await cleanupUserRoles(customAuth.user!);
        });

        it('should return 200 with permissions data for authorized user', async () => {
            const targetRole = await Role.create(await generateRoleData());

            const response = await request(app)
                .delete(`${API_BASE_URL}/${targetRole!.id}`)
                .set(createAuthHeaders(superadminAuth.token!))
                .expect('Content-Type', /json/)
                .expect(200);

            expect(response.body).toMatchObject({
                status: 1,
                message: 'Role successfully soft-deleted'
            });

            await targetRole?.destroy({force: true});
        });

        it('should return 404 non existent role ID', async () => {
            const targetRole = await Role.create(await generateRoleData());

            const response = await request(app)
                .delete(`${API_BASE_URL}/${NON_EXISTENT_ROLE_ID}`)
                .set(createAuthHeaders(superadminAuth.token!))
                .expect('Content-Type', /json/)
                .expect(404);

            expect(response.body).toEqual({
                message: 'Role not found'
            });

            await targetRole?.destroy({force: true});
        });

        it('should return 403 when authorized user does not have required permissions', async () => {
            const targetRole = await Role.create(await generateRoleData());

            const response = await request(app)
                .delete(`${API_BASE_URL}/${targetRole!.id}`)
                .set(createAuthHeaders(userWithNoPermissionsAuth.token!))
                .expect('Content-Type', /json/)
                .expect(403);

            expect(response.body).toEqual({
                message: 'You do not have the required permissions to perform this action'
            });

            await targetRole?.destroy({force: true});
        });

        it(`should return 403 when the authorized user's required permissions are tied to a channel-based role that belongs to a different channel`, async () => {
            const wrongChannel = await Channel.create(await generateChannelData());
            const correctChannel = await Channel.create(await generateChannelData());
            // Target role to delete that is not within the authorized user's roles
            const targetRole = await Role.create(await generateRoleData(wrongChannel.id));

            // Role to attach to th authorized user with permissions for managing role
            const role = await createRole(['admin:role', 'add:role'], correctChannel.id);
            
            await customAuth.user?.setRoles(role);

            const response = await request(app)
                .delete(`${API_BASE_URL}/${targetRole!.id}`)
                .set(createAuthHeaders(customAuth.token!, correctChannel.api_key))
                .expect('Content-Type', /json/)
                .expect(403);

            expect(response.body).toEqual({
                message: 'You can only delete roles within your channel'
            });

            await correctChannel?.destroy({ force: true });
            await wrongChannel?.destroy({ force: true });
            await targetRole?.destroy({ force: true });
            await role?.destroy({ force: true });
            await cleanupUserRoles(customAuth.user!);
        });
    });
});