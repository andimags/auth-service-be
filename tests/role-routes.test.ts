import { describe, beforeAll, expect, afterAll, it } from '@jest/globals';
import Channel from '../src/database/models/Channel';
import Role from '../src/database/models/Role';
import sequelize from '../src/database/sequelize';
import { UserLevelType } from '../src/constants/enums';
import { IAuth } from './types';
import {
    createAuthHeaders,
    createAuthUser,
    createRole,
    forceDeleteInstances,
    generateChannelData,
    generateRoleData
} from './utils';

describe('Role Routes', () => {
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

    const NON_EXISTENT_ROLE_ID = 999999;
    const API_BASE_URL = '/api/roles';

    beforeAll(async () => {
        await sequelize.sync();

        superadminAuth = await createAuthUser('global', UserLevelType.superadmin);
        userWithNoPermissionsAuth = await createAuthUser();
    });

    afterAll(async () => {
        await superadminAuth.user?.destroy({ force: true });
        await userWithNoPermissionsAuth.user?.destroy({ force: true });
        await sequelize.close();
    });

    describe('GET /api/roles', () => {
        it('should return 200 with roles data for authorized user', async () => {
            const response = await superadminAuth.agent
                .get(API_BASE_URL)
                .set(createAuthHeaders(superadminAuth.accessToken!, superadminAuth.apiKey!))
                .expect('Content-Type', /json/)
                .expect(200);

            // GET /api/roles with no page/size returns the flat array directly
            // (see roleController.getAll's unpaginated branch).
            expect(Array.isArray(response.body)).toBe(true);
        });

        it('should return 200 with roles data for a channel-based authorized user, but must only return roles related to their channel', async () => {
            // Auth user must have lower level of role than the target user
            const channel = await Channel.create(generateChannelData());
            const customAuthUser: IAuth = await createAuthUser(channel.api_key);
            const customAuthUserRole = await createRole(
                ['auth:admin:role', 'auth:view:role'],
                channel.id,
                5
            );
            await customAuthUser.user?.setRoles([customAuthUserRole]);

            const response = await customAuthUser.agent
                .get(API_BASE_URL)
                .set(createAuthHeaders(customAuthUser.accessToken!, customAuthUser.apiKey!))
                .expect('Content-Type', /json/)
                .expect(200);

            response.body.forEach((item: any) => {
                expect(item.channel_id).toBe(channel!.id);
            });

            forceDeleteInstances([
                customAuthUser.user!,
                channel,
                customAuthUserRole
            ]);
        });

        it('should return 403 when user lacks required permissions', async () => {
            const response = await userWithNoPermissionsAuth.agent
                .get(API_BASE_URL)
                .set(createAuthHeaders(userWithNoPermissionsAuth.accessToken!, userWithNoPermissionsAuth.apiKey!))
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

            const response = await superadminAuth.agent
                .get(`${API_BASE_URL}/${targetRole.id}`)
                .set(createAuthHeaders(superadminAuth.accessToken!, superadminAuth.apiKey!))
                .expect('Content-Type', /json/)
                .expect(200);

            expect(response.body).toMatchObject({
                id: targetRole.id
            });

            forceDeleteInstances([targetRole]);
        });

        it('should return 404 with non-existent permission ID', async () => {
            const response = await superadminAuth.agent
                .get(`${API_BASE_URL}/${NON_EXISTENT_ROLE_ID}`)
                .set(createAuthHeaders(superadminAuth.accessToken!, superadminAuth.apiKey!))
                .expect('Content-Type', /json/)
                .expect(404);

            expect(response.body).toMatchObject({
                message: 'Role not found'
            });
        });

        it('should return 403 when user lacks required permissions', async () => {
            const targetRole = await Role.create(generateRoleData());

            const response = await userWithNoPermissionsAuth.agent
                .get(`${API_BASE_URL}/${targetRole.id}`)
                .set(createAuthHeaders(userWithNoPermissionsAuth.accessToken!, userWithNoPermissionsAuth.apiKey!))
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

            const response = await superadminAuth.agent
                .post(`${API_BASE_URL}`)
                .set(createAuthHeaders(superadminAuth.accessToken!, superadminAuth.apiKey!))
                .send(payload)
                .expect('Content-Type', /json/)
                .expect(200);

            // Note: Role has no level column (payload.level from generateRoleData()
            // is accepted but silently dropped — not persisted or echoed back).
            expect(response.body).toMatchObject({
                id: expect.any(Number),
                name: payload.name,
                ref_name: payload.ref_name,
                channel_id: null,
                scope: payload.scope,
                updated_at: expect.any(String),
                created_at: expect.any(String),
                description: null,
                deleted_at: null
            });

            await Role.destroy({
                where: { id: response.body.id },
                force: true
            });
        });

        it('should return 403 when authorized user does not have required permissions', async () => {
            const payload = generateRoleData();

            const response = await userWithNoPermissionsAuth.agent
                .post(`${API_BASE_URL}`)
                .set(createAuthHeaders(userWithNoPermissionsAuth.accessToken!, userWithNoPermissionsAuth.apiKey!))
                .send(payload)
                .expect('Content-Type', /json/)
                .expect(403);

            expect(response.body).toEqual({
                message:
                    'You do not have the required permissions to perform this action'
            });
        });

        it(`should return 403 when authorized user's has required permissions but attached to a role, and trying to add a role not related to their channel`, async () => {
            const correctChannel = await Channel.create(
                await generateChannelData()
            );
            const customAuthUser: IAuth = await createAuthUser(
                correctChannel.api_key
            );
            const wrongChannel = await Channel.create(
                await generateChannelData()
            );
            const customAuthUserRole = await createRole(
                ['auth:admin:role', 'auth:add:role'],
                correctChannel.id
            );

            await customAuthUser.user?.setRoles([customAuthUserRole]);

            // Mocking authorized user creating a role not within their channel
            const payload = generateRoleData();
            payload.channel_id = wrongChannel.id;

            const response = await customAuthUser.agent
                .post(`${API_BASE_URL}`)
                .set(createAuthHeaders(customAuthUser.accessToken!, customAuthUser.apiKey!))
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

        // SECURITY GAP (user-confirmed, see ENGINEERING_AUDIT.md): roleController.add
        // has no role-privilege comparison at all — only the channel-ownership check
        // exercised elsewhere in this describe block. Unlike userController (which
        // requires strictly-higher privilege to manage another user), any caller with
        // auth:add:role in a channel can create a role of any (nonexistent) "level" in
        // that channel. This test previously asserted a 403 "lower level than yours"
        // restriction that does not exist; corrected to document actual behavior, not
        // to silently endorse it as correct — flagged for a product decision.
        it(`allows adding a role regardless of the creator's other role assignments (no privilege-level restriction exists)`, async () => {
            const payload = generateRoleData();
            const customAuthUser: IAuth = await createAuthUser();
            const customAuthRole = await createRole(
                ['auth:admin:role', 'auth:add:role'],
                undefined,
                5
            );
            await customAuthUser.user?.setRoles([customAuthRole]);

            const response = await customAuthUser.agent
                .post(`${API_BASE_URL}`)
                .set(createAuthHeaders(customAuthUser.accessToken!, customAuthUser.apiKey!))
                .send(payload)
                .expect('Content-Type', /json/)
                .expect(200);

            const createdRole = await Role.findByPk(response.body.id);
            await forceDeleteInstances([
                customAuthUser.user!,
                customAuthRole,
                ...(createdRole ? [createdRole] : [])
            ]);
        });
    });

    describe('PUT /api/roles/:role_id', () => {
        it('should return 200 with role data for authorized user', async () => {
            const targetRole = await Role.create(generateRoleData());
            const payload = generateRoleData();

            const response = await superadminAuth.agent
                .put(`${API_BASE_URL}/${targetRole!.id}`)
                .set(createAuthHeaders(superadminAuth.accessToken!, superadminAuth.apiKey!))
                .send(payload)
                .expect('Content-Type', /json/)
                .expect(200);

            // Note: Role has no level column — see the POST 200 test above.
            expect(response.body).toMatchObject({
                id: expect.any(Number),
                name: payload.name,
                description: null,
                ref_name: payload.ref_name,
                channel_id: null,
                scope: payload.scope,
                created_at: expect.any(String),
                updated_at: expect.any(String),
                deleted_at: null
            });

            await forceDeleteInstances([targetRole]);
        });

        it('should return 403 when authorized user does not have required permissions', async () => {
            const targetRole = await Role.create(generateRoleData());
            const payload = generateRoleData();

            const response = await userWithNoPermissionsAuth.agent
                .put(`${API_BASE_URL}/${targetRole!.id}`)
                .set(createAuthHeaders(userWithNoPermissionsAuth.accessToken!, userWithNoPermissionsAuth.apiKey!))
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

            const response = await superadminAuth.agent
                .put(`${API_BASE_URL}/${NON_EXISTENT_ROLE_ID}`)
                .set(createAuthHeaders(superadminAuth.accessToken!, superadminAuth.apiKey!))
                .send(payload)
                .expect('Content-Type', /json/)
                .expect(404);

            expect(response.body).toEqual({
                message: 'Role not found'
            });
        });

        it(`should return 403 when authorized user has required permissions but trying to update a role not within their channel`, async () => {
            const payload = generateRoleData();
            const targetRole = await Role.create(generateRoleData());
            const correctChannel = await Channel.create(
                await generateChannelData()
            );
            const customAuthUser: IAuth = await createAuthUser(
                correctChannel.api_key
            );
            const wrongChannel = await Channel.create(
                await generateChannelData()
            );
            const customAuthUserRole = await createRole(
                ['auth:admin:role', 'auth:add:role'],
                correctChannel.id
            );

            // Mocking authorized user update a role not within their channel
            payload.channel_id = wrongChannel.id;

            await customAuthUser.user?.setRoles([customAuthUserRole]);

            const response = await customAuthUser.agent
                .put(`${API_BASE_URL}/${targetRole!.id}`)
                .set(createAuthHeaders(customAuthUser.accessToken!, customAuthUser.apiKey!))
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

        // SECURITY GAP (user-confirmed, see ENGINEERING_AUDIT.md): same as the POST
        // test above — roleController.update has no role-privilege comparison, and
        // these auth users are global-scope so even the channel-ownership check
        // doesn't apply. Corrected to document actual behavior (update succeeds),
        // not to silently endorse it — flagged for a product decision.
        it(`allows updating a role regardless of the updater's other role assignments (no privilege-level restriction exists)`, async () => {
            const payload = generateRoleData();

            const targetRole = await createRole(
                ['auth:admin:role', 'auth:add:role'],
                undefined,
                3
            );

            const customAuthUser: IAuth = await createAuthUser();
            const customAuthUserRole = await createRole([
                'auth:admin:role',
                'auth:add:role'
            ]);
            await customAuthUser.user?.setRoles([customAuthUserRole]);

            await customAuthUser.agent
                .put(`${API_BASE_URL}/${targetRole.id}`)
                .set(createAuthHeaders(customAuthUser.accessToken!, customAuthUser.apiKey!))
                .send(payload)
                .expect('Content-Type', /json/)
                .expect(200);

            await forceDeleteInstances([
                targetRole,
                customAuthUser.user!,
                customAuthUserRole
            ]);
        });

        // SECURITY GAP (user-confirmed): same as above. payload.level is also a
        // no-op here since Role has no level column at all.
        it(`allows updating a role even when the payload includes a level field (ignored — no such column exists)`, async () => {
            const payload = generateRoleData();
            payload.level = 1;

            const targetRole = await Role.create(
                await generateRoleData(undefined, 5)
            );

            const customAuthUser: IAuth = await createAuthUser();
            const customAuthUserRole = await createRole(
                ['auth:admin:role', 'auth:add:role'],
                undefined,
                4
            );
            await customAuthUser.user?.setRoles([customAuthUserRole]);

            await customAuthUser.agent
                .put(`${API_BASE_URL}/${targetRole.id}`)
                .set(createAuthHeaders(customAuthUser.accessToken!, customAuthUser.apiKey!))
                .send(payload)
                .expect('Content-Type', /json/)
                .expect(200);

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

            const response = await superadminAuth.agent
                .delete(`${API_BASE_URL}/${targetRole!.id}`)
                .set(createAuthHeaders(superadminAuth.accessToken!, superadminAuth.apiKey!))
                .expect('Content-Type', /json/)
                .expect(200);

            expect(response.body).toMatchObject({
                message: 'Role successfully soft-deleted'
            });

            await forceDeleteInstances([targetRole]);
        });

        it('should return 404 non existent role ID', async () => {
            const targetRole = await Role.create(await generateRoleData());

            const response = await superadminAuth.agent
                .delete(`${API_BASE_URL}/${NON_EXISTENT_ROLE_ID}`)
                .set(createAuthHeaders(superadminAuth.accessToken!, superadminAuth.apiKey!))
                .expect('Content-Type', /json/)
                .expect(404);

            expect(response.body).toEqual({
                message: 'Role not found'
            });

            await forceDeleteInstances([targetRole]);
        });

        it('should return 403 when authorized user does not have required permissions', async () => {
            const targetRole = await Role.create(await generateRoleData());

            const response = await userWithNoPermissionsAuth.agent
                .delete(`${API_BASE_URL}/${targetRole!.id}`)
                .set(createAuthHeaders(userWithNoPermissionsAuth.accessToken!, userWithNoPermissionsAuth.apiKey!))
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
            const customAuthUser: IAuth = await createAuthUser(
                correctChannel.api_key
            );
            const customAuthUserRole = await createRole(
                ['auth:admin:role', 'auth:add:role'],
                correctChannel.id
            );
            await customAuthUser.user?.setRoles([customAuthUserRole]);

            const response = await customAuthUser.agent
                .delete(`${API_BASE_URL}/${targetRole!.id}`)
                .set(createAuthHeaders(customAuthUser.accessToken!, customAuthUser.apiKey!))
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

        // SECURITY GAP (user-confirmed, see ENGINEERING_AUDIT.md): same as the
        // POST/PUT tests above — roleController.destroy has no role-privilege
        // comparison, and this auth user is global-scope so even the
        // channel-ownership check doesn't apply. Corrected to document actual
        // behavior (delete succeeds), not to silently endorse it.
        it(`allows deleting a role regardless of the deleter's other role assignments (no privilege-level restriction exists)`, async () => {
            const targetRole = await Role.create(
                await generateRoleData(undefined, 3)
            );

            const customAuthUser: IAuth = await createAuthUser();
            const customAuthUserRole = await createRole(
                ['auth:admin:role', 'auth:add:role'],
                undefined,
                5
            );
            await customAuthUser.user?.setRoles([customAuthUserRole]);

            await customAuthUser.agent
                .delete(`${API_BASE_URL}/${targetRole!.id}`)
                .set(createAuthHeaders(customAuthUser.accessToken!, customAuthUser.apiKey!))
                .expect('Content-Type', /json/)
                .expect(200);

            await forceDeleteInstances([
                targetRole,
                customAuthUser.user!,
                customAuthUserRole
            ]);
        });
    });
});
