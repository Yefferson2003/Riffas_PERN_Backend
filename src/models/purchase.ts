import { Table, Column, Model, DataType, ForeignKey, BelongsTo, Default, CreatedAt } from "sequelize-typescript";
import Raffle from "./raffle";
import Clients from "./clients";
import User from "./user";
import SharedLink from "./sharedLink";

export const purchaseSourceEnum = ['shared_link', 'ADMIN', 'SELLER'] as const;

@Table({
    tableName: 'purchases',
})
class Purchase extends Model {
    @ForeignKey(() => Raffle)
    @Column({
        type: DataType.INTEGER,
        allowNull: false
    })
    raffleId: number;

    @BelongsTo(() => Raffle)
    raffle: Raffle;

    @ForeignKey(() => Clients)
    @Column({
        type: DataType.INTEGER,
        allowNull: false
    })
    clientId: number;

    @BelongsTo(() => Clients)
    client: Clients;

    @ForeignKey(() => User)
    @Column({
        type: DataType.INTEGER,
        allowNull: true
    })
    userId: number;

    @BelongsTo(() => User)
    user: User;

    @Column({
        type: DataType.ENUM(...purchaseSourceEnum),
        allowNull: false
    })
    source: string;

    @ForeignKey(() => SharedLink)
    @Column({
        type: DataType.INTEGER,
        allowNull: true
    })
    sharedLinkId: number;

    @BelongsTo(() => SharedLink)
    sharedLink: SharedLink;
}

export default Purchase;
