import bcrypt from 'bcrypt';
import {
    BelongsToManyGetAssociationsMixin,
    BelongsToSetAssociationMixin,
    HasManyAddAssociationsMixin,
    HasManyRemoveAssociationsMixin
} from 'sequelize';
import {
    AllowNull,
    AutoIncrement,
    BeforeUpdate,
    BeforeValidate,
    BelongsToMany,
    Column,
    CreatedAt,
    DataType,
    Default,
    DeletedAt,
    Model,
    PrimaryKey,
    Scopes,
    Table,
    UpdatedAt
} from 'sequelize-typescript';
import { UserStatusType } from '../../constants/enums';
import { getUserChannels, hasAccessToChannel } from '../../services/channelService';
import { checkPermissionLevel, getUserPermissions, userHasAccessToPermission, userHasPermissions } from '../../services/permissionService';
import { isUserMorePrivilegedThan } from '../../services/roleService';
import Role from './Role';
import UserRole from './UserRole';

@Scopes(() => ({
    withRoles: {
        include: [Role]
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

    async hasPermissions(
        permissionRefNames: string | string[],
        permissionScope: 'channel' | 'global' = 'global',
        channelId?: number
    ) {
        return await userHasPermissions(this, permissionRefNames, permissionScope, channelId);
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

    async getPermissions(channelId?: number){
        await getUserPermissions(
            this.id,
            channelId
        );
    }

    async checkPermissionLevel(
        permissionRefNames: string | string[], 
        permissionsScope: 'global' | 'channel', 
        channelId?: number
    )
    {
        await checkPermissionLevel(
            this,
            permissionRefNames,
            permissionsScope,
            channelId
        )
    }

    async hasAccessToPermission(    
        permissionId: number,
        channelId?: number
    ): Promise<boolean>{
        return await userHasAccessToPermission(
            this,
            permissionId,
            channelId
        )
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

    @CreatedAt
    created_at: Date;

    @UpdatedAt
    updated_at: Date;

    @DeletedAt
    deleted_at: Date;

    // Associations
    @BelongsToMany(() => Role, () => UserRole)
    roles: Role[];

    // Mixins
    declare getRoles: BelongsToManyGetAssociationsMixin<Role>;
    declare setRoles: BelongsToSetAssociationMixin<Role, number>;
    declare addRoles: HasManyAddAssociationsMixin<Role, number>;
    declare removeRoles: HasManyRemoveAssociationsMixin<Role, number>;

    // Hooks
    @BeforeValidate
    static generateApiKey(instance: User) {
        instance.password = bcrypt.hashSync(instance.password, 10);
    }

    @BeforeUpdate
    static preventUsernameUpdateForSuperadmin(instance: User) {
        const originalUsername = instance.previous('username');

        if (originalUsername === 'superadmin' && instance.username !== originalUsername) {
            instance.username = originalUsername;
        }
    }
}
