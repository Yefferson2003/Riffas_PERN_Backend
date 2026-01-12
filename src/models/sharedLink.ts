import { Table, Column, Model, DataType, PrimaryKey, BelongsTo, ForeignKey, HasMany } from "sequelize-typescript";
import Raffle from "./raffle";
import Purchase from "./purchase";

@Table({
    tableName: "shared_links",
})
class SharedLink extends Model {

    @Column({
        type: DataType.TEXT,
        allowNull: false,
    })
    uuid: string;

    @Column({
        type: DataType.TEXT,
        allowNull: false,
    })
    token: string;

    @Column({
        type: DataType.DATE,
        allowNull: false,
    })
    expiresAt: Date;

    @Column({
        type: DataType.TEXT,
        allowNull: true,
    })
    url: string;

    @ForeignKey(() => Raffle)
    @Column({
        type: DataType.INTEGER,
        allowNull: true,
    })
    raffleId: number;

    @BelongsTo(() => Raffle, 'raffleId')
    raffle: Raffle;

    @HasMany(() => Purchase)
    purchases: Purchase[];

}

export default SharedLink;
