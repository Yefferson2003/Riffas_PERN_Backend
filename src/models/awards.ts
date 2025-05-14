import { BelongsTo, Column, DataType, ForeignKey, Model, Table } from "sequelize-typescript";
import Raffle from "./raffle";

@Table({
    tableName: 'awards'
})

class Awards extends Model {
    @Column({
        type: DataType.STRING,
        allowNull: false
    })
    name: string

    @Column({
        type: DataType.DATE,
        allowNull: false
    })
    playDate: Date
    
    @ForeignKey(() => Raffle)
    @Column({
        type: DataType.INTEGER,
        allowNull: false
    })
    raffleId: number

    @BelongsTo(() => Raffle)
    raffle: Raffle
    
}

export default Awards