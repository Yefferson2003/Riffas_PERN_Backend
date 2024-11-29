import { BelongsTo, Column, DataType, Default, ForeignKey, HasMany, Model, Table } from "sequelize-typescript";
import Rol from "./rol";
import { identificationTypeEnum } from "./raffle_numbers";
import UserRifa from "./user_raffle";
import Payment from "./payment";

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
        type: DataType.STRING(10),
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

    @ForeignKey(() => Rol)
    @Column({
        type: DataType.INTEGER,
        allowNull: false
    })
    rolId: number

    @HasMany(() => Payment)
    payments: Payment[]

    @BelongsTo(() => Rol)
    rol: Rol

    @HasMany(() => UserRifa, {
        onDelete: 'CASCADE', 
        hooks: true
    })
    userRiffle: UserRifa[]
}

export default User