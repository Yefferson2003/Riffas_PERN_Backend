import { Column, DataType, Default, HasMany, Model, Table } from "sequelize-typescript";
import RaffleNumbers from "./raffle_numbers";
import UserRifa from "./user_raffle";

export const rifflesStatusEnum = ['finally', 'pendig', 'cancel'] as const;

@Table({
    tableName: 'raffles'
})

class Raffle extends Model {
    @Column({
        type: DataType.STRING,
        allowNull: false
    })
    name: string

    @Column({
        type: DataType.STRING,
        allowNull: false
    })
    nitResponsable: string
    
    @Column({
        type: DataType.STRING,
        allowNull: false
    })
    nameResponsable: string

    @Column({
        type: DataType.TEXT,
        allowNull: true
    })
    description: string

    @Column({
        type: DataType.DATE,
        allowNull: false
    })
    startDate: Date
    
    @Column({
        type: DataType.DATE,
        allowNull: false
    })
    playDate: Date
    
    @Column({
        type: DataType.DATE,
        allowNull: false
    })
    editDate: Date
    
    @Column({
        type: DataType.DECIMAL(10, 2),
        allowNull: false
    })
    price: number

    @Default('https://res.cloudinary.com/dkqd7yggo/image/upload/v1733066711/cfxhlnkol71lyfpp8amy.jpg')
    @Column({
        type: DataType.TEXT,
        allowNull: true
    })
    banerImgUrl: string

    @HasMany(() => RaffleNumbers)
    raffleNumbers: RaffleNumbers[]

    @HasMany(() => UserRifa)
    userRiffle: UserRifa[]
}

export default Raffle