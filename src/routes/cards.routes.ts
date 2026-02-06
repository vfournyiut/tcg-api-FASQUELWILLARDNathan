import { Request, Response, Router } from 'express'
import { prisma } from '../database'

export const cardsRouter = Router()

// GET /cards
// Accessible via GET /cards
cardsRouter.get('/', async (_req: Request, res: Response) => {
  try {
    // cartes triées dans l'ordre croissant en fonction de son numéro dans le pokedex
    const cards = await prisma.card.findMany({
      select: {
        id: true,
        name: true,
        hp: true,
        attack: true,
        type: true,
        pokedexNumber: true,
        imgUrl: true,
      },
      orderBy: {
        pokedexNumber: 'asc',
      },
    })
    // Retourne la liste des cartes avec id, name, hp, attack, type ...
    return res.status(200).json({ cards })
  } catch (error) {
    console.error('Erreur lors de l inscription:', error)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
})
