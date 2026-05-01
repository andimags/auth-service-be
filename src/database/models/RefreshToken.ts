import {
    AllowNull,
    AutoIncrement,
    BeforeValidate,
    BelongsTo,
    Column,
    CreatedAt,
    DataType,
    ForeignKey,
    Model,
    PrimaryKey,
    Table,
    Unique
} from 'sequelize-typescript';
import User from './User';

@Table({
    tableName: 'refresh_tokens'
})

export default class RefreshToken extends Model {
    @PrimaryKey
    @AutoIncrement
    @Column(DataType.INTEGER)
    id: number;

    @AllowNull(false)
    @ForeignKey(() => User)
    @Column
    user_id: number;

    @Unique
    @AllowNull(false)
    @Column(DataType.STRING)
    jti: string;

    @AllowNull(false)
    @Column(DataType.DATE)
    expires_at: Date;

    @CreatedAt
    created_at: Date;

    // Associations
    @BelongsTo(() => User)
    user: User; 

    // Hooks
    @BeforeValidate
    static generateCreatedAt(instance: RefreshToken) {
        // this will also be called when an instance is created
        instance.created_at = new Date();
    }
}
