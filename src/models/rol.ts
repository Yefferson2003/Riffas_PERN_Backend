import { Column, DataType, HasMany, Model, Table } from "sequelize-typescript";
import User from "./user";

export const rolEnum = ["responsable", "vendedor"] as const

@Table({
    tableName: 'roles'
})

class Rol extends Model{
    @Column({
        type: DataType.STRING,
        allowNull: false,
        unique: true
    })
    name: string

    @HasMany(() => User)
    users: User[]
}

export default Rol