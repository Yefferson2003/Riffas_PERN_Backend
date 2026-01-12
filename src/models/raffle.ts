import { Column, DataType, Default, HasMany, Model, Table } from "sequelize-typescript";
import RaffleNumbers from "./raffle_numbers";
import UserRifa from "./user_raffle";
import Awards from "./awards";
import Expenses from "./expenses";
import RafflePayMethode from "./rafflePayMethode";
import RaffleOffer from "./raffleOffers";
import SharedLink from "./sharedLink";
import Purchase from "./purchase";

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
        allowNull: true,
        defaultValue: 'https://res.cloudinary.com/dkqd7yggo/image/upload/v1733066711/cfxhlnkol71lyfpp8amy.jpg'
    })
    banerImgUrl: string

    @Default('https://res.cloudinary.com/dkqd7yggo/image/upload/v1733066711/cfxhlnkol71lyfpp8amy.jpg')
    @Column({
        type: DataType.TEXT,
        allowNull: true,
        defaultValue: 'https://res.cloudinary.com/dkqd7yggo/image/upload/v1733066711/cfxhlnkol71lyfpp8amy.jpg'
    })
    banerMovileImgUrl: string

    @Default('https://res.cloudinary.com/dfbwjrpdu/image/upload/v1765900779/receipt_657234_p517ss.png')
    @Column({
        type: DataType.TEXT,
        allowNull: true,
        defaultValue: 'https://res.cloudinary.com/dfbwjrpdu/image/upload/v1765900779/receipt_657234_p517ss.png'
    })
    imgIconoUrl: string

    @Column({
        type: DataType.STRING,
        allowNull: true
    })
    contactRifero: string

    @Column({
        type: DataType.STRING,
        allowNull: true
    })
    color: string

    @HasMany(() => RaffleNumbers)
    raffleNumbers: RaffleNumbers[]

    @HasMany(() => UserRifa)
    userRiffle: UserRifa[]

    @HasMany(() => Awards)
    awards: Awards[]

    @HasMany(() => Expenses)
    expenses: Expenses[]

    @HasMany(() => RafflePayMethode)
    rafflePayMethodes: RafflePayMethode[]

    @HasMany(() => RaffleOffer)
    offers: RaffleOffer[]

    @HasMany(() => SharedLink)
    sharedLinks: SharedLink[]
    
    @HasMany(() => Purchase)
    purchases: Purchase[]
    
}

export default Raffle