import { Request, Response, Router } from 'express'
import { prisma } from '../database'
import { authenticateToken } from '../auth.middleware'

export const decksRouter = Router()

// POST /decks
// Accessible via POST /decks
decksRouter.post(
  '/',
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const { name, cards } = req.body

      // 1. Verifie si l'utilisateur est authentifié
      if (!req.userId) {
        return res.status(401).json({ error: 'Utilisateur non authentifié' })
      }

      // 2. Verifie si le nom est present
      if (!name) {
        return res.status(400).json({ error: 'Nom manquant' })
      }

      // 3. Verifie que le deck contient exactement 10 cartes
      if (cards.length !== 10) {
        return res
          .status(400)
          .json({ error: 'Un deck doit contenir 10 cartes exactement' })
      }

      // Verifie si les cartes existent en cherchant si apres la recherche on a bien 10 cartes
      const foundCards = await prisma.card.findMany({
        where: {
          pokedexNumber: { in: cards },
        },
      })

      if (foundCards.length !== 10) {
        return res
          .status(400)
          .json({ error: 'Certaines cartes sont invalides' })
      }

      // créer le deck
      await prisma.deck.create({
        data: {
          name,
          userid: req.userId,
          deckCards: {
            create: foundCards.map((card) => ({
              cardId: card.id,
            })),
          },
        },
      })
      return res.status(201).json({ message: 'Deck créé' })
    } catch (error) {
      console.error('Erreur lors de la création du deck:', error)
      return res.status(500).json({ error: 'Erreur serveur' })
    }
  },
)

// GET /decks/mine
// Accessible via GET /decks/mine
decksRouter.get(
  '/mine',
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      // Recherche du deck
      const decks = await prisma.deck.findMany({
        where: { userid: req.userId },
        select: {
          id: true,
          name: true,
          userid: true,
          deckCards: true,
        },
      })

      // Recherche si le deck est vide
      if (decks.length === 0) {
        return res.status(200).json({ message: 'Aucun deck trouvé' })
      }

      // Retourne le deck
      return res.status(200).json(decks)
    } catch (error) {
      console.error('Erreur lors de la recherche du deck:', error)
      return res.status(500).json({ error: 'Erreur serveur' })
    }
  },
)

// GET /decks/:id
// Accessible via GET /decks/:id
decksRouter.get(
  '/:id',
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      // Recherche du deck
      const deck = await prisma.deck.findFirst({
        where: {
          id: parseInt(req.params.id),
          userid: req.userId,
        },
        select: {
          id: true,
          name: true,
          userid: true,
          deckCards: true,
        },
      })

      // Verifie si le deck existe et appartient à l'utilisateur
      if (!deck) {
        return res.status(404).json({ error: 'Id deck non existant' })
      }

      // Retourne le deck de l'utilisateur
      return res.status(200).json(deck)
    } catch (error) {
      console.error('Erreur lors de la recherche du deck:', error)
      return res.status(500).json({ error: 'Erreur serveur' })
    }
  },
)

// PATCH /decks/:id
// Accessible via PATCH /decks/:id
decksRouter.patch(
  '/:id',
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const { name, cards } = req.body

      // 2. Recuperation du deck
      const deck = await prisma.deck.findFirst({
        where: {
          id: parseInt(req.params.id),
          userid: req.userId,
        },
        select: {
          id: true,
          name: true,
          userid: true,
          deckCards: true,
        },
      })

      // 3. Verifie si le deck existe et appartient à l'utilisateur
      if (!deck) {
        return res.status(404).json({ error: 'Id deck non existant' })
      }

      // Verifie si les cartes existent en cherchant si apres la recherche on a bien 10 cartes
      const foundCards = await prisma.card.findMany({
        where: {
          pokedexNumber: { in: cards },
        },
      })

      // 5. Certaines cartes invalides
      if (deck.deckCards.length !== 10) {
        return res
          .status(400)
          .json({
            error: 'Certaines cartes sont invalides ou pas assez de cartes',
          })
      }

      // Modification du deck
      await prisma.deck.update({
        where: { id: deck.id },
        data: {
          name,
          deckCards: {
            deleteMany: {},
            create: foundCards.map((card) => {
              return {
                cardId: card.id,
              }
            }),
          },
        },
      })
      return res.status(200).json({ message: 'Deck modifier' })
    } catch (error) {
      console.error('Erreur lors de la modification du deck:', error)
      return res.status(500).json({ error: 'Erreur serveur' })
    }
  },
)

// DELETE /decks/:id
// Accessible via DELETE /decks/:id
decksRouter.delete(
  '/:id',
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      // Recherche du deck
      const deck = await prisma.deck.findFirst({
        where: {
          id: parseInt(req.params.id),
          userid: req.userId,
        },
        select: {
          id: true,
          name: true,
          userid: true,
          deckCards: true,
        },
      })

      // Verifie si le deck existe et appartient à l'utilisateur
      if (!deck) {
        return res.status(404).json({ error: 'Id deck non existant' })
      }

      // Supresssion des cartes
      await prisma.deckCard.deleteMany({
        where: { deckId: deck?.id },
      })

      // Supression du deck
      await prisma.deck.delete({
        where: { id: deck?.id },
      })

      // Retourne le deck de l'utilisateur
      return res.status(200).json({ message: ' supression reussi' })
    } catch (error) {
      console.error('Erreur lors de la recherche du deck:', error)
      return res.status(500).json({ error: 'Erreur serveur' })
    }
  },
)
