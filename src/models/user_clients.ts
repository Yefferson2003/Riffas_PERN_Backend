import { Column, DataType, ForeignKey, BelongsTo, Model, Table } from "sequelize-typescript";
import User from "./user";
import Clients from "./clients";

@Table({
    tableName: 'user_clients',
    timestamps: false
})
class UserClients extends Model {
    @ForeignKey(() => User)
    @Column({
        type: DataType.INTEGER,
        allowNull: false
    })
    userId: number;

    @ForeignKey(() => Clients)
    @Column({
        type: DataType.INTEGER,
        allowNull: false
    })
    clientId: number;

    // Relación con modelo Clients
    @BelongsTo(() => Clients)
    client: Clients;

    // Relación con modelo User
    @BelongsTo(() => User)
    user: User;
}

export default UserClients;
