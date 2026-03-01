import { Request, Response, Router } from 'express'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { prisma } from "../database";
// import { authenticateToken } from "../auth.middleware";

export const authRouter = Router()

/**
 * Endpoint d'inscription utilisateur (Sign Up)
 * 
 * Crée un nouveau compte utilisateur avec email, username et mot de passe.
 * Le mot de passe est hashé avec bcrypt avant stockage en base de données.
 * Retourne un token JWT valide 7 jours.
 * 
 * @route POST /auth/sign-up
 * @access Public
 * 
 * @param {Object} req.body - Données d'inscription
 * @param {string} req.body.email - Email unique de l'utilisateur (requis)
 * @param {string} req.body.username - Nom d'utilisateur unique (requis)
 * @param {string} req.body.password - Mot de passe en clair (requis, sera hashé)
 * 
 * @returns {201} {message: string, token: string, user: {email, username}} - Inscription réussie avec token JWT
 * @returns {400} {error: "Données non completes"} - Données manquantes ou invalides
 * @returns {409} {error: "Username ou mail invalide"} - Email ou username déjà existant
 * @returns {500} {error: "Erreur serveur"} - Erreur interne du serveur
 * 
 * @throws {400} Si email, username ou password est manquant
 * @throws {409} Si l'email ou le username existe déjà
 * @throws {500} En cas d'erreur lors de la création utilisateur ou du hashage du mot de passe
 * 
 * @example
 * POST /auth/sign-up
 * Content-Type: application/json
 * {
 *   "email": "user@example.com",
 *   "username": "john_doe",
 *   "password": "securePassword123"
 * }
 * 
 * Réponse (201):
 * {
 *   "message": "Inscription réussie",
 *   "token": "eyJhbGciOiJIUzI1NiIs...",
 *   "user": {
 *     "email": "user@example.com",
 *     "username": "john_doe"
 *   }
 * }
 */
authRouter.post('/sign-up', async (req: Request, res: Response) => {
    const { email, username, password } = req.body

    try {
        // 1.Valide les données
        if (!email || !username || !password) {
            return res.status(400).json({ error: "Données non completes" })
        }

        // 2.Verifie unicité de l'email
        const user = await prisma.user.findFirst({
            where: { OR: [{ email }, { username }] },
        })
        if (user) {
            return res.status(409).json({ error: "Username ou mail invalide" })
        }

        // 3.hash mdp
        const hashedPassword = await bcrypt.hash(password, 10)


        // 4.genere token
        const token = jwt.sign(
            {
                username: username,
                email: email,
            },
            process.env.JWT_SECRET as string,
            { expiresIn: '7d' }, // Le token expire dans 7 jours
        )

        // 5.créer le user
        await prisma.user.create({
            data: {
                email,
                username,
                password: hashedPassword,
            },
            select: {
                id: true,
                username: true,
                email: true,
            }
        })

        return res.status(201).json({
            message: 'Inscription réussie',
            token,
            user: {
                email,
                username,
            },
        })
    }
    catch (error) {
        console.error('Erreur lors de l inscription:', error)
        return res.status(500).json({ error: 'Erreur serveur' })
    }
})

/**
 * Endpoint de connexion utilisateur (Sign In)
 * 
 * Authentifie un utilisateur avec son email et mot de passe.
 * Valide le mot de passe contre le hash stocké en base de données.
 * Retourne un token JWT valide 1 heure.
 * 
 * @route POST /auth/sign-in
 * @access Public
 * 
 * @param {Object} req.body - Identifiants de connexion
 * @param {string} req.body.email - Email de l'utilisateur (requis)
 * @param {string} req.body.password - Mot de passe en clair (requis)
 * 
 * @returns {200} {message: string, token: string, user: {id, name, email}} - Connexion réussie avec token JWT
 * @returns {401} {error: "Email ou mot de passe incorrect"} - Email inexistant ou mot de passe incorrect
 * @returns {500} {error: "Erreur serveur"} - Erreur interne du serveur
 * 
 * @throws {401} Si l'utilisateur n'existe pas ou si le mot de passe est incorrect
 * @throws {500} En cas d'erreur lors de la vérification du mot de passe ou de la génération du token
 * 
 * @example
 * POST /auth/sign-in
 * Content-Type: application/json
 * {
 *   "email": "user@example.com",
 *   "password": "securePassword123"
 * }
 * 
 * Réponse (200):
 * {
 *   "message": "Connexion réussie",
 *   "token": "eyJhbGciOiJIUzI1NiIs...",
 *   "user": {
 *     "id": 1,
 *     "name": "john_doe",
 *     "email": "user@example.com"
 *   }
 * }
 */
authRouter.post('/sign-in', async (req: Request, res: Response) => {
    const { email, password } = req.body

    try {
        // 1. Vérifier que l'utilisateur existe
        const user = await prisma.user.findUnique({
            where: { email },
        })

        if (!user) {
            return res.status(401).json({ error: 'Email ou mot de passe incorrect' })
        }

        // 2. Vérifier le mot de passe
        const isPasswordValid = await bcrypt.compare(password, user.password)

        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Email ou mot de passe incorrect' })
        }

        // 3. Générer le JWT
        const token = jwt.sign(
            {
                userId: user.id,
                email: user.email,
            },
            process.env.JWT_SECRET as string,
            { expiresIn: '1h' }, // Le token expire dans 1 heure
        )

        // 4. Retourner le token
        return res.status(200).json({
            message: 'Connexion réussie',
            token,
            user: {
                id: user.id,
                name: user.username,
                email: user.email,
            },
        })
    } catch (error) {
        console.error('Erreur lors de la connexion:', error)
        return res.status(500).json({ error: 'Erreur serveur' })
    }
})
