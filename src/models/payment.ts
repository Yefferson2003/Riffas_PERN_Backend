import { BelongsTo, Column, DataType, Default, ForeignKey, Model, Table } from "sequelize-typescript";
import RaffleNumbers from "./raffle_numbers";
import User from "./user";
import PayMethode from "./payMethode";
import RafflePayMethode from "./rafflePayMethode";

export const paymentMethodEnum = [
    'Efectivo', 
    'Pago móvil',
    'Transferencia VES', 
    'Nequi',
    'Bancolombia', 
    'Bancolombia internacional', 
    'Zelle',
    'Transferencia EEUU',
    'Panamá', 
    'Pesos chilenos (Rut)',
    'PayPal',
    'Binance', 
    'Western', 
    'Otros',
    'Apartado',
    ''
] as const;

@Table({
    tableName: 'payments'
})

class Payment extends Model {
    @Column({
        type: DataType.DECIMAL(10, 2),
        allowNull: false
    })
    amount: number

    @Column({
        type: DataType.DATE,
        allowNull: true
    })
    paidAt: Date

    @ForeignKey(() => RaffleNumbers)
    @Column({
        type: DataType.INTEGER,
        allowNull: false
    })
    riffleNumberId: number

    @Column({
        type: DataType.STRING,
        allowNull: true
    })
    reference: string

    @ForeignKey(() => User)
    @Column({
        type: DataType.INTEGER,
        allowNull: true
    })
    userId: number

    @Default(true)
    @Column({
        type: DataType.BOOLEAN,
        allowNull: false,
    })
    isValid: boolean

    @BelongsTo(() => RaffleNumbers)
    raffleNumber: RaffleNumbers

    @BelongsTo(() => User, {
        onDelete: 'CASCADE'
    })
    user: User

    @ForeignKey(() => RafflePayMethode)
    @Column({
        type: DataType.INTEGER,
        allowNull: true
    })
    paymentMethodId: number

    @BelongsTo(() => RafflePayMethode)
    rafflePayMethode: RafflePayMethode

    // @Default('Efectivo')
    // @Column({
    //     type: DataType.ENUM(...paymentMethodEnum),
    //     allowNull: true,
    //     defaultValue: 'Efectivo'
    // })
    // paymentMethod: string

}

export default Payment