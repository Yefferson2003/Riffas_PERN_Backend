import { Column, DataType, Model, Table, ForeignKey, BelongsTo } from "sequelize-typescript";
import Raffle from "./raffle";

@Table({
    tableName: 'raffle_offers'
})
class RaffleOffer extends Model {
    @ForeignKey(() => Raffle)
    @Column({
        type: DataType.INTEGER,
        allowNull: false
    })
    raffleId: number

    @Column({
        type: DataType.INTEGER,
        allowNull: false
    })
    minQuantity: number

    @Column({
        type: DataType.DECIMAL(10, 2),
        allowNull: false
    })
    discountedPrice: number

    @Column({
        type: DataType.BOOLEAN,
        defaultValue: true
    })
    isActive: boolean

    @BelongsTo(() => Raffle)
    raffle: Raffle
}

export default RaffleOffer
