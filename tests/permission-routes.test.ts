import { describe, beforeAll, expect, afterAll, it } from '@jest/globals';
import request from 'supertest';
import app from '../src/app';
import Channel from '../src/database/models/Channel';
import Permission from '../src/database/models/Permission';
import sequelize from '../src/database/sequelize';
import { UserLevelType } from '../src/constants/enums';
import { IAuth } from './types';
import {
    createAuthHeaders,
    createAuthUser,
    createRole,
    forceDeleteInstances,
    generateChannelData,
    generatePermissionData
} from './utils';

describe('Permission Routes', () => {
    let superadminAuth: IAuth = {
        accessToken: null,
        user: null,
        agent: null,
        apiKey: null
    };

    let userWithNoPermissionsAuth: IAuth = {
        accessToken: null,
        user: null,
        agent: null,
        apiKey: null
    };

    const NON_EXISTENT_PERMISSION_ID = 999999;
    const API_BASE_URL = '/api/permissions';

    beforeAll(async () => {
        await sequelize.sync();

        superadminAuth = await createAuthUser('global', UserLevelType.superadmin);
        userWithNoPermissionsAuth = await createAuthUser();
    });

    afterAll(async () => {
        await forceDeleteInstances([
            superadminAuth.user!,
            userWithNoPermissionsAuth.user!
        ]);
        await sequelize.close();
    });

    describe('GET /api/permissions', () => {
        it('should return 200 with permissions data for authorized user', async () => {
            const response = await superadminAuth
                .agent!.get(API_BASE_URL)
                .set(createAuthHeaders(superadminAuth.accessToken!, superadminAuth.apiKey!))
                .expect('Content-Type', /json/)
                .expect(200);

            // GET /api/permissions with no page/size returns the flat array
            // directly (see permissionController.getAll's unpaginated branch).
            expect(Array.isArray(response.body)).toBe(true);
        });

        it('should return 403 when user lacks required permissions', async () => {
            const response = await userWithNoPermissionsAuth
                .agent!.get(API_BASE_URL)
                .set(createAuthHeaders(userWithNoPermissionsAuth.accessToken!, userWithNoPermissionsAuth.apiKey!))
                .expect('Content-Type', /json/)
                .expect(403);

            expect(response.body).toEqual({
                message:
                    'You do not have the required permissions to perform this action'
            });
        });
    });

    describe('GET /api/permissions/:permission_id', () => {
        it('should return 200 with permissions data for authorized user', async () => {
            const targetPermission = await Permission.create(
                generatePermissionData()
            );

            const response = await superadminAuth
                .agent!.get(`${API_BASE_URL}/${targetPermission.id}`)
                .set(createAuthHeaders(superadminAuth.accessToken!, superadminAuth.apiKey!))
                .expect('Content-Type', /json/)
                .expect(200);

            expect(response.body).toMatchObject({
                id: targetPermission.id
            });

            await forceDeleteInstances([targetPermission]);
        });

        it('should return 404 with non-existent permission ID', async () => {
            const response = await superadminAuth.agent
                .get(`${API_BASE_URL}/${NON_EXISTENT_PERMISSION_ID}`)
                .set(createAuthHeaders(superadminAuth.accessToken!, superadminAuth.apiKey!))
                .expect('Content-Type', /json/)
                .expect(404);

            expect(response.body).toMatchObject({
                message: 'Permission not found'
            });
        });

        it('should return 403 when user lacks required permissions', async () => {
            const targetPermission = await Permission.create(
                generatePermissionData()
            );

            const response = await userWithNoPermissionsAuth
                .agent!.get(`${API_BASE_URL}/${targetPermission.id}`)
                .set(createAuthHeaders(userWithNoPermissionsAuth.accessToken!, userWithNoPermissionsAuth.apiKey!))
                .expect('Content-Type', /json/)
                .expect(403);

            expect(response.body).toMatchObject({
                message:
                    'You do not have the required permissions to perform this action'
            });

            await forceDeleteInstances([targetPermission]);
        });
    });

    describe('POST /api/permissions', () => {
        it('should return 200 with permissions data for authorized user', async () => {
            const payload = await generatePermissionData();

            const response = await superadminAuth
                .agent!.post(`${API_BASE_URL}`)
                .set(createAuthHeaders(superadminAuth.accessToken!, superadminAuth.apiKey!))
                .send(payload)
                .expect('Content-Type', /json/)
                .expect(200);

            expect(response.body).toMatchObject({
                id: expect.any(Number)
            });

            const createdPermission = await Permission.findByPk(
                response.body.id
            );
            await forceDeleteInstances([createdPermission!]);
        });

        it('should return 403 when authorized user does not have required permissions', async () => {
            const payload = await generatePermissionData();

            const response = await userWithNoPermissionsAuth
                .agent!.post(`${API_BASE_URL}`)
                .set(createAuthHeaders(userWithNoPermissionsAuth.accessToken!, userWithNoPermissionsAuth.apiKey!))
                .send(payload)
                .expect('Content-Type', /json/)
                .expect(403);

            expect(response.body).toEqual({
                message:
                    'You do not have the required permissions to perform this action'
            });
        });
    });

    describe('PUT /api/permissions/:permission_id', () => {
        it('should return 200 with permissions data for authorized user', async () => {
            const targetPermission = await Permission.create(
                generatePermissionData()
            );
            const payload = await generatePermissionData();

            const response = await superadminAuth
                .agent!.put(`${API_BASE_URL}/${targetPermission!.id}`)
                .set(createAuthHeaders(superadminAuth.accessToken!, superadminAuth.apiKey!))
                .send(payload)
                .expect('Content-Type', /json/)
                .expect(200);

            // Note: Permission has no scope/sequence columns (payload.scope from
            // generatePermissionData() is accepted but silently dropped — not
            // persisted or echoed back).
            expect(response.body).toMatchObject({
                id: expect.any(Number),
                name: payload.name,
                description: null, // Could be string or null
                ref_name: payload.ref_name,
                module: payload.module,
                access_level: payload.access_level,
                updated_at: expect.any(String),
                created_at: expect.any(String),
                deleted_at: null
            });

            await forceDeleteInstances([targetPermission]);
        });

        it('should return 404 with non-existent permission ID', async () => {
            const payload = await generatePermissionData();

            const response = await superadminAuth
                .agent!.put(`${API_BASE_URL}/${NON_EXISTENT_PERMISSION_ID}`)
                .set(createAuthHeaders(superadminAuth.accessToken!, superadminAuth.apiKey!))
                .send(payload)
                .expect('Content-Type', /json/)
                .expect(404);

            expect(response.body).toMatchObject({
                message: 'Permission not found'
            });
        });

        it('should return 403 when authorized user does not have required permissions', async () => {
            const targetPermission = await Permission.create(
                generatePermissionData()
            );
            const payload = await generatePermissionData();

            const response = await userWithNoPermissionsAuth
                .agent!.put(`${API_BASE_URL}/${targetPermission!.id}`)
                .set(createAuthHeaders(userWithNoPermissionsAuth.accessToken!, userWithNoPermissionsAuth.apiKey!))
                .send(payload)
                .expect('Content-Type', /json/)
                .expect(403);

            expect(response.body).toEqual({
                message:
                    'You do not have the required permissions to perform this action'
            });

            await forceDeleteInstances([targetPermission]);
        });

        it('should return 403 when authorized user has required permissions but attached to a channel-based role and the target permission is also not assigned to any of her roles', async () => {
            const targetPermission = await Permission.create(
                generatePermissionData()
            );
            const channel = await Channel.create(generateChannelData());
            const customAuthUser: IAuth = await createAuthUser(channel.api_key);
            const customAuthUserRole = await createRole(
                ['auth:admin:permission', 'auth:update:permission'],
                channel!.id
            ); // Global role
            await customAuthUser.user!.setRoles([customAuthUserRole]);

            const response = await request(app)
                .put(`${API_BASE_URL}/${targetPermission!.id}`)
                .set(createAuthHeaders(customAuthUser.accessToken!, customAuthUser.apiKey!))
                .send(await generatePermissionData())
                .expect('Content-Type', /json/)
                .expect(403);

            expect(response.body).toEqual({
                message: 'You are not authorized to update this permission'
            });

            await forceDeleteInstances([
                targetPermission,
                customAuthUser.user!,
                channel,
                customAuthUserRole
            ]);
        });
    });

    describe('DELETE /api/permissions/:permission_id', () => {
        it('should return 200 with permissions data for authorized user', async () => {
            const targetPermission = await Permission.create(
                generatePermissionData()
            );

            const response = await superadminAuth
                .agent!.delete(`${API_BASE_URL}/${targetPermission!.id}`)
                .set(createAuthHeaders(superadminAuth.accessToken!, superadminAuth.apiKey!))
                .expect('Content-Type', /json/)
                .expect(200);

            expect(response.body).toMatchObject({
                message: 'Permission successfully soft-deleted'
            });

            await forceDeleteInstances([targetPermission]);
        });

        it('should return 404 with non-existent permission ID', async () => {
            const response = await superadminAuth
                .agent!.delete(`${API_BASE_URL}/${NON_EXISTENT_PERMISSION_ID}`)
                .set(createAuthHeaders(superadminAuth.accessToken!, superadminAuth.apiKey!))
                .expect('Content-Type', /json/)
                .expect(404);

            expect(response.body).toMatchObject({
                message: 'Permission not found'
            });
        });

        it('should return 403 when authorized user does not have required permissions', async () => {
            const targetPermission = await Permission.create(
                generatePermissionData()
            );

            const response = await userWithNoPermissionsAuth
                .agent!.delete(`${API_BASE_URL}/${targetPermission!.id}`)
                .set(createAuthHeaders(userWithNoPermissionsAuth.accessToken!, userWithNoPermissionsAuth.apiKey!))
                .expect('Content-Type', /json/)
                .expect(403);

            expect(response.body).toEqual({
                message:
                    'You do not have the required permissions to perform this action'
            });

            await forceDeleteInstances([targetPermission]);
        });
    });
});
