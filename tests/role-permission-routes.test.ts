import { describe, beforeAll, expect, afterAll, it } from '@jest/globals';
import Channel from '../src/database/models/Channel';
import Policy from '../src/database/models/Policy';
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

// This file previously tested a direct Role<->Permission association
// (`/api/role-permission/role`, `permission_ids` payloads) that no longer exists —
// the RBAC model is Role -> Policy -> Permission, and the real route is
// `/api/role-policy/role/:role_id` with `{ policy_ref_names }` payloads (see
// src/controllers/rolePolicyController.ts). Rewritten to match. "Role level"
// privilege comparisons were also removed/never existed on Role (no level column,
// no such check in rolePolicyController) — the equivalent real protection is the
// "caller must already hold what they're assigning" check, which the tests below
// exercise instead. See ENGINEERING_AUDIT.md.
describe('Role Policy Routes', () => {
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
    const NON_EXISTENT_POLICY_REF_NAME = 'non_existent_policy_ref_name';
    const API_BASE_URL = '/api/role-policy/role';

    const generatePolicyData = () => ({
        name: `Policy Test ${Date.now()}`,
        ref_name: `policy_test_${Date.now()}_${Math.floor(Math.random() * 100000)}`
    });

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

    describe('GET /api/role-policy/role/:role_id', () => {
        it(`should return 200 with role's policies for authorized user`, async () => {
            const targetRole = await createRole(['auth:admin:role_policy']);

            const response = await superadminAuth
                .agent!.get(`${API_BASE_URL}/${targetRole!.id}`)
                .set(createAuthHeaders(superadminAuth.accessToken!, superadminAuth.apiKey!))
                .expect('Content-Type', /json/)
                .expect(200);

            expect(Array.isArray(response.body)).toBe(true);

            await targetRole?.destroy({ force: true });
        });

        it('should return 404 when role is non-existent', async () => {
            const response = await superadminAuth
                .agent!.get(`${API_BASE_URL}/${NON_EXISTENT_ROLE_ID}`)
                .set(createAuthHeaders(superadminAuth.accessToken!, superadminAuth.apiKey!))
                .expect('Content-Type', /json/)
                .expect(404);

            expect(response.body).toEqual({
                message: 'Role not found'
            });
        });

        it('should return 403 when user lacks required permissions', async () => {
            const targetRole = await createRole(['auth:admin:role_policy']);

            const response = await userWithNoPermissionsAuth
                .agent!.get(`${API_BASE_URL}/${targetRole!.id}`)
                .set(createAuthHeaders(userWithNoPermissionsAuth.accessToken!, userWithNoPermissionsAuth.apiKey!))
                .expect('Content-Type', /json/)
                .expect(403);

            expect(response.body).toEqual({
                message:
                    'You do not have the required permissions to perform this action'
            });

            await targetRole?.destroy({ force: true });
        });

        it('should return 403 when authorized user is viewing a role outside their channel', async () => {
            const correctChannel = await Channel.create(
                await generateChannelData()
            );
            const customAuth: IAuth = await createAuthUser(
                correctChannel.api_key
            );
            const wrongChannel = await Channel.create(
                await generateChannelData()
            );
            const role = await createRole(
                ['auth:admin:role_policy'],
                correctChannel.id
            );

            await customAuth.user?.setRoles([role]);

            const targetRole = await createRole(
                ['auth:admin:role_policy'],
                wrongChannel.id
            );

            const response = await customAuth
                .agent!.get(`${API_BASE_URL}/${targetRole!.id}`)
                .set(createAuthHeaders(customAuth.accessToken!, customAuth.apiKey!))
                .expect('Content-Type', /json/)
                .expect(403);

            expect(response.body).toEqual({
                message: "Unauthorized to view this role's permissions"
            });

            await forceDeleteInstances([
                targetRole,
                role,
                correctChannel,
                wrongChannel,
                customAuth.user!
            ]);
        });
    });

    describe('POST /api/role-policy/role/:role_id', () => {
        it(`should return 200 with policies attached to the role`, async () => {
            const policyForPayload = await Policy.create(generatePolicyData());
            const payload = {
                policy_ref_names: policyForPayload.ref_name
            };
            const targetRole = await createRole(['auth:admin:role_policy']);

            const response = await superadminAuth
                .agent!.post(`${API_BASE_URL}/${targetRole!.id}`)
                .set(createAuthHeaders(superadminAuth.accessToken!, superadminAuth.apiKey!))
                .send(payload)
                .expect('Content-Type', /json/)
                .expect(200);

            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body[0].ref_name).toEqual(policyForPayload.ref_name);

            await forceDeleteInstances([policyForPayload, targetRole]);
        });

        it('should return 404 with non-existent role', async () => {
            const policyForPayload = await Policy.create(generatePolicyData());
            const payload = {
                policy_ref_names: policyForPayload.ref_name
            };

            const response = await superadminAuth
                .agent!.post(`${API_BASE_URL}/${NON_EXISTENT_ROLE_ID}`)
                .set(createAuthHeaders(superadminAuth.accessToken!, superadminAuth.apiKey!))
                .send(payload)
                .expect('Content-Type', /json/)
                .expect(404);

            expect(response.body).toEqual({
                message: 'Role not found'
            });

            await forceDeleteInstances([policyForPayload]);
        });

        it('should return 404 when the payload for policy_ref_names does not exist', async () => {
            const targetRole = await createRole(['auth:admin:role_policy']);
            const payload = {
                policy_ref_names: NON_EXISTENT_POLICY_REF_NAME
            };

            const response = await superadminAuth.agent
                .post(`${API_BASE_URL}/${targetRole!.id}`)
                .set(createAuthHeaders(superadminAuth.accessToken!, superadminAuth.apiKey!))
                .send(payload)
                .expect('Content-Type', /json/)
                .expect(404);

            expect(response.body).toEqual({
                message: `Policy ref names ${NON_EXISTENT_POLICY_REF_NAME} do not exist`
            });

            await forceDeleteInstances([targetRole]);
        });

        it('should return 404 when authorized user tries to assign a policy they do not hold themselves', async () => {
            const customAuth: IAuth = await createAuthUser();
            const authUserRole = await createRole(['auth:admin:role_policy']);

            await customAuth.user?.setRoles([authUserRole]);

            // A policy the auth user was never granted, unrelated to authUserRole.
            const policyForPayload = await Policy.create(generatePolicyData());
            const payload = {
                policy_ref_names: policyForPayload.ref_name
            };
            const targetRole = await createRole(['auth:admin:role_policy']);

            const response = await customAuth.agent
                .post(`${API_BASE_URL}/${targetRole!.id}`)
                .set(createAuthHeaders(customAuth.accessToken!, customAuth.apiKey!))
                .send(payload)
                .expect('Content-Type', /json/)
                .expect(404);

            expect(response.body).toEqual({
                message: `Policy ref names ${policyForPayload.ref_name} are not assignable by the auth user`
            });

            await forceDeleteInstances([
                policyForPayload,
                targetRole,
                customAuth.user!,
                authUserRole
            ]);
        });

        it("should return 403 when authorized user's role is channel-based and the target role is from different channel", async () => {
            const correctChannel = await Channel.create(generateChannelData());
            const customAuth: IAuth = await createAuthUser(
                correctChannel.api_key
            );
            const wrongChannel = await Channel.create(generateChannelData());
            const authUserRole = await createRole(
                ['auth:admin:role_policy'],
                correctChannel.id
            );

            await customAuth.user?.setRoles([authUserRole]);

            const policyForPayload = await Policy.create(generatePolicyData());
            const payload = {
                policy_ref_names: policyForPayload.ref_name
            };

            // Target role belongs to a different channel than the auth user's —
            // this check fires before payload validation, so the mismatch alone
            // is enough to trigger it.
            const targetRole = await createRole(
                ['auth:admin:role_policy'],
                wrongChannel.id
            );

            const response = await customAuth.agent
                .post(`${API_BASE_URL}/${targetRole!.id}`)
                .set(createAuthHeaders(customAuth.accessToken!, customAuth.apiKey!))
                .send(payload)
                .expect('Content-Type', /json/)
                .expect(403);

            expect(response.body).toEqual({
                message: 'Unauthorized to add policies to this role'
            });

            await forceDeleteInstances([
                customAuth.user!,
                correctChannel,
                wrongChannel,
                authUserRole,
                policyForPayload,
                targetRole
            ]);
        });

        it('should return 403 when authorized user lacks required permissions', async () => {
            const policyForPayload = await Policy.create(generatePolicyData());
            const payload = {
                policy_ref_names: policyForPayload.ref_name
            };
            const targetRole = await createRole(['auth:admin:role_policy']);

            const response = await userWithNoPermissionsAuth.agent
                .post(`${API_BASE_URL}/${targetRole!.id}`)
                .set(createAuthHeaders(userWithNoPermissionsAuth.accessToken!, userWithNoPermissionsAuth.apiKey!))
                .send(payload)
                .expect('Content-Type', /json/)
                .expect(403);

            expect(response.body).toEqual({
                message:
                    'You do not have the required permissions to perform this action'
            });

            await forceDeleteInstances([policyForPayload, targetRole]);
        });
    });

    describe('PUT /api/role-policy/role/:role_id', () => {
        it(`should return 200 with the new set of policies attached to the role`, async () => {
            const policyForPayload = await Policy.create(generatePolicyData());
            const payload = {
                policy_ref_names: policyForPayload.ref_name
            };
            const targetRole = await createRole(['auth:admin:role_policy']);

            const response = await superadminAuth.agent
                .put(`${API_BASE_URL}/${targetRole!.id}`)
                .set(createAuthHeaders(superadminAuth.accessToken!, superadminAuth.apiKey!))
                .send(payload)
                .expect('Content-Type', /json/)
                .expect(200);

            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body[0].ref_name).toEqual(policyForPayload.ref_name);

            await forceDeleteInstances([policyForPayload, targetRole]);
        });

        it('should return 404 with non-existent role', async () => {
            const policyForPayload = await Policy.create(generatePolicyData());
            const payload = {
                policy_ref_names: policyForPayload.ref_name
            };

            const response = await superadminAuth.agent
                .put(`${API_BASE_URL}/${NON_EXISTENT_ROLE_ID}`)
                .set(createAuthHeaders(superadminAuth.accessToken!, superadminAuth.apiKey!))
                .send(payload)
                .expect('Content-Type', /json/)
                .expect(404);

            expect(response.body).toEqual({
                message: 'Role not found'
            });

            await forceDeleteInstances([policyForPayload]);
        });

        it('should return 404 when the payload for policy_ref_names does not exist', async () => {
            const targetRole = await createRole(['auth:admin:role_policy']);

            const payload = {
                policy_ref_names: NON_EXISTENT_POLICY_REF_NAME
            };

            const response = await superadminAuth.agent
                .put(`${API_BASE_URL}/${targetRole!.id}`)
                .set(createAuthHeaders(superadminAuth.accessToken!, superadminAuth.apiKey!))
                .send(payload)
                .expect('Content-Type', /json/)
                .expect(404);

            expect(response.body).toEqual({
                message: `Policy ref names ${NON_EXISTENT_POLICY_REF_NAME} do not exist`
            });

            await forceDeleteInstances([targetRole]);
        });

        it('should return 404 when authorized user tries to replace with a policy they do not hold themselves', async () => {
            const customAuth: IAuth = await createAuthUser();
            const authUserRole = await createRole(['auth:admin:role_policy']);

            await customAuth.user?.setRoles([authUserRole]);

            const policyForPayload = await Policy.create(generatePolicyData());
            const payload = {
                policy_ref_names: policyForPayload.ref_name
            };
            const targetRole = await createRole(['auth:admin:role_policy']);

            const response = await customAuth.agent
                .put(`${API_BASE_URL}/${targetRole!.id}`)
                .set(createAuthHeaders(customAuth.accessToken!, customAuth.apiKey!))
                .send(payload)
                .expect('Content-Type', /json/)
                .expect(404);

            expect(response.body).toEqual({
                message: `Policy ref names ${policyForPayload.ref_name} are not assignable by the auth user`
            });

            await forceDeleteInstances([
                policyForPayload,
                targetRole,
                customAuth.user!,
                authUserRole
            ]);
        });

        it("should return 403 when authorized user's role is channel-based and the target role is from different channel", async () => {
            const correctChannel = await Channel.create(generateChannelData());
            const customAuth: IAuth = await createAuthUser(
                correctChannel.api_key
            );
            const wrongChannel = await Channel.create(generateChannelData());
            const authUserRole = await createRole(
                ['auth:admin:role_policy'],
                correctChannel.id
            );

            await customAuth.user?.setRoles([authUserRole]);

            const policyForPayload = await Policy.create(generatePolicyData());
            const payload = {
                policy_ref_names: policyForPayload.ref_name
            };

            const targetRole = await createRole(
                ['auth:admin:role_policy'],
                wrongChannel.id
            );

            const response = await customAuth.agent
                .put(`${API_BASE_URL}/${targetRole!.id}`)
                .set(createAuthHeaders(customAuth.accessToken!, customAuth.apiKey!))
                .send(payload)
                .expect('Content-Type', /json/)
                .expect(403);

            expect(response.body).toEqual({
                message: 'Unauthorized to replace permissions to this role'
            });

            await forceDeleteInstances([
                customAuth.user!,
                correctChannel,
                wrongChannel,
                authUserRole,
                policyForPayload,
                targetRole
            ]);
        });

        it('should return 403 when authorized user lacks required permissions', async () => {
            const policyForPayload = await Policy.create(generatePolicyData());
            const payload = {
                policy_ref_names: policyForPayload.ref_name
            };
            const targetRole = await createRole(['auth:admin:role_policy']);

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

            await forceDeleteInstances([policyForPayload, targetRole]);
        });
    });

    describe('DELETE /api/role-policy/role/:role_id', () => {
        it(`should return 200 with a success message`, async () => {
            const policyForPayload = await Policy.create(generatePolicyData());
            const payload = {
                policy_ref_names: policyForPayload.ref_name
            };
            const targetRole = await createRole(['auth:admin:role_policy']);
            await targetRole.addPolicies([policyForPayload]);

            const response = await superadminAuth.agent
                .delete(`${API_BASE_URL}/${targetRole!.id}`)
                .set(createAuthHeaders(superadminAuth.accessToken!, superadminAuth.apiKey!))
                .send(payload)
                .expect('Content-Type', /json/)
                .expect(200);

            expect(response.body).toEqual({
                message: 'Role policy successfully deleted'
            });

            await forceDeleteInstances([policyForPayload, targetRole]);
        });

        it('should return 404 with non-existent role', async () => {
            const policyForPayload = await Policy.create(generatePolicyData());
            const payload = {
                policy_ref_names: policyForPayload.ref_name
            };

            const response = await superadminAuth.agent
                .delete(`${API_BASE_URL}/${NON_EXISTENT_ROLE_ID}`)
                .set(createAuthHeaders(superadminAuth.accessToken!, superadminAuth.apiKey!))
                .send(payload)
                .expect('Content-Type', /json/)
                .expect(404);

            expect(response.body).toEqual({
                message: 'Role not found'
            });

            await forceDeleteInstances([policyForPayload]);
        });

        it('should return 404 when the payload for policy_ref_names does not exist', async () => {
            const payload = {
                policy_ref_names: NON_EXISTENT_POLICY_REF_NAME
            };
            const targetRole = await Role.create(generateRoleData());

            const response = await superadminAuth.agent
                .delete(`${API_BASE_URL}/${targetRole!.id}`)
                .set(createAuthHeaders(superadminAuth.accessToken!, superadminAuth.apiKey!))
                .send(payload)
                .expect('Content-Type', /json/)
                .expect(404);

            expect(response.body).toEqual({
                message: `Policy ref names ${NON_EXISTENT_POLICY_REF_NAME} do not exist`
            });

            await forceDeleteInstances([targetRole]);
        });

        it('should return 404 when authorized user tries to remove a policy they do not hold themselves', async () => {
            const customAuth: IAuth = await createAuthUser();
            const authUserRole = await createRole(['auth:admin:role_policy']);

            await customAuth.user?.setRoles([authUserRole]);

            const policyForPayload = await Policy.create(generatePolicyData());
            const payload = {
                policy_ref_names: policyForPayload.ref_name
            };
            const targetRole = await createRole(['auth:admin:role_policy']);
            await targetRole.addPolicies([policyForPayload]);

            const response = await customAuth.agent
                .delete(`${API_BASE_URL}/${targetRole!.id}`)
                .set(createAuthHeaders(customAuth.accessToken!, customAuth.apiKey!))
                .send(payload)
                .expect('Content-Type', /json/)
                .expect(404);

            expect(response.body).toEqual({
                message: `Policy ref names ${policyForPayload.ref_name} are not assignable by the auth user`
            });

            await forceDeleteInstances([
                policyForPayload,
                targetRole,
                customAuth.user!,
                authUserRole
            ]);
        });

        it("should return 403 when authorized user's role is channel-based and the target role is from different channel", async () => {
            const correctChannel = await Channel.create(generateChannelData());
            const customAuth: IAuth = await createAuthUser(
                correctChannel.api_key
            );
            const wrongChannel = await Channel.create(generateChannelData());
            const authUserRole = await createRole(
                ['auth:admin:role_policy'],
                correctChannel.id
            );

            await customAuth.user?.setRoles([authUserRole]);

            const policyForPayload = await Policy.create(generatePolicyData());
            const payload = {
                policy_ref_names: policyForPayload.ref_name
            };

            const targetRole = await createRole(
                ['auth:admin:role_policy'],
                wrongChannel.id
            );

            const response = await customAuth.agent
                .delete(`${API_BASE_URL}/${targetRole!.id}`)
                .set(createAuthHeaders(customAuth.accessToken!, customAuth.apiKey!))
                .send(payload)
                .expect('Content-Type', /json/)
                .expect(403);

            expect(response.body).toEqual({
                message: 'Unauthorized to delete permissions to this role'
            });

            await forceDeleteInstances([
                customAuth.user!,
                correctChannel,
                wrongChannel,
                authUserRole,
                policyForPayload,
                targetRole
            ]);
        });

        it('should return 403 when authorized user lacks required permissions', async () => {
            const policyForPayload = await Policy.create(generatePolicyData());
            const payload = {
                policy_ref_names: policyForPayload.ref_name
            };
            const targetRole = await createRole(['auth:admin:role_policy']);

            const response = await userWithNoPermissionsAuth.agent
                .delete(`${API_BASE_URL}/${targetRole!.id}`)
                .set(createAuthHeaders(userWithNoPermissionsAuth.accessToken!, userWithNoPermissionsAuth.apiKey!))
                .send(payload)
                .expect('Content-Type', /json/)
                .expect(403);

            expect(response.body).toEqual({
                message:
                    'You do not have the required permissions to perform this action'
            });

            await forceDeleteInstances([policyForPayload, targetRole]);
        });
    });
});
