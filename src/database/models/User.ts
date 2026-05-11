import {
    BelongsToManyAddAssociationMixin,
    BelongsToManyAddAssociationsMixin,
    BelongsToManyGetAssociationsMixin,
    BelongsToManyRemoveAssociationMixin,
    BelongsToManyRemoveAssociationsMixin,
    BelongsToSetAssociationMixin
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
import { UserStatusType } from '../../constants/enums';
import { AppError } from '../../middlewares/errorHandler';
import {
    getUserChannels,
    hasAccessToChannel
} from '../../services/channelService';
import {
    getUserPermissions,
    hasAnyPermissionLevel,
    userHasAccessToPermission,
    userHasAnyPermission
} from '../../services/permissionService';
import { isUserMorePrivilegedThan } from '../../services/roleService';
import Role from './Role';
import UserRole from './UserRole';
import hashPassword from '../../utils/hashPassword';
import RefreshToken from './RefreshToken';

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

    async hasAnyPermission(
        permissionRefNames: string | string[],
        permissionScope: 'channel' | 'global' = 'global',
        channelId?: number
    ) {
        return await userHasAnyPermission(
            this,
            permissionRefNames,
            permissionScope,
            channelId
        );
    }

    async isMorePrivilegedThan(userId: number) {
        return await isUserMorePrivilegedThan(this.id, userId);
    }

    async getChannels() {
        await getUserChannels(this.id);
    }

    async hasAccessToChannel(channelId: number) {
        await hasAccessToChannel(this.id, channelId);
    }

    async getPermissions(channelId?: number) {
        await getUserPermissions(this.id, channelId);
    }

    async hasAnyPermissionLevel(
        permissionRefNames: string | string[],
        permissionsScope: 'global' | 'channel',
        channelId?: number
    ): Promise<number | null> {
        return await hasAnyPermissionLevel(
            this,
            permissionRefNames,
            permissionsScope,
            channelId
        );
    }

    async hasAccessToPermission(
        permissionId: number,
        channelId?: number
    ): Promise<boolean> {
        return await userHasAccessToPermission(this, permissionId, channelId);
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
    @Default(false)
    @Column(DataType.BOOLEAN)
    is_superadmin: boolean;

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

    declare setRoles: BelongsToSetAssociationMixin<Role, number>;

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
    static preventAddingAnotherSuperadminUser(instance: User) {
        if (
            instance.is_superadmin
        ) {
            throw new AppError(
                'There can only be one superadmin user',
                403
            );
        }
    }

    @BeforeUpdate
    static preventSuperadminChangeUsername(instance: User) {
        const isSuperadmin = instance.previous('is_superadmin');

        if (
            isSuperadmin &&
            instance.changed('is_superadmin')
        ) {
            const usernameOriginalValue = instance.previous('username');
            instance.username = usernameOriginalValue;
        }
    }

    @BeforeUpdate
    static preventChangeIsSuperadmin(instance: User) {
        if (instance.changed('is_superadmin')) {
            const originalValue = instance.previous('is_superadmin');
            instance.is_superadmin = originalValue;
        }
    }

    @BeforeDestroy
    static preventDeleteSuperadmin(instance: User) {
        if (instance.is_superadmin) {
            throw new AppError(
                'Superadmin user cannot be deleted',
                403
            );
        }
    }
}
