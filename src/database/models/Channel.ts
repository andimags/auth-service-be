import {
    AllowNull,
    AutoIncrement,
    BeforeDestroy,
    Column,
    CreatedAt,
    DataType,
    DefaultScope,
    DeletedAt,
    Model,
    PrimaryKey,
    Table,
    UpdatedAt
} from 'sequelize-typescript';
import Permission from './Permission';

@DefaultScope(() => ({
    attributes: {
        exclude: ['admin_password']
    }
}))
@Table({
    tableName: 'channels'
})
export default class Channel extends Model {
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
    api_key: string;

    @CreatedAt
    created_at: Date;

    @UpdatedAt
    updated_at: Date;

    @DeletedAt
    deleted_at: Date;

    // Hooks
    @BeforeDestroy
    static async softDeletePermissions(channel: Channel) {
        await Permission.update(
            {
                deleted_at: new Date()
            },
            {
                where: {
                    id: channel.id
                }
            }
        );
    }
}
