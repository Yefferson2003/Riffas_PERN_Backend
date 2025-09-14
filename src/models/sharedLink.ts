import { Table, Column, Model, DataType, PrimaryKey } from "sequelize-typescript";

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
}

export default SharedLink;
