import { Table, Model, Column, DataType, ForeignKey, Default, BelongsTo } from "sequelize-typescript";
import User from "./user";
import Raffle from "./raffle";

export const userRiffleRolEnum = ['vendedor', 'responsable'] as const;

@Table({
    tableName: "user_rifa", 
})
class UserRifa extends Model {
    @ForeignKey(() => User)
    @Column({
        type: DataType.INTEGER,
        allowNull: false,
        onDelete: "CASCADE", 
    })
    userId: number;

    @ForeignKey(() => Raffle)
    @Column({
        type: DataType.INTEGER,
        allowNull: false,
        onDelete: "CASCADE", 
    })
    rifaId: number;

    @Column({
        type: DataType.ENUM(...userRiffleRolEnum),
        allowNull: false,
    })
    role: string;

    @Default(DataType.NOW)
    @Column({
        type: DataType.DATE,
    })
    assignedAt: Date; 

    @BelongsTo(() => User)
    user: User
    
    @BelongsTo(() => Raffle)
    raffle: Raffle
}

export default UserRifa;
