import { Column, DataType, ForeignKey, HasMany, Model, Table, BelongsToMany } from "sequelize-typescript";
import RaffleNumbers from "./raffle_numbers";
import User from "./user";
import UserClients from "./user_clients";

@Table({
    tableName: 'clients'
})

class Clients extends Model {

    @Column({
        type: DataType.STRING,
        allowNull: true
    })
    firstName: string

    @Column({
        type: DataType.STRING,
        allowNull: true
    })
    lastName: string

    @Column({
        type: DataType.STRING(255),
        allowNull: true,
        unique: true
    })
    phone: string

    @Column({
        type: DataType.STRING(255),
        allowNull: true
    })
    address: string

    // Relación Many-to-Many con User
    @BelongsToMany(() => User, () => UserClients)
    users: User[]

    // Relación directa con la tabla intermedia
    @HasMany(() => UserClients)
    userClients: UserClients[]
    
    @HasMany(() => RaffleNumbers)
    raffleNumbers: RaffleNumbers[]
}
export default Clients