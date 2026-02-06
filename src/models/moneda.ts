import { Column, DataType, Model, Table, HasMany } from "sequelize-typescript";
import UserTasas from "./userTasas";

@Table({
    tableName: "monedas",
})

class Moneda extends Model {
    @Column({
        type: DataType.STRING,
        allowNull: false,
    })
    name: string;

    @Column({
        type: DataType.STRING,
        allowNull: false,
    })
    symbol: string;

    @HasMany(() => UserTasas)
    userTasas: UserTasas[];
}

export default Moneda;