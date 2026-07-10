import {
    BelongsToManyAddAssociationMixin,
    BelongsToManyAddAssociationsMixin,
    BelongsToManyGetAssociationsMixin,
    BelongsToManyRemoveAssociationMixin,
    BelongsToManyRemoveAssociationsMixin,
    BelongsToManySetAssociationsMixin,
    InferAttributes,
    InferCreationAttributes
} from 'sequelize';
import {
    AllowNull,
    AutoIncrement,
    BeforeDestroy,
    BeforeUpdate,
    BeforeValidate,
    BelongsToMany,
    Column,
    CreatedAt,
    DataType,
    Default,
    DefaultScope,
    DeletedAt,
    Model,
    PrimaryKey,
    Scopes,
    Table,
    UpdatedAt,
    HasMany,
    BeforeCreate
} from 'sequelize-typescript';
import { UserLevelType, UserStatusType } from '../../constants/enums';
import { AppError } from '../../middlewares/errorHandler';
import {
    getUserChannels,
    hasAccessToChannel
} from '../../services/channelService';
import {
    getMissingUserPermissions,
    getUserPermissions,
    userHasAnyPermission,
    userHasPermissions
} from '../../services/permissionService';
import Role from './Role';
import UserRole from './UserRole';
import hashPassword from '../../utils/hashPassword';
import RefreshToken from './RefreshToken';
import { isLevelMorePrivileged, isUserMorePrivileged } from '../../services/userService';
import { getMissingUserPolicies } from '../../services/policyService';
import { getMissingUserRoles } from '../../services/roleService';
import { RoleScopeFilter } from '../../types';

@Scopes(() => ({
    withRoles: {
        include: [Role]
    }
}))
@DefaultScope(() => ({
    attributes: {
        exclude: ['password']
    }
}))
@Table({
    tableName: 'users'
})
export default class User extends Model {
    // Custom functions
    getFullName() {
        return [this.first_name, this.last_name].join(' ');
    }

    async isMorePrivileged(user: User) {
        return await isUserMorePrivileged(this, user);
    }

    isMorePrivilegedThanLevel(level: UserLevelType): boolean {
        return isLevelMorePrivileged(this.level as UserLevelType, level);
    }

    async getChannels() {
        return await getUserChannels(this.id);
    }

    async hasAccessToChannel(channelId: number) {
        return await hasAccessToChannel(this.id, channelId);
    }

    async getPermissions(
        roleScope: RoleScopeFilter,
        channelId?: number
    ) {
        return await getUserPermissions(this, roleScope, channelId);
    }

    async getPermissionRefNames(
        roleScope: RoleScopeFilter,
        channelId?: number
    ) {
        const permissions = await this.getPermissions(
            roleScope,
            channelId
        );

        return [...new Set(
            permissions.map(p => p.ref_name).filter(Boolean)
        )];
    }

    isRootSuperadmin(): boolean {
        return this.level === 'root_superadmin';
    }

    isSuperadmin(): boolean {
        return this.level === 'superadmin';
    }

    async hasPermissions(
        permissionRefNames: string | string[],
        roleScope: RoleScopeFilter,
        channelId?: number
    ) {
        return await userHasPermissions(this, permissionRefNames, roleScope, channelId);
    }

    async hasAnyPermission(
        permissionRefNames: string | string[],
        roleScope: RoleScopeFilter,
        channelId?: number
    ) {
        return await userHasAnyPermission(this, permissionRefNames, roleScope, channelId);
    }

    async getMissingPolicies(
        policyRefNames: string | string[],
        roleScope: RoleScopeFilter,
        channelId?: number
    ) {
        return await getMissingUserPolicies(
            this,
            policyRefNames,
            roleScope,
            channelId
        );
    }

    async getMissingPermissions(
        permissionRefNames: string | string[],
        roleScope: RoleScopeFilter,
        channelId?: number
    ) {
        return await getMissingUserPermissions(
            this,
            permissionRefNames,
            roleScope,
            channelId
        );
    }

    async getMissingRoles(
        roleRefNames: string | string[],
        roleScope: RoleScopeFilter,
        channelId?: number
    ) {
        return await getMissingUserRoles(
            this,
            roleRefNames,
            roleScope,
            channelId
        );
    }


    // Columns
    @PrimaryKey
    @AutoIncrement
    @Column(DataType.INTEGER)
        id: number;

    @AllowNull(false)
    @Column(DataType.STRING)
        username: string;

    @AllowNull(false)
    @Column(DataType.STRING)
        email: string;

    @AllowNull(false)
    @Column(DataType.STRING)
        first_name: string;

    @AllowNull(false)
    @Column(DataType.STRING)
        last_name: string;

    @AllowNull(false)
    @Default('active')
    @Column(DataType.ENUM(...Object.values(UserStatusType)))
        status: string;

    @AllowNull(false)
    @Column(DataType.STRING)
        password: string;

    @AllowNull(false)
    @Default(UserLevelType.member)
    @Column(DataType.ENUM(...Object.values(UserLevelType)))
        level: string;

    @CreatedAt
        created_at: Date;

    @UpdatedAt
        updated_at: Date;

    @DeletedAt
        deleted_at: Date;

    // Associations
    @BelongsToMany(() => Role, () => UserRole)
        roles: Role[];

    @HasMany(() => RefreshToken, 'user_id')
        refreshTokens: RefreshToken[];
        
    // Mixins
    declare getRoles: BelongsToManyGetAssociationsMixin<Role>;

    declare setRoles: BelongsToManySetAssociationsMixin<Role, number>;

    declare addRoles: BelongsToManyAddAssociationsMixin<Role, number>;
    declare addRole: BelongsToManyAddAssociationMixin<Role, number>;

    declare removeRoles: BelongsToManyRemoveAssociationsMixin<Role, number>;
    declare removeRole: BelongsToManyRemoveAssociationMixin<Role, number>;

    // Hooks
    @BeforeValidate
    static hashPassword(instance: User) {
        if (instance.password)
            instance.password = hashPassword(instance.password);
    }

    @BeforeCreate
    static preventAddingAnotherRootSuperadminUser(instance: User) {
        if (
            instance.isRootSuperadmin()
        ) {
            throw new AppError(
                'There can only be one root superadmin user',
                403
            );
        }
    }

    @BeforeUpdate
    static preventRootSuperadminChangeUsername(instance: User) {
        const isRootSuperadmin = instance.previous('level') === 'root_superadmin';

        if (
            isRootSuperadmin &&
            instance.changed('level')
        ) {
            const usernameOriginalValue = instance.previous('username');
            instance.username = usernameOriginalValue;
        }
    }

    @BeforeDestroy
    static preventDeleteRootSuperadmin(instance: User) {
        if (instance.isRootSuperadmin()) {
            throw new AppError(
                'Root superadmin user cannot be deleted',
                403
            );
        }
    }
}

export type IUser = InferAttributes<User>;
export type IUserCreation = InferCreationAttributes<User>;
