import { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'

// Étendre le type Request pour ajouter userId
declare global {
    namespace Express {
        interface Request {
            userId?: number
        }
    }
}

/**
 * Middleware d'authentification JWT
 * 
 * Valide le token JWT fourni dans l'en-tête Authorization et ajoute l'ID utilisateur à l'objet Request.
 * Ce middleware doit être utilisé pour protéger les routes qui nécessitent une authentification.
 * 
 * @param {Request} req - Objet requête Express. Sera enrichi avec la propriété `userId` si l'authentification réussit
 * @param {Response} res - Objet réponse Express
 * @param {NextFunction} next - Fonction callback pour passer au middleware suivant ou à la route
 * 
 * @returns {void} Appelle `next()` si le token est valide, sinon envoie une réponse d'erreur
 * 
 * @throws {401} Si le token est manquant dans l'en-tête Authorization (format: "Bearer <token>")
 * @throws {401} Si le token est invalide ou expiré
 * 
 * @example
 * // Utilisation dans une route protégée
 * router.get('/decks', authenticateToken, (req: Request, res: Response) => {
 *   // req.userId contient l'ID de l'utilisateur authentifié
 * })
 */
export const authenticateToken = (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    // 1. Récupérer le token depuis l'en-tête Authorization
    const authHeader = req.headers.authorization
    const token = authHeader && authHeader.split(' ')[1] // Format: "Bearer TOKEN"

    if (!token) {
        return res.status(401).json({ error: 'Token manquant' })
    }

    try {
        // 2. Vérifier et décoder le token
        const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as {
            userId: number
            email: string
        }

        // 3. Ajouter userId à la requête pour l'utiliser dans les routes
        req.userId = decoded.userId

        // 4. Passer au prochain middleware ou à la route
        return next()
    } catch (error) {
        return res.status(401).json({ error: 'Token invalide ou expiré' })
    }
}
