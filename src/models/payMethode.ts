import { Column, DataType, HasMany, Model, Table } from "sequelize-typescript";
import Payment from "./payment";
import RafflePayMethode from "./rafflePayMethode";

@Table({
    tableName: 'payment_methods'
})

class PayMethode extends Model{

    @Column({
        type: DataType.STRING,
        allowNull: false
    })
    name: string;

    // @Column({
    //     type: DataType.STRING,
    //     allowNull: true
    // })
    // accountNumber: string;

    // @Column({
    //     type: DataType.STRING,
    //     allowNull: true
    // })
    // accountHolder: string; // Titular de la cuenta

    // @Column({
    //     type: DataType.ENUM('bank_transfer', 'digital_wallet', 'cash', 'card', 'crypto'),
    //     allowNull: false,
    //     defaultValue: 'bank_transfer'
    // })
    // type: string; // Tipo de método de pago

    // @Column({
    //     type: DataType.STRING,
    //     allowNull: true
    // })
    // bankName: string; // Nombre del banco

    // @Column({
    //     type: DataType.STRING,
    //     allowNull: true
    // })
    // instructions: string; // Instrucciones específicas para el pago

    @Column({
        type: DataType.BOOLEAN,
        allowNull: false,
        defaultValue: true
    })
    isActive: boolean; // Si el método está activo

    @Column({
        type: DataType.TEXT,
        allowNull: true,
        defaultValue: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiB2aWV3Qm94PSIwIDAgMjQgMjQiPjxwYXRoIGZpbGw9IiM2NWEzMGQiIGQ9Ik0zIDZoMTh2MTJIM3ptOSAzYTMgMyAwIDAgMSAzIDNhMyAzIDAgMCAxLTMgM2EzIDMgMCAwIDEtMy0zYTMgMyAwIDAgMSAzLTNNNyA4YTIgMiAwIDAgMS0yIDJ2NGEyIDIgMCAwIDEgMiAyaDEwYTIgMiAwIDAgMSAyLTJ2LTRhMiAyIDAgMCAxLTItMnoiLz48L3N2Zz4=' // Ícono por defecto de método de pago
    })
    icon: string; // URL del ícono o nombre del ícono

    
    // @HasMany(() => Payment)
    // payments: Payment[]

    @HasMany(() => RafflePayMethode)
    rafflePayMethodes: RafflePayMethode[]

    
    // @Column({
    //     type: DataType.DECIMAL(5, 2),
    //     allowNull: true
    // })
    // fee: number; // Comision por usar este método (porcentaje)

}

export default PayMethode;