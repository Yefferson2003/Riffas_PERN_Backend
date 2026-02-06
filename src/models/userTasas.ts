import { Column, DataType, Model, Table, ForeignKey, BelongsTo } from "sequelize-typescript";
import Moneda from "./moneda";

@Table({
    tableName: "user_tasas",
})

class UserTasas extends Model {

    @Column({
        type: DataType.DECIMAL(10, 2),
        allowNull: false,
    })
    value: number;

    @ForeignKey(() => Moneda)
    @Column({
        type: DataType.INTEGER,
        allowNull: false,
    })
    monedaId: number;

    @BelongsTo(() => Moneda)
    moneda: Moneda;

    @Column({
        type: DataType.INTEGER,
        allowNull: false,
    })
    userResponsableId: number;
}

export default UserTasas;



