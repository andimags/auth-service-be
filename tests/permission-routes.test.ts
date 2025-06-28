import request from 'supertest';
import app from '../src/app';
import Channel from '../src/database/models/Channel';
import Permission from '../src/database/models/Permission';
import Role from '../src/database/models/Role';
import User from '../src/database/models/User';
import sequelize from '../src/database/sequelize';
import { AppError } from '../src/middlewares/errorHandler';
import {
    cleanupUserRoles,
    createAuthHeaders,
    createRole,
    generateChannelData,
    generatePermissionData,
    generateToken,
    generateUserData
} from './utils';

describe('Permission Routes', () => {
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

    const NON_EXISTENT_PERMISSION_ID = 999999;
    const DEFAULT_PASSWORD = 'abcd1234';
    const API_BASE_URL = '/api/permissions';

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

        console.log('superadminAuth',superadminAuth);
    });

    afterAll(async () => {
        await superadminAuth.user?.destroy({ force: true });
        await sequelize.close();
    });

    describe('GET /api/permissions', () => {

        it('should return 200 with permissions data for authorized user', async () => {
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
                .set(createAuthHeaders(userWithNoPermissionsAuth.token!))
                .expect('Content-Type', /json/)
                .expect(403);

            expect(response.body).toEqual({
                message: 'You do not have the required permissions to perform this action'
            });
        });
    });

    describe('GET /api/permissions/:permission_id', () => {
        let targetPermission: Permission;

        beforeAll( async () => {
            targetPermission = await Permission.create(await generatePermissionData());
        })

        afterAll(async () => {
            await targetPermission?.destroy({ force: true });
        })

        it('should return 200 with permissions data for authorized user', async () => {
            const response = await request(app)
                .get(`${API_BASE_URL}/${targetPermission.id}`)
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
                .get(`${API_BASE_URL}/${NON_EXISTENT_PERMISSION_ID}`)
                .set(createAuthHeaders(superadminAuth.token!))
                .expect('Content-Type', /json/)
                .expect(404);

            expect(response.body).toMatchObject({
                message: 'Permission not found'
            });
        });

        it('should return 403 when user lacks required permissions', async () => {
            const response = await request(app)
                .get(`${API_BASE_URL}/${targetPermission.id}`)
                .set(createAuthHeaders(userWithNoPermissionsAuth.token!))
                .expect('Content-Type', /json/)
                .expect(403);

            expect(response.body).toMatchObject({
                message: 'You do not have the required permissions to perform this action'
            });
        });
    });
    
    describe('POST /api/permissions', () => {
        let createdPermission: Permission | null; // If the creation of permission is successful, assign here to delete later

        afterEach(async () => {
            await createdPermission?.destroy({ force: true });
        })

        it('should return 200 with permissions data for authorized user', async () => {
            const payload = await generatePermissionData();

            const response = await request(app)
                .post(`${API_BASE_URL}`)
                .set(createAuthHeaders(superadminAuth.token!))
                .send(payload)
                .expect('Content-Type', /json/)
                .expect(200);

            expect(response.body).toMatchObject({
                status: 1,
                data: expect.any(Object)
            });

            createdPermission = await Permission.findByPk(response.body.data.id);
        });

        it('should return 403 when authorized user does not have required permissions', async () => {
            const payload = await generatePermissionData();

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
    });

    describe('PUT /api/permissions/:permission_id', () => {
        let targetPermission: Permission | null;
        let role: Role | null; // Global role
        let channel: Channel | null;
        // For testing of different roles & permissions scenario. Attach roles & permissions for every it function
        let authorizedUserAuth: IAuth = {
            token: null,
            user: null
        };

        beforeAll(async () => {
            targetPermission = await Permission.create(await generatePermissionData());
            authorizedUserAuth.user = await User.create(await generateUserData());
            channel = await Channel.create(await generateChannelData());
            authorizedUserAuth.token = await generateToken(
                authorizedUserAuth.user.email,
                DEFAULT_PASSWORD
            );
        })

        afterAll(async () => {
            await targetPermission?.destroy({ force: true });
            await role?.destroy({ force: true });
            await channel?.destroy({ force: true });
            await cleanupUserRoles(authorizedUserAuth.user!);
        })

        it('should return 200 with permissions data for authorized user', async () => {
            const payload = await generatePermissionData();

            const response = await request(app)
                .put(`${API_BASE_URL}/${targetPermission!.id}`)
                .set(createAuthHeaders(superadminAuth.token!))
                .send(payload)
                .expect('Content-Type', /json/)
                .expect(200);

            expect(response.body).toMatchObject({
                status: 1,
                data: {
                    scope: payload.scope,
                    id: expect.any(Number),
                    name: payload.name,
                    description: null, // Could be string or null
                    ref_name: payload.ref_name,
                    module: payload.module,
                    access_level: payload.access_level,
                    sequence: null, // Could be number or null
                    updated_at: expect.any(String),
                    created_at: expect.any(String),
                    deleted_at: null
                }
            });
        });

        it('should return 403 when authorized user does not have required permissions', async () => {
            const response = await request(app)
                .put(`${API_BASE_URL}/${targetPermission!.id}`)
                .set(createAuthHeaders(userWithNoPermissionsAuth.token!))
                .send(await generatePermissionData())
                .expect('Content-Type', /json/)
                .expect(403);

            expect(response.body).toEqual({
                message: 'You do not have the required permissions to perform this action'
            });
        });

        it('should return 403 when authorized user has required permissions but attached to a channel-based role, the target permission is also not assigned to any of her roles', async () => {
            role = await createRole(['admin:permission', 'update:permission'], channel!.id); // Global role
            await authorizedUserAuth.user!.setRoles(role!);

            const response = await request(app)
                .put(`${API_BASE_URL}/${targetPermission!.id}`)
                .set(createAuthHeaders(authorizedUserAuth.token!, channel?.api_key))
                .send(await generatePermissionData())
                .expect('Content-Type', /json/)
                .expect(403);

            expect(response.body).toEqual({
                message: 'You are not authorized to update this permission, as it is not assigned to any of your roles'
            });
        });
    });

    describe('DELETE /api/permissions/:permission_id', () => {
        let targetPermission: Permission | null;
        let channel: Channel | null;
        // For testing of different roles & permissions scenario. Attach roles & permissions for every it function
        let authorizedUserAuth: IAuth = {
            token: null,
            user: null
        };

        beforeAll(async () => {
            targetPermission = await Permission.create(await generatePermissionData());
            authorizedUserAuth.user = await User.create(await generateUserData());
            channel = await Channel.create(await generateChannelData());
            authorizedUserAuth.token = await generateToken(
                authorizedUserAuth.user.email,
                DEFAULT_PASSWORD
            );
        })

        afterAll(async () => {
            await targetPermission?.destroy({ force: true });
            await channel?.destroy({ force: true });
        })

        afterEach(async () => {
            await cleanupUserRoles(authorizedUserAuth.user!);

            // Restore permission if soft-deleted
            if(targetPermission) await targetPermission.restore();
        });

        it('should return 200 with permissions data for authorized user', async () => {
            const response = await request(app)
                .delete(`${API_BASE_URL}/${targetPermission!.id}`)
                .set(createAuthHeaders(superadminAuth.token!))
                .expect('Content-Type', /json/)
                .expect(200);

            expect(response.body).toMatchObject({
                status: 1,
                message: 'Permission successfully soft-deleted'
            });
        });

        it('should return 403 when authorized user does not have required permissions', async () => {
            const response = await request(app)
                .delete(`${API_BASE_URL}/${targetPermission!.id}`)
                .set(createAuthHeaders(userWithNoPermissionsAuth.token!))
                .expect('Content-Type', /json/)
                .expect(403);

            expect(response.body).toEqual({
                message: 'You do not have the required permissions to perform this action'
            });
        });
    });
});