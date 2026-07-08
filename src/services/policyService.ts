import { WhereOptions } from "sequelize";
import Policy, { IPolicy } from "../database/models/Policy";
import User from "../database/models/User";
import { AppError } from "../middlewares/errorHandler";

/* -------------------------------------------------------------------------- */
/*       find policies that do not exist and return an array of ref_name      */
/* -------------------------------------------------------------------------- */
export async function findMissingPolicies(
    policyRefNames: string | string[]
): Promise<string[]> {
    const refNamesToCheck = Array.isArray(policyRefNames)
        ? policyRefNames
        : [policyRefNames];

    const existingPolicies = await Policy.findAll({
        where: {
            ref_name: refNamesToCheck,
        },
        attributes: ["ref_name"],
    });

    const existingPolicyRefNames = new Set(
        existingPolicies.map((policy) => policy.ref_name)
    );

    return refNamesToCheck.filter(
        (refName) => !existingPolicyRefNames.has(refName)
    );
}

/* -------------------------------------------------------------------------- */
/*                 get policy ref_names not attached to the user              */
/* -------------------------------------------------------------------------- */
export const getMissingUserPolicies = async (
    user: User,
    policyRefNames: string | string[],
    roleScope: 'global' | 'channel' | '*',
    channelId?: number
): Promise<string[]> => {
    const requestedRefNames = Array.isArray(policyRefNames)
        ? policyRefNames
        : [policyRefNames];

    const userPolicies = await getUserPolicies(
        user,
        roleScope,
        channelId
    );

    const userPolicyRefNames = new Set(
        userPolicies.map(policy => policy.ref_name)
    );

    return requestedRefNames.filter(
        refName => !userPolicyRefNames.has(refName)
    );
};

export const userHasPolicies = async (
    user: User,
    policyRefNames: string | string[],
    roleScope: 'global' | 'channel' | '*',
    channelId?: number
): Promise<boolean> => {
    const policies = await getUserPolicies(user, roleScope, channelId);

    const requiredPolicies = Array.isArray(policyRefNames)
        ? policyRefNames
        : [policyRefNames];

    return requiredPolicies.every(refName =>
        policies.some((policy: IPolicy) => {
            if (policy.ref_name !== refName) {
                return false;
            }
        })
    );
};

export const userHasAnyPolicy = async (
    user: User,
    policyRefNames: string | string[],
    roleScope: 'global' | 'channel' | '*',
    channelId?: number
): Promise<boolean> => {
    const policies = await getUserPolicies(user, roleScope, channelId);

    const requiredPolicies = Array.isArray(policyRefNames)
        ? policyRefNames
        : [policyRefNames];

    return requiredPolicies.some(refName =>
        policies.some((policy: IPolicy) => {
            if (policy.ref_name !== refName) {
                return false;
            }
        })
    );
};

export const getUserPolicies = async (
    user: User,
    roleScope: 'global' | 'channel' | '*',
    channelId?: number
): Promise<IPolicy[]> => {
    if (roleScope === 'channel' && !channelId) {
        throw new AppError('channelId is required when roleScope is channel', 400);
    }

    const whereOptions: WhereOptions = {};

    if (roleScope !== '*') {
        whereOptions.scope = roleScope;
    }

    if (roleScope === 'channel') {
        whereOptions.channel_id = channelId!;
    }

    const roles = await user.getRoles({
        where: whereOptions,
        include: [
            {
                model: Policy,
                through: { attributes: [] }
            }
        ]
    });

    const policiesSet = new Set<IPolicy>();

    roles.forEach(role => {
        role.policies.forEach((policy: IPolicy) => {
            policiesSet.add(policy);
        });
    });

    return Array.from(policiesSet);
}

/* -------------------------------------------------------------------------- */
/*           returns an array of ref_names where policy is_system is true     */
/* -------------------------------------------------------------------------- */
export async function findSystemPolicies(
    policyRefNames: string | string[]
): Promise<string[]> {
    const refNamesToCheck = Array.isArray(policyRefNames)
        ? policyRefNames
        : [policyRefNames];

    const policies = await Policy.findAll({
        where: {
            ref_name: refNamesToCheck,
            is_system: true,
        },
        attributes: ["ref_name"],
    });

    return policies.map((policy) => policy.ref_name);
}
