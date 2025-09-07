import { BelongsTo, Column, DataType, Default, ForeignKey, HasMany, Model, Table } from "sequelize-typescript";
import Raffle from "./raffle";
import Payment from "./payment";

export const rifflesNumbersStatusEnum = ['available', 'sold', 'pending'] as const;
export const identificationTypeEnum = ['CC', 'TI', 'CE'] as const;

@Table({
    tableName: 'raffle_numbers'
})

class RaffleNumbers extends Model{

    @Column({
        type: DataType.INTEGER,
        allowNull: false
    })
    number: number

    @Column({
        type: DataType.DATE,
        allowNull: true
    })
    reservedDate: Date

    @Default('available')
    @Column({
        type: DataType.ENUM(...rifflesNumbersStatusEnum),
        allowNull: false
    })
    status: string

    // @Column({
    //     type: DataType.ENUM(...identificationTypeEnum),
    //     allowNull: true
    // })
    // identificationType: string

    // @Column({
    //     type: DataType.STRING,
    //     allowNull: true,
    // })
    // identificationNumber: string

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
        allowNull: true
    })
    phone: string

    @Column({
        type: DataType.STRING(255),
        allowNull: true
    })
    address: string

    @Default(0)
    @Column({
        type: DataType.DECIMAL(10, 2),
        allowNull: true
    })
    paymentAmount: number

    @Default(0)
    @Column({
        type: DataType.DECIMAL(10, 2),
        allowNull: true
    })
    paymentDue: number

    @ForeignKey(() => Raffle)
    @Column({
        type: DataType.INTEGER,
        allowNull: false
    })
    raffleId: number

    @BelongsTo(() => Raffle)
    raffle: Raffle

    @HasMany(() => Payment)
    payments: Payment[]

}

export default RaffleNumbers
