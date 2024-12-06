import { BelongsTo, Column, DataType, Default, ForeignKey, Model, Table } from "sequelize-typescript";
import RaffleNumbers from "./raffle_numbers";
import User from "./user";

@Table({
    tableName: 'payments'
})

class Payment extends Model {
    @Column({
        type: DataType.DECIMAL(10, 2),
        allowNull: false
    })
    amount: number

    @Column({
        type: DataType.DATE,
        allowNull: true
    })
    paidAt: Date

    @ForeignKey(() => RaffleNumbers)
    @Column({
        type: DataType.INTEGER,
        allowNull: false
    })
    riffleNumberId: number

    @ForeignKey(() => User)
    @Column({
        type: DataType.INTEGER,
        allowNull: false
    })
    userId: number

    @Default(true)
    @Column({
        type: DataType.BOOLEAN,
        allowNull: false,
    })
    isValid: boolean

    @BelongsTo(() => RaffleNumbers)
    raffleNumber: RaffleNumbers

    @BelongsTo(() => User)
    user: User
}

export default Payment