import { WhereOptions } from "sequelize";
import Policy, { IPolicy } from "../database/models/Policy";
import User from "../database/models/User";
import { AppError } from "../middlewares/errorHandler";

export async function findMissingPolicyIds(
    policyIds: number | number[] | string | string[]
): Promise<(string | number)[]> {
    const idsToCheck = Array.isArray(policyIds) ? policyIds : [policyIds];

    const existinPolicies = await Policy.findAll({
        where: {
            id: idsToCheck
        },
        attributes: ['id']
    });

    const existingPolicyIds = new Set(existinPolicies.map((role) => role.id));
    return idsToCheck.filter((id) => !existingPolicyIds.has(Number(id)));
}

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