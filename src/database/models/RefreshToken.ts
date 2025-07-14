import {
    AllowNull,
    AutoIncrement,
    Column,
    DataType,
    Model,
    PrimaryKey,
    Table
} from 'sequelize-typescript';

@Table({
    tableName: 'refresh_tokens',
    updatedAt: false
})
export default class RefreshToken extends Model {
    // Columns
    @PrimaryKey
    @AutoIncrement
    @Column(DataType.INTEGER)
    id: number;

    @Column(DataType.INTEGER)
    user_id: number;

    @AllowNull(false)
    @Column(DataType.STRING)
    jti: string;

    @AllowNull(false)
    @Column(DataType.DATE)
    expires_at: string;
}
