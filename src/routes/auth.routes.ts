import { Request, Response, Router } from 'express'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { prisma } from '../database'
// import { authenticateToken } from "../auth.middleware";

export const authRouter = Router()

// POST /auth/register
// Accessible via POST /auth/register
authRouter.post('/sign-up', async (req: Request, res: Response) => {
  const { email, username, password } = req.body

  try {
    // 1.Valide les données
    if (!email || !username || !password) {
      return res.status(400).json({ error: 'Données non completes' })
    }

    // 2.Verifie unicité de l'email
    const user = await prisma.user.findFirst({
      where: { OR: [{ email }, { username }] },
    })
    if (user) {
      return res.status(409).json({ error: 'Username ou mail invalide' })
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
      },
    })

    return res.status(201).json({
      message: 'Inscription réussie',
      token,
      user: {
        email,
        username,
      },
    })
  } catch (error) {
    console.error('Erreur lors de l inscription:', error)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
})

// POST /auth/login
// Accessible via POST /auth/login
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
