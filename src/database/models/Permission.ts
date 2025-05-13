import {
    AllowNull,
    AutoIncrement,
    Column,
    CreatedAt,
    DataType,
    DefaultScope,
    DeletedAt,
    Model,
    PrimaryKey,
    Table,
    UpdatedAt,
    ForeignKey,
    BelongsTo,
    Scopes
} from 'sequelize-typescript';
import Channel from './Channel';

enum scopeType {
    read = 'read',
    write = 'write',
    admin = 'admin'
}

@DefaultScope(() => ({
    attributes: {
        exclude: ['admin_password']
    }
}))

@Scopes(() => ({
    withChannel: {
        include: [{
            model: Channel,
            attributes: {
                exclude: ['created_at', 'updated_at', 'deleted_at']
            }
        }]
    }
}))

@Table({
    tableName: 'permissions'
})
export default class Permission extends Model {
    @PrimaryKey
    @AutoIncrement
    @Column(DataType.INTEGER)
    id: number;

    @AllowNull(false)
    @Column(DataType.STRING)
    name: string;

    @Column(DataType.STRING)
    description: string;

    @AllowNull(false)
    @Column(DataType.STRING)
    ref_name: string;

    @AllowNull(false)
    @Column(DataType.STRING)
    module: string;

    @AllowNull(false)
    @Column(DataType.ENUM(...Object.values(scopeType)))
    scope: string;

    @Column(DataType.INTEGER)
    sequence: number;

    @CreatedAt
    created_at: Date;

    @UpdatedAt
    updated_at: Date;

    @DeletedAt
    deleted_at: Date;
}