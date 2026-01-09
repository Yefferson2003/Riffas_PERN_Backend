import { Router } from 'express'
import engageLabRoutes from './engageLab.routes'

const router = Router()

router.use('/engagelab', engageLabRoutes)

export default router