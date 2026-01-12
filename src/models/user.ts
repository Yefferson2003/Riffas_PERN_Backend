import { BelongsTo, Column, DataType, Default, ForeignKey, HasMany, Model, Table, BelongsToMany } from "sequelize-typescript";
import Expenses from "./expenses";
import Payment from "./payment";
import Rol from "./rol";
import UserRifa from "./user_raffle";
import Clients from "./clients";
import UserClients from "./user_clients";
import Purchase from "./purchase";

@Table({
    tableName: 'users'
})

class User extends Model{
    @Column({
        type: DataType.STRING,
        allowNull: false
    })
    firstName: string

    @Column({
        type: DataType.STRING,
        allowNull: false
    })
    lastName: string

    @Default('CC')
    @Column({
        type: DataType.STRING,
        allowNull: false
    })
    identificationType: string

    @Column({
        type: DataType.STRING,
        allowNull: false,
    })
    identificationNumber: string

    @Column({
        type: DataType.STRING(255),
        allowNull: false
    })
    phone: string

    @Column({
        type: DataType.STRING(255),
        allowNull: false
    })
    address: string

    @Column({
        type: DataType.STRING,
        allowNull: false,
        unique: true
    })
    email: string

    @Column({
        type: DataType.STRING,
        allowNull: false
    })
    password: string

    @Default(true)
    @Column({
        type: DataType.BOOLEAN,
        allowNull: true
        
    })
    isActive: boolean

    @Default(0)
    @Column({
        type: DataType.INTEGER,
        allowNull: true
    })
    createdBy: number

    @ForeignKey(() => Rol)
    @Column({
        type: DataType.INTEGER,
        allowNull: false
    })
    rolId: number

    @HasMany(() => Payment, {
        onDelete: 'CASCADE',   
        hooks: true           
    })
    payments: Payment[]

    // Relación Many-to-Many con Clients
    @BelongsToMany(() => Clients, () => UserClients)
    clients: Clients[]

    // Relación directa con la tabla intermedia
    @HasMany(() => UserClients)
    userClients: UserClients[]


    @BelongsTo(() => Rol)
    rol: Rol

    @HasMany(() => UserRifa, {
        onDelete: 'CASCADE', 
        hooks: true
    })
    userRiffle: UserRifa[]

    @HasMany(() => Expenses)
    expenses: Expenses[]

    @HasMany(() => Purchase)
    purchases: Purchase[]
}

export default User