import { Router } from "express";
import authRoutes from './auth.routes'
import userRoutes from './user.routes'
import rifflesRoutes from './raffles.routes'
import rifflesNumbersRoutes from './raffles_numbers.routes'
import paymentsRoutes from './payments.routes'
import paymentMethodsRoutes from './payMethode.routes'
import rafflePayMethodsRoutes from './rafflePayMethode.routes'
import offersRoutes from './offer.routes'

const router = Router()

router.use('/auth', authRoutes)
router.use('/users', userRoutes)
router.use('/raffles', rifflesRoutes)
router.use('/raffles-numbers', rifflesNumbersRoutes)
router.use('/payments', paymentsRoutes)
router.use('/payment-methods', paymentMethodsRoutes)
router.use('/raffle-payment-methods', rafflePayMethodsRoutes)
router.use('/offers', offersRoutes)

export default router