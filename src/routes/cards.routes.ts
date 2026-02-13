import { Request, Response, Router } from 'express'
import { prisma } from '../database';


export const cardsRouter = Router()

/**
 * Endpoint pour récupérer toutes les cartes
 * 
 * Récupère la liste complète de toutes les cartes disponibles dans la base de données,
 * triées par ordre croissant du numéro du Pokédex.
 * Aucune authentification requise.
 * 
 * @route GET /cards
 * @access Public
 * 
 * @returns {200} Array<{id: number, name: string, hp: number, attack: number, type: string, pokedexNumber: number, imgUrl: string}> - Liste des cartes triées par numéro Pokédex
 * @returns {500} {error: "Erreur serveur"} - Erreur interne du serveur
 * 
 * @throws {500} En cas d'erreur lors de la requête à la base de données
 * 
 * @example
 * GET /cards
 * 
 * Réponse (200):
 * {
 *   "cards": [
 *     {
 *       "id": 1,
 *       "name": "Bulbasaur",
 *       "hp": 45,
 *       "attack": 49,
 *       "type": "grass",
 *       "pokedexNumber": 1,
 *       "imgUrl": "https://..."
 *     },
 *     ...
 *   ]
 * }
 */
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

    }
    catch (error) {
        console.error('Erreur lors de l inscription:', error)
        return res.status(500).json({ error: 'Erreur serveur' })
    }
})