import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import Express from 'express'
import request from 'supertest'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { authRouter } from '../src/routes/auth.routes'
import { prismaMock } from './vitest.setup'

vi.mock('bcrypt')
vi.mock('jsonwebtoken')

describe('Auth Routes Integration Tests', () => {
    let app: Express.Application
    const mockUser = {
        id: 1,
        email: 'test@example.com',
        username: 'testuser',
        password: 'hashed-password',
        createdAt: new Date(),
        updatedAt: new Date(),
    }

    beforeEach(() => {
        app = Express()
        app.use(Express.json())
        app.use('/auth', authRouter)
        vi.clearAllMocks()
    })

    afterEach(() => {
        vi.clearAllMocks()
    })

    describe('POST /sign-up', () => {
        it('should return 400 if email is missing', async () => {
            const response = await request(app)
                .post('/auth/sign-up')
                .send({ username: 'test', password: 'password123' })

            expect(response.status).toBe(400)
            expect(response.body.error).toBe('Données non completes')
        })

        it('should return 400 if username is missing', async () => {
            const response = await request(app)
                .post('/auth/sign-up')
                .send({ email: 'test@example.com', password: 'password123' })

            expect(response.status).toBe(400)
            expect(response.body.error).toBe('Données non completes')
        })

        it('should return 400 if password is missing', async () => {
            const response = await request(app)
                .post('/auth/sign-up')
                .send({ email: 'test@example.com', username: 'test' })

            expect(response.status).toBe(400)
            expect(response.body.error).toBe('Données non completes')
        })

        it('should return 409 if email already exists', async () => {
            prismaMock.user.findFirst.mockResolvedValue(mockUser)

            const response = await request(app)
                .post('/auth/sign-up')
                .send({
                    email: 'test@example.com',
                    username: 'newuser',
                    password: 'password123',
                })

            expect(response.status).toBe(409)
            expect(response.body.error).toBe('Username ou mail invalide')
        })

        it('should return 409 if username already exists', async () => {
            prismaMock.user.findFirst.mockResolvedValue(mockUser)

            const response = await request(app)
                .post('/auth/sign-up')
                .send({
                    email: 'new@example.com',
                    username: 'testuser',
                    password: 'password123',
                })

            expect(response.status).toBe(409)
            expect(response.body.error).toBe('Username ou mail invalide')
        })

        it('should create user and return token on success', async () => {
            prismaMock.user.findFirst.mockResolvedValue(null)
            ;(bcrypt.hash as any).mockResolvedValue('hashed-password')
            ;(jwt.sign as any).mockReturnValue('jwt-token')
            prismaMock.user.create.mockResolvedValue({
                id: 2,
                email: 'new@example.com',
                username: 'newuser',
                password: 'hashed-password',
                createdAt: new Date(),
                updatedAt: new Date()
            })

            const response = await request(app)
                .post('/auth/sign-up')
                .send({
                    email: 'new@example.com',
                    username: 'newuser',
                    password: 'password123',
                })

            expect(response.status).toBe(201)
            expect(response.body.message).toBe('Inscription réussie')
            expect(response.body.token).toBe('jwt-token')
            expect(response.body.user.email).toBe('new@example.com')
        })

        it('should hash password with bcrypt', async () => {
            prismaMock.user.findFirst.mockResolvedValue(null)
            ;(bcrypt.hash as any).mockResolvedValue('hashed-password')
            ;(jwt.sign as any).mockReturnValue('jwt-token')
            prismaMock.user.create.mockResolvedValue({
                id: 2,
                email: 'test@example.com',
                username: 'testuser',
                password: 'hashed-password',
                createdAt: new Date(),
                updatedAt: new Date()
            })

            await request(app)
                .post('/auth/sign-up')
                .send({
                    email: 'test@example.com',
                    username: 'testuser',
                    password: 'password123',
                })

            expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10)
        })

        it('should return 500 on server error', async () => {
            prismaMock.user.findFirst.mockRejectedValue(
                new Error('Database error')
            )

            const response = await request(app)
                .post('/auth/sign-up')
                .send({
                    email: 'test@example.com',
                    username: 'testuser',
                    password: 'password123',
                })

            expect(response.status).toBe(500)
            expect(response.body.error).toBe('Erreur serveur')
        })
    })

    describe('POST /sign-in', () => {
        it('should return 401 if user not found', async () => {
            prismaMock.user.findUnique.mockResolvedValue(null)

            const response = await request(app)
                .post('/auth/sign-in')
                .send({ email: 'test@example.com', password: 'password123' })

            expect(response.status).toBe(401)
            expect(response.body.error).toBe('Email ou mot de passe incorrect')
        })

        it('should return 401 if password is incorrect', async () => {
            prismaMock.user.findUnique.mockResolvedValue(mockUser)
            ;(bcrypt.compare as any).mockResolvedValue(false)

            const response = await request(app)
                .post('/auth/sign-in')
                .send({ email: 'test@example.com', password: 'wrongpassword' })

            expect(response.status).toBe(401)
            expect(response.body.error).toBe('Email ou mot de passe incorrect')
        })

        it('should return token on successful login', async () => {
            prismaMock.user.findUnique.mockResolvedValue(mockUser)
            ;(bcrypt.compare as any).mockResolvedValue(true)
            ;(jwt.sign as any).mockReturnValue('jwt-token')

            const response = await request(app)
                .post('/auth/sign-in')
                .send({ email: 'test@example.com', password: 'password123' })

            expect(response.status).toBe(200)
            expect(response.body.message).toBe('Connexion réussie')
            expect(response.body.token).toBe('jwt-token')
            expect(response.body.user.id).toBe(1)
        })

        it('should compare password with bcrypt', async () => {
            prismaMock.user.findUnique.mockResolvedValue(mockUser)
            ;(bcrypt.compare as any).mockResolvedValue(true)
            ;(jwt.sign as any).mockReturnValue('jwt-token')

            await request(app)
                .post('/auth/sign-in')
                .send({ email: 'test@example.com', password: 'password123' })

            expect(bcrypt.compare).toHaveBeenCalledWith(
                'password123',
                mockUser.password
            )
        })

        it('should return 500 on server error', async () => {
            prismaMock.user.findUnique.mockRejectedValue(
                new Error('Database error')
            )

            const response = await request(app)
                .post('/auth/sign-in')
                .send({ email: 'test@example.com', password: 'password123' })

            expect(response.status).toBe(500)
            expect(response.body.error).toBe('Erreur serveur')
        })

        it('should generate JWT with userId in payload', async () => {
            prismaMock.user.findUnique.mockResolvedValue(mockUser)
            ;(bcrypt.compare as any).mockResolvedValue(true)
            ;(jwt.sign as any).mockReturnValue('jwt-token')

            await request(app)
                .post('/auth/sign-in')
                .send({ email: 'test@example.com', password: 'password123' })

            expect(jwt.sign).toHaveBeenCalledWith(
                expect.objectContaining({
                    userId: mockUser.id,
                    email: mockUser.email,
                }),
                process.env.JWT_SECRET,
                expect.objectContaining({
                    expiresIn: '1h'
                })
            )
        })
    })
})
