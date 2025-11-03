import { BelongsTo, Column, DataType, ForeignKey, HasMany, Model, Table } from "sequelize-typescript";
import Raffle from "./raffle";
import PayMethode from "./payMethode";
import Payment from "./payment";


@Table({
    tableName: 'raffle_payment_methods'
})

class RafflePayMethode extends Model {

    @ForeignKey(() => Raffle)
    @Column({
        type: DataType.INTEGER,
        allowNull: false
    })
    raffleId: number;

    @ForeignKey(() => PayMethode)
    @Column({
        type: DataType.INTEGER,
        allowNull: false
    })
    payMethodeId: number;

    @Column({
        type: DataType.STRING,
        allowNull: true
    })
    accountNumber: string; // Número de cuenta específico para esta rifa

    @Column({
        type: DataType.STRING,
        allowNull: true
    })
    accountHolder: string; // Titular de la cuenta específico para esta rifa

    // @Column({
    //     type: DataType.ENUM('bank_transfer', 'digital_wallet', 'cash', 'card', 'crypto'),
    //     allowNull: true
    // })
    // type: string; // Tipo específico para esta rifa (override del método base)

    @Column({
        type: DataType.STRING,
        allowNull: true
    })
    bankName: string; // Banco específico para esta rifa

    // @Column({
    //     type: DataType.TEXT,
    //     allowNull: true
    // })
    // instructions: string; // Instrucciones específicas para esta rifa

    // @Column({
    //     type: DataType.DECIMAL(5, 2),
    //     allowNull: true,
    //     defaultValue: 0.00
    // })
    // fee: number; // Comisión específica para esta rifa

    @Column({
        type: DataType.BOOLEAN,
        allowNull: false,
        defaultValue: true
    })
    isActive: boolean; // Si este método está activo para esta rifa específica

    // @Column({
    //     type: DataType.INTEGER,
    //     allowNull: false,
    //     defaultValue: 0
    // })
    // order: number; // Orden de visualización en la rifa

    // Relaciones
    @BelongsTo(() => Raffle)
    raffle: Raffle;

    @BelongsTo(() => PayMethode)
    payMethode: PayMethode;

    @HasMany(() => Payment)
    payments: Payment[];
}

export default RafflePayMethode;