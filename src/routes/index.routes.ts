import { Router } from "express";
import authRoutes from './auth.routes'
import userRoutes from './user.routes'
import rifflesRoutes from './raffles.routes'
import rifflesNumbersRoutes from './raffles_numbers.routes'
import paymentsRoutes from './payments.routes'
import paymentMethodsRoutes from './payMethode.routes'
import rafflePayMethodsRoutes from './rafflePayMethode.routes'

const router = Router()

router.use('/auth', authRoutes)
router.use('/users', userRoutes)
router.use('/raffles', rifflesRoutes)
router.use('/raffles-numbers', rifflesNumbersRoutes)
router.use('/payments', paymentsRoutes)
router.use('/payment-methods', paymentMethodsRoutes)
router.use('/raffle-payment-methods', rafflePayMethodsRoutes)

export default router