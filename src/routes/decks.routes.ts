import { Request, Response, Router } from 'express'
import { prisma } from '../database';
import { authenticateToken } from '../auth.middleware';


export const decksRouter = Router()

/**
 * Endpoint pour créer un nouveau deck
 * 
 * Crée un nouveau deck appartenant à l'utilisateur authentifié.
 * Le deck doit contenir exactement 10 cartes valides identifiées par leurs numéros Pokédex.
 * Les cartes sont vérifiées pour s'assurer qu'elles existent dans la base de données.
 * 
 * @route POST /decks
 * @access Private (Authentification requise)
 * @middleware authenticateToken
 * 
 * @param {Request} req - Requête Express avec userId défini par le middleware d'authentification
 * @param {Object} req.body - Données du deck
 * @param {string} req.body.name - Nom du deck à créer (requis)
 * @param {number[]} req.body.cards - Liste de 10 numéros Pokédex/identifiants de cartes (requis, doit avoir exactement 10 éléments)
 * @param {number} req.userId - ID de l'utilisateur authentifié (défini par le middleware)
 * 
 * @returns {201} {message: "Deck créé"} - Deck créé avec succès
 * @returns {400} {error: "Nom manquant"} - Le nom du deck est manquant
 * @returns {400} {error: "Un deck doit contenir 10 cartes exactement"} - Le tableau de cartes n'a pas 10 éléments
 * @returns {400} {error: "Certaines cartes sont invalides"} - Une ou plusieurs cartes demandées n'existent pas en base
 * @returns {401} {error: "Token manquant"} - Token JWT manquant (see authenticateToken middleware)
 * @returns {401} {error: "Token invalide ou expiré"} - Token JWT invalide (see authenticateToken middleware)
 * @returns {500} {error: "Erreur serveur"} - Erreur interne du serveur
 * 
 * @throws {400} Si le nom est manquant
 * @throws {400} Si le nombre de cartes n'est pas égal à 10
 * @throws {400} Si une ou plusieurs cartes n'existent pas
 * @throws {401} Si l'utilisateur n'est pas authentifié
 * @throws {500} En cas d'erreur lors de la création du deck
 * 
 * @example
 * POST /decks
 * Authorization: Bearer <jwt_token>
 * Content-Type: application/json
 * {
 *   "name": "Mon premier deck",
 *   "cards": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
 * }
 * 
 * Réponse (201):
 * {
 *   "message": "Deck créé"
 * }
 */
decksRouter.post('/', authenticateToken, async (req: Request, res: Response) => {

    try {
        const { name, cards } = req.body

        // 2. Verifie si le nom est present
        if (!name) {
            return res.status(400).json({ error: "Nom manquant" })
        }

        // 3. Verifie que le deck contient exactement 10 cartes
        if (cards.length !== 10) {
            return res.status(400).json({ error: "Un deck doit contenir 10 cartes exactement" })
        }

        // Verifie si les cartes existent en cherchant si apres la recherche on a bien 10 cartes
        const foundCards = await prisma.card.findMany({
            where: {
                pokedexNumber: { in: cards }
            }
        })

        if (foundCards.length !== 10) {
            return res.status(400).json({ error: "Certaines cartes sont invalides" })
        }

        // créer le deck
        await prisma.deck.create({
            data: {
                name,
                userid: req.userId!,
                deckCards: {
                    create: foundCards.map((card) => ({
                        cardId: card.id,
                    })),
                },
            },
        })
        return res.status(201).json({ message: "Deck créé" })


    } catch (error) {
        console.error('Erreur lors de la création du deck:', error)
        return res.status(500).json({ error: 'Erreur serveur' })
    }
})

/**
 * Endpoint pour récupérer tous les decks de l'utilisateur connecté
 * 
 * Récupère la liste complète de tous les decks appartenant à l'utilisateur authentifié.
 * Chaque deck inclut ses cartes associées.
 * 
 * @route GET /decks/mine
 * @access Private (Authentification requise)
 * @middleware authenticateToken
 * 
 * @param {Request} req - Requête Express avec userId défini par le middleware d'authentification
 * @param {number} req.userId - ID de l'utilisateur authentifié (défini par le middleware)
 * 
 * @returns {200} Array<{id: number, name: string, userid: number, deckCards: Object[]}> - Liste des decks de l'utilisateur, peut être vide
 * @returns {200} {message: "Aucun deck trouvé"} - Si l'utilisateur n'a aucun deck
 * @returns {401} {error: "Token manquant"} - Token JWT manquant (see authenticateToken middleware)
 * @returns {401} {error: "Token invalide ou expiré"} - Token JWT invalide (see authenticateToken middleware)
 * @returns {500} {error: "Erreur serveur"} - Erreur interne du serveur
 * 
 * @throws {401} Si l'utilisateur n'est pas authentifié
 * @throws {500} En cas d'erreur lors de la récupération des decks
 * 
 * @example
 * GET /decks/mine
 * Authorization: Bearer <jwt_token>
 * 
 * Réponse (200):
 * [
 *   {
 *     "id": 1,
 *     "name": "Mon premier deck",
 *     "userid": 5,
 *     "deckCards": [...]
 *   }
 * ]
 */
