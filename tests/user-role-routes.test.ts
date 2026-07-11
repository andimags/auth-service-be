import { describe, beforeAll, expect, afterAll, it } from '@jest/globals';
import Channel from '../src/database/models/Channel';
import Permission from '../src/database/models/Permission';
import Role from '../src/database/models/Role';
import User from '../src/database/models/User';
import sequelize from '../src/database/sequelize';
import { UserLevelType } from '../src/constants/enums';
import { IAuth } from './types';
import {
    createAuthHeaders,
    createAuthUser,
    createRole,
    forceDeleteInstances,
    generateChannelData,
    generatePermissionData,
    generateUserData
} from './utils';

describe('Role Permission Routes', () => {
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

    const NON_EXISTENT_USER_ID = 999999;
    const NON_EXISTENT_ROLE_REF_NAME = 'non_existent_role_ref_name';
    const API_BASE_URL = '/api/user-role/user';

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

    describe('GET /api/user-role/user/:user_id', () => {
        it(`should return 200 with user's roles for authorized user`, async () => {
            const targetUser = await User.create(await generateUserData());
            const role = await createRole(['auth:admin:role_policy']);

            await targetUser?.setRoles([role]);

            const response = await superadminAuth.agent
                .get(`${API_BASE_URL}/${targetUser.id}`)
                .set(createAuthHeaders(superadminAuth.accessToken!, superadminAuth.apiKey!))
                .expect('Content-Type', /json/)
                .expect(200);

            expect(Array.isArray(response.body)).toBe(true);

            expect(response.body.length).toBeGreaterThan(0);

            await forceDeleteInstances([targetUser, role]);
        });

        it('should return 404 when role is non-existent', async () => {
            const response = await superadminAuth.agent
                .get(`${API_BASE_URL}/${NON_EXISTENT_USER_ID}`)
                .set(createAuthHeaders(superadminAuth.accessToken!, superadminAuth.apiKey!))
                .expect('Content-Type', /json/)
                .expect(404);

            expect(response.body).toEqual({
                message: 'User not found'
            });
        });

        it('should return 403 when user lacks required permissions', async () => {
            const targetUser = await User.create(await generateUserData());

            const response = await userWithNoPermissionsAuth.agent
                .get(`${API_BASE_URL}/${targetUser!.id}`)
                .set(createAuthHeaders(userWithNoPermissionsAuth.accessToken!, userWithNoPermissionsAuth.apiKey!))
                .expect('Content-Type', /json/)
                .expect(403);

            expect(response.body).toEqual({
                message:
                    'You do not have the required permissions to perform this action'
            });

            await forceDeleteInstances([targetUser]);
        });
    });

    describe('POST /api/user-role/user/:user_id', () => {
        it(`should return 200 with roles of the user if authorized user has required permissions`, async () => {
            const targetUser = await User.create(await generateUserData());
            const roleForPayload = await createRole(['auth:admin:role_policy']);
            const payload = {
                role_ref_names: roleForPayload.ref_name
            };

            const response = await superadminAuth.agent
                .post(`${API_BASE_URL}/${targetUser!.id}`)
                .set(createAuthHeaders(superadminAuth.accessToken!, superadminAuth.apiKey!))
                .send(payload)
                .expect('Content-Type', /json/)
                .expect(200);

            expect(Array.isArray(response.body)).toBe(true);

            // Make sure that the role attached to the target user must match the ID for roleForPayload
            expect(response.body[0].id).toEqual(roleForPayload.id);

            await forceDeleteInstances([targetUser, roleForPayload]);
        });

        it('should return 404 with non-existent user ID', async () => {
            const roleForPayload = await createRole(['auth:admin:role_policy']);
            const payload = {
                role_ref_names: roleForPayload.ref_name
            };

            const response = await superadminAuth.agent
                .post(`${API_BASE_URL}/${NON_EXISTENT_USER_ID}`)
                .set(createAuthHeaders(superadminAuth.accessToken!, superadminAuth.apiKey!))
                .send(payload)
                .expect('Content-Type', /json/)
                .expect(404);

            expect(response.body).toEqual({
                message: 'User not found'
            });

            await forceDeleteInstances([roleForPayload]);
        });

        it('should return 404 when the payload for role_ids does not exist', async () => {
            const targetUser = await User.create(await generateUserData());
            const payload = {
                role_ref_names: NON_EXISTENT_ROLE_REF_NAME
            };

            const response = await superadminAuth.agent
                .post(`${API_BASE_URL}/${targetUser!.id}`)
                .set(createAuthHeaders(superadminAuth.accessToken!, superadminAuth.apiKey!))
                .send(payload)
                .expect('Content-Type', /json/)
                .expect(404);

            expect(response.body).toEqual({
                message: `Role ref names ${NON_EXISTENT_ROLE_REF_NAME} do not exist`
            });

            await forceDeleteInstances([targetUser]);
        });

        it('should return 403 when authorized user is adding permissions to a role with higher or equal level to theirs', async () => {
            const customAuthUser: IAuth = await createAuthUser();
            const authUserRole = await createRole(
                ['auth:admin:user_role'],
                undefined,
                5
            );

            await customAuthUser.user?.setRoles([authUserRole]);

            const targetUser = await User.create(await generateUserData());
            // Role level for payload must be highter than the auth user's role assigned to them to mock auth user assigning role higher than theirs to target user
            const roleForPayload = await createRole(
                ['auth:admin:user_role'],
                undefined,
                3
            );
            const payload = {
                role_ref_names: roleForPayload.ref_name
            };

            const response = await customAuthUser.agent
                .post(`${API_BASE_URL}/${targetUser!.id}`)
                .set(createAuthHeaders(customAuthUser.accessToken!, customAuthUser.apiKey!))
                .send(payload)
                .expect('Content-Type', /json/)
                .expect(403);

            // addUserRoles gates on User.level privilege (isMorePrivileged), not
            // Role "level" (Role has no such column) — both users here default to
            // 'member', so neither outranks the other.
            expect(response.body).toEqual({
                message:
                    'You can only assign roles to users with a lower privilege level than yourself'
            });

            await forceDeleteInstances([
                customAuthUser.user!,
                authUserRole,
                targetUser,
                roleForPayload
            ]);
        });

        it("should return 403 when authorized user's role is channel-based and the role being assigned is from different channel", async () => {
            const correctChannel = await Channel.create(generateChannelData());
            // Must outrank targetUser (member) so the privilege check passes and
            // the channel check below is actually what's being exercised.
            const customAuthUser: IAuth = await createAuthUser(
                correctChannel.api_key,
                UserLevelType.superadmin
            );
            const wrongChannel = await Channel.create(generateChannelData());
            const authUserRole = await createRole(
                ['auth:admin:user_role'],
                correctChannel.id,
                3
            );

            await customAuthUser.user?.setRoles([authUserRole]);

            const targetUser = await User.create(await generateUserData());
            const roleForPayload = await createRole(
                ['auth:admin:user_role'],
                wrongChannel.id,
                5
            );
            const payload = {
                role_ref_names: roleForPayload.ref_name
            };

            const response = await customAuthUser.agent
                .post(`${API_BASE_URL}/${targetUser!.id}`)
                .set(createAuthHeaders(customAuthUser.accessToken!, customAuthUser.apiKey!))
                .send(payload)
                .expect('Content-Type', /json/)
                .expect(403);

            expect(response.body).toEqual({
                message: `Role ref names ${roleForPayload.ref_name} do not belong to your channel and cannot be assigned`
            });

            await forceDeleteInstances([
                customAuthUser.user!,
                authUserRole,
                targetUser,
                roleForPayload,
                wrongChannel,
                correctChannel
            ]);
        });

        it('should return 403 when authorized user lacks required permissions', async () => {
            const targetUser = await User.create(await generateUserData());
            // Make target role to have low level than the auth user role, so auth user will be able to update this
            // targetRole will be in wrong channel to mock error
            const roleForPayload = await createRole(
                ['auth:admin:user_role'],
                undefined,
                5
            );
            const payload = {
                role_ref_names: roleForPayload.ref_name
            };

            const response = await userWithNoPermissionsAuth.agent
                .post(`${API_BASE_URL}/${targetUser!.id}`)
                .set(createAuthHeaders(userWithNoPermissionsAuth.accessToken!, userWithNoPermissionsAuth.apiKey!))
                .send(payload)
                .expect('Content-Type', /json/)
                .expect(403);

            expect(response.body).toEqual({
                message:
                    'You do not have the required permissions to perform this action'
            });

            await forceDeleteInstances([targetUser, roleForPayload]);
        });
    });

    describe('PUT /api/user-role/user/:user_id', () => {
        it(`should return 200 with roles of the user if authorized user has required permissions`, async () => {
            const targetUser = await User.create(await generateUserData());
            const roleForPayload = await createRole(['auth:admin:role_policy']);
            const payload = {
                role_ref_names: roleForPayload.ref_name
            };

            const response = await superadminAuth.agent
                .put(`${API_BASE_URL}/${targetUser!.id}`)
                .set(createAuthHeaders(superadminAuth.accessToken!, superadminAuth.apiKey!))
                .send(payload)
                .expect('Content-Type', /json/)
                .expect(200);

            expect(Array.isArray(response.body)).toBe(true);

            // Make sure that the role attached to the target user must match the ID for roleForPayload
            expect(response.body[0].id).toEqual(roleForPayload.id);

            await forceDeleteInstances([targetUser, roleForPayload]);
        });

        it('should return 404 with non-existent user ID', async () => {
            const roleForPayload = await createRole(['auth:admin:role_policy']);
            const payload = {
                role_ref_names: roleForPayload.ref_name
            };

            const response = await superadminAuth.agent
                .put(`${API_BASE_URL}/${NON_EXISTENT_USER_ID}`)
                .set(createAuthHeaders(superadminAuth.accessToken!, superadminAuth.apiKey!))
                .send(payload)
                .expect('Content-Type', /json/)
                .expect(404);

            expect(response.body).toEqual({
                message: 'User not found'
            });

            await forceDeleteInstances([roleForPayload]);
        });

        it('should return 404 when the payload for role_ids does not exist', async () => {
            const targetUser = await User.create(await generateUserData());
            const payload = {
                role_ref_names: NON_EXISTENT_ROLE_REF_NAME
            };

            const response = await superadminAuth.agent
                .put(`${API_BASE_URL}/${targetUser!.id}`)
                .set(createAuthHeaders(superadminAuth.accessToken!, superadminAuth.apiKey!))
                .send(payload)
                .expect('Content-Type', /json/)
                .expect(404);

            expect(response.body).toEqual({
                message: `Role ref names ${NON_EXISTENT_ROLE_REF_NAME} do not exist`
            });

            await forceDeleteInstances([targetUser]);
        });

        it('should return 403 when authorized user is adding permissions to a role with higher or equal level to theirs', async () => {
            const customAuthUser: IAuth = await createAuthUser();
            const authUserRole = await createRole(
                ['auth:admin:user_role'],
                undefined,
                5
            );

            await customAuthUser.user?.setRoles([authUserRole]);

            const targetUser = await User.create(await generateUserData());
            // Role level for payload must be highter than the auth user's role assigned to them to mock auth user assigning role higher than theirs to target user
            const roleForPayload = await createRole(
                ['auth:admin:user_role'],
                undefined,
                3
            );
            const payload = {
                role_ref_names: roleForPayload.ref_name
            };

            const response = await customAuthUser.agent
                .put(`${API_BASE_URL}/${targetUser!.id}`)
                .set(createAuthHeaders(customAuthUser.accessToken!, customAuthUser.apiKey!))
                .send(payload)
                .expect('Content-Type', /json/)
                .expect(403);

            // replaceUserRoles gates on User.level privilege (isMorePrivileged), not
            // Role "level" — both users here default to 'member'.
            expect(response.body).toEqual({
                message:
                    'You can only assign roles to users with a lower privilege level than yourself'
            });

            await forceDeleteInstances([
                customAuthUser.user!,
                authUserRole,
                targetUser,
                roleForPayload
            ]);
        });

        it("should return 403 when authorized user's role is channel-based and the role being assigned is from different channel", async () => {
            const correctChannel = await Channel.create(generateChannelData());
            // Must outrank targetUser (member) so the privilege check passes and
            // the channel check below is actually what's being exercised.
            const customAuthUser: IAuth = await createAuthUser(
                correctChannel.api_key,
                UserLevelType.superadmin
            );
            const wrongChannel = await Channel.create(generateChannelData());
            const authUserRole = await createRole(
                ['auth:admin:user_role'],
                correctChannel.id,
                3
            );

            await customAuthUser.user?.setRoles([authUserRole]);

            const targetUser = await User.create(await generateUserData());
            const roleForPayload = await createRole(
                ['auth:admin:user_role'],
                wrongChannel.id,
                5
            );
            const payload = {
                role_ref_names: roleForPayload.ref_name
            };

            const response = await customAuthUser.agent
                .put(`${API_BASE_URL}/${targetUser!.id}`)
                .set(createAuthHeaders(customAuthUser.accessToken!, customAuthUser.apiKey!))
                .send(payload)
                .expect('Content-Type', /json/)
                .expect(403);

            expect(response.body).toEqual({
                message: `Role ref names ${roleForPayload.ref_name} do not belong to your channel and cannot be replaced`
            });

            await forceDeleteInstances([
                customAuthUser.user!,
                correctChannel,
                wrongChannel,
                authUserRole,
                targetUser,
                roleForPayload
            ]);
        });

        it('should return 403 when trying to delete user with superadmin username', async () => {
            const targetUser = await User.findOne({
                where: { username: 'superadmin' }
            });
            // Make target role to have low level than the auth user role, so auth user will be able to update this
            // targetRole will be in wrong channel to mock error
            const roleForPayload = await createRole(
                ['auth:admin:user_role'],
                undefined,
                5
            );
            const payload = {
                role_ref_names: roleForPayload.ref_name
            };

            const response = await superadminAuth.agent
                .put(`${API_BASE_URL}/${targetUser!.id}`)
                .set(createAuthHeaders(superadminAuth.accessToken!, superadminAuth.apiKey!))
                .send(payload)
                .expect('Content-Type', /json/)
                .expect(403);

            expect(response.body).toEqual({
                message: "Superadmin's roles cannot be updated"
            });

            await forceDeleteInstances([roleForPayload]);
        });

        it('should return 403 when authorized user lacks required permissions', async () => {
            const targetUser = await User.create(await generateUserData());
            // Make target role to have low level than the auth user role, so auth user will be able to update this
            // targetRole will be in wrong channel to mock error
            const roleForPayload = await createRole(
                ['auth:admin:user_role'],
                undefined,
                5
            );
            const payload = {
                role_ref_names: roleForPayload.ref_name
            };

            const response = await userWithNoPermissionsAuth.agent
                .put(`${API_BASE_URL}/${targetUser!.id}`)
                .set(createAuthHeaders(userWithNoPermissionsAuth.accessToken!, userWithNoPermissionsAuth.apiKey!))
                .send(payload)
                .expect('Content-Type', /json/)
                .expect(403);

            expect(response.body).toEqual({
                message:
                    'You do not have the required permissions to perform this action'
            });

            await forceDeleteInstances([targetUser, roleForPayload]);
        });
    });

    describe('DELETE /api/user-role/user/:user_id', () => {
        it(`should return 200 with success message`, async () => {
            const targetUser = await User.create(await generateUserData());
            const targetUserPermission = await Permission.create(
                await generatePermissionData()
            );
            const targetUserRole = await createRole([
                targetUserPermission.ref_name
            ]);

            await targetUser.setRoles([targetUserRole]);

            const payload = {
                role_ref_names: targetUserRole.ref_name
            };

            const response = await superadminAuth.agent
                .delete(`${API_BASE_URL}/${targetUser!.id}`)
                .set(createAuthHeaders(superadminAuth.accessToken!, superadminAuth.apiKey!))
                .send(payload)
                .expect('Content-Type', /json/)
                .expect(200);

            // destroyUserRole returns the user's remaining roles (flat array), not
            // a {message} envelope — empty here since we removed the only role.
            expect(response.body).toEqual([]);

            await forceDeleteInstances([
                targetUser,
                targetUserPermission,
                targetUserRole
            ]);
        });

        it('should return 404 with non-existent user ID', async () => {
            const roleForPayload = await createRole(['auth:admin:role_policy']);
            const payload = {
                role_ref_names: roleForPayload.ref_name
            };

            const response = await superadminAuth.agent
                .delete(`${API_BASE_URL}/${NON_EXISTENT_USER_ID}`)
                .set(createAuthHeaders(superadminAuth.accessToken!, superadminAuth.apiKey!))
                .send(payload)
                .expect('Content-Type', /json/)
                .expect(404);

            expect(response.body).toEqual({
                message: 'User not found'
            });

            await forceDeleteInstances([roleForPayload]);
        });

        it('should return 403 when trying to delete user with username superadmin', async () => {
            const targetUser = await User.findOne({
                where: { username: 'superadmin' }
            });
            const roleForPayload = await createRole(['auth:admin:role_policy']);
            const payload = {
                role_ref_names: roleForPayload.ref_name
            };

            const response = await superadminAuth.agent
                .delete(`${API_BASE_URL}/${targetUser?.id}`)
                .set(createAuthHeaders(superadminAuth.accessToken!, superadminAuth.apiKey!))
                .send(payload)
                .expect('Content-Type', /json/)
                .expect(403);

            expect(response.body).toEqual({
                message: "Superadmin's roles cannot be deleted"
            });

            await forceDeleteInstances([roleForPayload]);
        });

        it('should return 404 when the payload for role_ids does not exist', async () => {
            const targetUser = await User.create(await generateUserData());
            const payload = {
                role_ref_names: NON_EXISTENT_ROLE_REF_NAME
            };

            const response = await superadminAuth.agent
                .delete(`${API_BASE_URL}/${targetUser!.id}`)
                .set(createAuthHeaders(superadminAuth.accessToken!, superadminAuth.apiKey!))
                .send(payload)
                .expect('Content-Type', /json/)
                .expect(404);

            expect(response.body).toEqual({
                message: `Role ref names ${NON_EXISTENT_ROLE_REF_NAME} do not exist`
            });

            await forceDeleteInstances([targetUser]);
        });

        it('should return 403 when authorized user is adding permissions to a role with higher or equal level to theirs', async () => {
            const customAuthUser: IAuth = await createAuthUser();
            const authUserRole = await createRole(
                ['auth:admin:user_role'],
                undefined,
                5
            );

            await customAuthUser.user?.setRoles([authUserRole]);

            const targetUser = await User.create(await generateUserData());
            // Role level for payload must be highter than the auth user's role assigned to them to mock auth user assigning role higher than theirs to target user
            const roleForPayload = await createRole(
                ['auth:admin:user_role'],
                undefined,
                3
            );
            const payload = {
                role_ref_names: roleForPayload.ref_name
            };

            const response = await customAuthUser.agent
                .delete(`${API_BASE_URL}/${targetUser!.id}`)
                .set(createAuthHeaders(customAuthUser.accessToken!, customAuthUser.apiKey!))
                .send(payload)
                .expect('Content-Type', /json/)
                .expect(403);

            // destroyUserRole gates on User.level privilege (isMorePrivileged), not
            // Role "level" — both users here default to 'member'.
            expect(response.body).toEqual({
                message:
                    'You can only assign roles to users with a lower privilege level than yourself'
            });

            await forceDeleteInstances([
                customAuthUser.user!,
                authUserRole,
                targetUser,
                roleForPayload
            ]);
        });

        it("should return 403 when authorized user's role is channel-based and the role being assigned is from different channel", async () => {
            const correctChannel = await Channel.create(generateChannelData());
            // Must outrank targetUser (member) so the privilege check passes and
            // the channel check below is actually what's being exercised.
            const customAuthUser: IAuth = await createAuthUser(
                correctChannel.api_key,
                UserLevelType.superadmin
            );
            const wrongChannel = await Channel.create(generateChannelData());
            const authUserRole = await createRole(
                ['auth:admin:user_role'],
                correctChannel.id,
                3
            );

            await customAuthUser.user?.setRoles([authUserRole]);

            const targetUser = await User.create(await generateUserData());
            const roleForPayload = await createRole(
                ['auth:admin:user_role'],
                wrongChannel.id,
                5
            );
            const payload = {
                role_ref_names: roleForPayload.ref_name
            };

            const response = await customAuthUser.agent
                .delete(`${API_BASE_URL}/${targetUser!.id}`)
                .set(createAuthHeaders(customAuthUser.accessToken!, customAuthUser.apiKey!))
                .send(payload)
                .expect('Content-Type', /json/)
                .expect(403);

            expect(response.body).toEqual({
                message: `Role ref names ${roleForPayload.ref_name} do not belong to your channel and cannot be deleted`
            });

            await forceDeleteInstances([
                customAuthUser.user!,
                correctChannel,
                wrongChannel,
                authUserRole,
                targetUser,
                roleForPayload
            ]);
        });
    });
});
