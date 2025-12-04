import { Request, Response } from 'express';
import Expenses from '../models/expenses';
import User from '../models/user';

class ExpenseController {

    static async getTotalExpenses(req: Request, res: Response){
        const {raffleId } = req.params;
        try {
            
            const total = await Expenses.sum('amount', {
                where: {
                    raffleId: raffleId,
                }
            });

            res.json({total : total || 0})

        } catch (error) {
            console.log(error);
            res.status(500).json({error: 'Hubo un Error'})
        }
    }

    static async getTotalExpensesByUser(req: Request, res: Response){
        const {raffleId } = req.params;
        try {
            
            const total = await Expenses.sum('amount', {
                where: {
                    raffleId: raffleId,
                    userId: req.user.id
                }
            });

            res.json({total : total || 0})

        } catch (error) {
            console.log(error);
            res.status(500).json({error: 'Hubo un Error'})
        }
    }

    static async getAllExpenses(req: Request, res: Response){
        const {page = 1, limit = 10} = req.query
        const {raffleId } = req.params;

        const pageNumber = parseInt(page as string);
        const limitNumber = parseInt(limit as string);
        const offset = (pageNumber - 1) * limitNumber;

        try {
            const {count, rows :  expenses } = await Expenses.findAndCountAll({
                where: {
                    raffleId: raffleId,
                },
                attributes: ['id', 'name', 'amount', 'createdAt'],
                include: [
                    {
                        model: User,
                        as: 'user',
                        attributes: ['id', 'firstName', 'lastName', 'identificationNumber' ],
                    },
                ],
                limit: limitNumber,
                offset,
                order: [['createdAt', 'DESC']],
            });

            res.json({
                total: count,
                expenses,
                totalPages: Math.ceil(count / limitNumber),
                currentPage: pageNumber,
            });

        } catch (error) {
            console.log(error);
            res.status(500).json({error: 'Hubo un Error'})
        }
    }

    static async getExpenses(req: Request, res: Response){
        const {page = 1, limit = 10} = req.query
        const {raffleId } = req.params;
        const userId = req.user.id;

        const pageNumber = parseInt(page as string);
        const limitNumber = parseInt(limit as string);
        const offset = (pageNumber - 1) * limitNumber;

        try {
                const {count, rows :  expenses } = await Expenses.findAndCountAll({
                    where: {
                        raffleId: raffleId,
                        userId
                    },
                    attributes: ['id', 'name', 'amount', 'createdAt'],
                    limit: limitNumber,
                    offset,
                    order: [['createdAt', 'DESC']],
                });

                res.json({
                    total: count,
                    expenses,
                    totalPages: Math.ceil(count / limitNumber),
                    currentPage: pageNumber,
                });

        } catch (error) {
            console.log(error);
            res.status(500).json({error: 'Hubo un Error'})
        }
    }

    static async getExpenseById(req: Request, res: Response){
        try {
            if (req.expense.dataValues.userId !== req.user.id) {
                res.status(403).json({error: 'No tienes permiso para modificar este gasto'})
                return 
            }
            res.json(req.expense)
        } catch (error) {
            console.log(error);
            res.status(500).json({error: 'Hubo un Error'})
        }
    }

    static async createExpense(req: Request, res: Response){
        const {name, amount} = req.body;
        const {raffleId} = req.params;
        const userId = req.user.id;
        try {

            const expense = await Expenses.create({
                name,
                amount,
                raffleId,
                userId
            })

            res.status(201).send('Gasto creado correctamente')
        } catch (error) {
        console.log(error);
        res.status(500).json({error: 'Hubo un Error'})
        }
    }

    static async updateExpense(req: Request, res: Response) {
        const {name, amount} = req.body;
        try {

            if (req.expense.dataValues.userId !== req.user.id) {
                res.status(403).json({error: 'No tienes permiso para modificar este gasto'})
                return 
            }
            
            await req.expense.update({
                name,
                amount,
            })

            res.status(201).send('Gasto actualizado correctamente')
        } catch (error) {
            console.log(error);
            res.status(500).json({error: 'Hubo un Error'})
        }
    }

    static async deleteExpense(req: Request, res: Response) {
        try {

            
            if (req.expense.dataValues.userId !== req.user.id) {
                res.status(403).json({error: 'No tienes permiso para modificar este gasto'})
                return 
            }

            await req.expense.destroy()

            res.status(200).send('Gasto eliminado correctamente')
        } catch (error) {
            console.log(error);
            res.status(500).json({error: 'Hubo un Error'})
        }
    }

}

export default ExpenseController;