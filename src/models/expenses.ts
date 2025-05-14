import { BelongsTo, Column, DataType, ForeignKey, Model, Table } from "sequelize-typescript";
import Raffle from "./raffle";
import User from "./user";

@Table({
    tableName: 'expenses'
})

class Expenses extends Model {

    @Column({
        type: DataType.STRING,
        allowNull: false,
    })
    name: string

    @Column({
        type: DataType.DECIMAL(10, 2),
        allowNull: false,
    })
    amount: number

    @ForeignKey(() => Raffle)
    @Column({
        type: DataType.INTEGER,
        allowNull: false,
        onDelete: 'CASCADE',
    })
    raffleId: number

    @ForeignKey(() => User)
    @Column({
        type: DataType.INTEGER,
        allowNull: false,
    })
    userId: number

    @BelongsTo(() => Raffle)
    raffle: Raffle

    @BelongsTo(() => User)
    user: User

}

export default Expenses