decksRouter.get('/mine', authenticateToken, async (req: Request, res: Response) => {
    try {

        // Recherche du deck
        const decks = await prisma.deck.findMany({
            where: { userid: req.userId },
            select: {
                id: true,
                name: true,
                userid: true,
                deckCards: true,
            }
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
})

/**
 * Endpoint pour récupérer un deck spécifique
 * 
 * Récupère les détails d'un deck spécifique identifié par son ID.
 * Vérifie que le deck appartient bien à l'utilisateur authentifié (sécurité).
 * 
 * @route GET /decks/:id
 * @access Private (Authentification requise)
 * @middleware authenticateToken
 * 
 * @param {Request} req - Requête Express avec userId défini par le middleware d'authentification
 * @param {string} req.params.id - ID du deck à récupérer (requis, doit être convertible en nombre)
 * @param {number} req.userId - ID de l'utilisateur authentifié (défini par le middleware)
 * 
 * @returns {200} {id: number, name: string, userid: number, deckCards: Object[]} - Détails du deck trouvé
 * @returns {404} {error: "Id deck non existant"} - Le deck n'existe pas ou n'appartient pas à l'utilisateur
 * @returns {401} {error: "Token manquant"} - Token JWT manquant (see authenticateToken middleware)
 * @returns {401} {error: "Token invalide ou expiré"} - Token JWT invalide (see authenticateToken middleware)
 * @returns {500} {error: "Erreur serveur"} - Erreur interne du serveur
 * 
 * @throws {404} Si le deck n'existe pas ou n'appartient pas à l'utilisateur
 * @throws {401} Si l'utilisateur n'est pas authentifié
 * @throws {500} En cas d'erreur lors de la récupération du deck
 * 
 * @example
 * GET /decks/1
 * Authorization: Bearer <jwt_token>
 * 
 * Réponse (200):
 * {
 *   "id": 1,
 *   "name": "Mon premier deck",
 *   "userid": 5,
 *   "deckCards": [...]
 * }
 */
decksRouter.get('/:id', authenticateToken, async (req: Request, res: Response) => {
    try {
        // Recherche du deck
        const deck = await prisma.deck.findFirst({
            where: {
                id: parseInt(req.params.id),
                userid: req.userId
            },
            select: {
                id: true,
                name: true,
                userid: true,
                deckCards: true,
            }
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
})

/**
 * Endpoint pour mettre à jour un deck existant
 * 
 * Met à jour le nom et/ou les cartes d'un deck spécifique.
 * Le deck doit toujours contenir exactement 10 cartes valides après la mise à jour.
 * Vérifie que le deck appartient bien à l'utilisateur authentifié (sécurité).
 * 
 * @route PATCH /decks/:id
 * @access Private (Authentification requise)
 * @middleware authenticateToken
 * 
 * @param {Request} req - Requête Express avec userId défini par le middleware d'authentification
 * @param {string} req.params.id - ID du deck à modifier (requis, doit être convertible en nombre)
 * @param {Object} req.body - Données à mettre à jour
 * @param {string} [req.body.name] - Nouveau nom du deck (optionnel)
 * @param {number[]} [req.body.cards] - Nouvelle liste de 10 numéros Pokédex/identifiants de cartes (optionnel, si fourni doit avoir exactement 10 éléments)
 * @param {number} req.userId - ID de l'utilisateur authentifié (défini par le middleware)
 * 
 * @returns {200} {message: "Deck modifier"} - Deck mis à jour avec succès
 * @returns {404} {error: "Id deck non existant"} - Le deck n'existe pas ou n'appartient pas à l'utilisateur
 * @returns {400} {error: "Certaines cartes sont invalides ou pas assez de cartes"} - Les cartes fournies sont invalides
 * @returns {401} {error: "Token manquant"} - Token JWT manquant (see authenticateToken middleware)
 * @returns {401} {error: "Token invalide ou expiré"} - Token JWT invalide (see authenticateToken middleware)
 * @returns {500} {error: "Erreur serveur"} - Erreur interne du serveur
 * 
 * @throws {404} Si le deck n'existe pas ou n'appartient pas à l'utilisateur
 * @throws {400} Si une ou plusieurs cartes n'existent pas ou si le nombre est incorrect
 * @throws {401} Si l'utilisateur n'est pas authentifié
 * @throws {500} En cas d'erreur lors de la mise à jour du deck
 * 
 * @example
 * PATCH /decks/1
 * Authorization: Bearer <jwt_token>
 * Content-Type: application/json
 * {
 *   "name": "Mon deck amélioré",
 *   "cards": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
 * }
 * 
 * Réponse (200):
 * {
 *   "message": "Deck modifier"
 * }
 */
decksRouter.patch('/:id', authenticateToken, async (req: Request, res: Response) => {
    try {
        const { name, cards } = req.body

        // 2. Recuperation du deck
        const deck = await prisma.deck.findFirst({
            where: {
                id: parseInt(req.params.id),
                userid: req.userId
            },
            select: {
                id: true,
                name: true,
                userid: true,
                deckCards: true,
            }
        })

        // 3. Verifie si le deck existe et appartient à l'utilisateur
        if (!deck) {
            return res.status(404).json({ error: 'Id deck non existant' })
        }

        // Verifie si les cartes existent en cherchant si apres la recherche on a bien 10 cartes
        const foundCards = await prisma.card.findMany({
            where: {
                pokedexNumber: { in: cards }
            }
        })

        // 5. Certaines cartes invalides
        if (deck.deckCards.length !== 10) {
            return res.status(400).json({ error: "Certaines cartes sont invalides ou pas assez de cartes" })
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
        return res.status(200).json({ message: "Deck modifier" })

    } catch (error) {
        console.error('Erreur lors de la modification du deck:', error)
        return res.status(500).json({ error: 'Erreur serveur' })
    }
})

/**
 * Endpoint pour supprimer un deck
 * 
 * Supprime un deck spécifique et toutes ses cartes associées (relations deckCards).
 * Cette opération est irréversible.
 * Vérifie que le deck appartient bien à l'utilisateur authentifié (sécurité).
 * 
 * @route DELETE /decks/:id
 * @access Private (Authentification requise)
 * @middleware authenticateToken
 * 
 * @param {Request} req - Requête Express avec userId défini par le middleware d'authentification
 * @param {string} req.params.id - ID du deck à supprimer (requis, doit être convertible en nombre)
 * @param {number} req.userId - ID de l'utilisateur authentifié (défini par le middleware)
 * 
 * @returns {200} {message: " supression reussi"} - Deck supprimé avec succès
 * @returns {404} {error: "Id deck non existant"} - Le deck n'existe pas ou n'appartient pas à l'utilisateur
 * @returns {401} {error: "Token manquant"} - Token JWT manquant (see authenticateToken middleware)
 * @returns {401} {error: "Token invalide ou expiré"} - Token JWT invalide (see authenticateToken middleware)
 * @returns {500} {error: "Erreur serveur"} - Erreur interne du serveur
 * 
 * @throws {404} Si le deck n'existe pas ou n'appartient pas à l'utilisateur
 * @throws {401} Si l'utilisateur n'est pas authentifié
 * @throws {500} En cas d'erreur lors de la suppression du deck ou de ses cartes
 * 
 * @example
 * DELETE /decks/1
 * Authorization: Bearer <jwt_token>
 * 
 * Réponse (200):
 * {
 *   "message": " supression reussi"
 * }
 */
decksRouter.delete('/:id', authenticateToken, async (req: Request, res: Response) => {
    try {
        // Recherche du deck
        const deck = await prisma.deck.findFirst({
            where: {
                id: parseInt(req.params.id),
                userid: req.userId
            },
            select: {
                id: true,
                name: true,
                userid: true,
                deckCards: true,
            }
        })

        // Verifie si le deck existe et appartient à l'utilisateur
        if (!deck) {
            return res.status(404).json({ error: 'Id deck non existant' })
        }

        // Supresssion des cartes
        await prisma.deckCard.deleteMany({
            where: { deckId: deck?.id }
        })

        // Supression du deck
        await prisma.deck.delete({
            where: { id: deck?.id }
        })

        // Retourne le deck de l'utilisateur
        return res.status(200).json({ message: ' supression reussi' })

    } catch (error) {
        console.error('Erreur lors de la recherche du deck:', error)
        return res.status(500).json({ error: 'Erreur serveur' })
    }
})