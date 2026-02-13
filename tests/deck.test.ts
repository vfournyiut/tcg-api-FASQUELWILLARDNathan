import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import Express, { Request, Response } from 'express'
import request from 'supertest'
import jwt from 'jsonwebtoken'
import { decksRouter } from '../src/routes/decks.routes'
import { prismaMock } from './vitest.setup'
import { PokemonType } from '../src/generated/prisma/enums'

vi.mock('jsonwebtoken')

describe('Decks Routes Integration Tests', () => {
    let app: Express.Application
    const validToken = 'valid.jwt.token'

    const mockDeck = {
        id: 1,
        name: 'My Deck',
        userid: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        deckCards: [
            { id: 1, deckId: 1, cardId: 1 },
            { id: 2, deckId: 1, cardId: 2 },
            { id: 3, deckId: 1, cardId: 3 },
            { id: 4, deckId: 1, cardId: 4 },
            { id: 5, deckId: 1, cardId: 5 },
            { id: 6, deckId: 1, cardId: 6 },
            { id: 7, deckId: 1, cardId: 7 },
            { id: 8, deckId: 1, cardId: 8 },
            { id: 9, deckId: 1, cardId: 9 },
            { id: 10, deckId: 1, cardId: 10 },
        ],
    }

    const mockCards = Array.from({ length: 10 }, (_, i) => ({
        id: i + 1,
        name: `Pokemon${i + 1}`,
        hp: 30 + i,
        attack: 40 + i,
        type: 'Normal' as PokemonType,
        pokedexNumber: i + 1,
        imgUrl: `https://example.com/pokemon${i + 1}.png`,
        createdAt: new Date(),
        updatedAt: new Date(),
    }))

    beforeEach(() => {
        app = Express()
        app.use(Express.json())

        // Mock jwt.verify to return decoded token
        ;(jwt.verify as any).mockReturnValue({ userId: 1, email: 'test@test.com' })

        app.use('/decks', decksRouter)
        vi.clearAllMocks()
    })

    afterEach(() => {
        vi.clearAllMocks()
    })

    it('should handle missing or invalid token', async () => {
        // Test request without token
        const response = await request(app)
            .post('/decks')
            .send({
                name: 'New Deck',
                cards: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
            })

        expect(response.status).toBe(401)
        expect(response.body.error).toBe('Token manquant')
    })

    describe('POST /decks', () => {
        it('should create a deck with valid data', async () => {
            prismaMock.card.findMany.mockResolvedValue(mockCards)
            prismaMock.deck.create.mockResolvedValue(mockDeck)

            const response = await request(app)
                .post('/decks')
                .set('Authorization', `Bearer ${validToken}`)
                .send({
                    name: 'New Deck',
                    cards: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
                })

            expect(response.status).toBe(201)
            expect(response.body.message).toBe('Deck créé')
        })

        it('should return 400 if deck name is missing', async () => {
            const response = await request(app)
                .post('/decks')
                .set('Authorization', `Bearer ${validToken}`)
                .send({ cards: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] })

            expect(response.status).toBe(400)
            expect(response.body.error).toBe('Nom manquant')
        })

        it('should return 400 if cards array does not have exactly 10 cards', async () => {
            const response = await request(app)
                .post('/decks')
                .set('Authorization', `Bearer ${validToken}`)
                .send({
                    name: 'Invalid Deck',
                    cards: [1, 2, 3, 4, 5],
                })

            expect(response.status).toBe(400)
            expect(response.body.error).toBe(
                'Un deck doit contenir 10 cartes exactement'
            )
        })

        it('should return 400 if cards array has more than 10 cards', async () => {
            const response = await request(app)
                .post('/decks')
                .set('Authorization', `Bearer ${validToken}`)
                .send({
                    name: 'Invalid Deck',
                    cards: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
                })

            expect(response.status).toBe(400)
            expect(response.body.error).toBe(
                'Un deck doit contenir 10 cartes exactement'
            )
        })

        it('should return 400 if some cards are invalid', async () => {
            prismaMock.card.findMany.mockResolvedValue(mockCards.slice(0, 9))

            const response = await request(app)
                .post('/decks')
                .set('Authorization', `Bearer ${validToken}`)
                .send({
                    name: 'Invalid Deck',
                    cards: [1, 2, 3, 4, 5, 6, 7, 8, 9, 999],
                })

            expect(response.status).toBe(400)
            expect(response.body.error).toBe('Certaines cartes sont invalides')
        })

        it('should return 401 if user is not authenticated', async () => {
            // Create a new app without jwt mock for this test
            const testApp = Express()
            testApp.use(Express.json())
            testApp.use('/decks', decksRouter)

            const response = await request(testApp)
                .post('/decks')
                .send({
                    name: 'New Deck',
                    cards: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
                })

            expect(response.status).toBe(401)
            expect(response.body.error).toBe('Token manquant')
        })

        it('should return 500 on database error', async () => {
            prismaMock.card.findMany.mockRejectedValue(
                new Error('Database error')
            )

            const response = await request(app)
                .post('/decks')
                .set('Authorization', `Bearer ${validToken}`)
                .send({
                    name: 'New Deck',
                    cards: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
                })

            expect(response.status).toBe(500)
            expect(response.body.error).toBe('Erreur serveur')
        })

        it('should create deck cards with correct cardId', async () => {
            prismaMock.card.findMany.mockResolvedValue(mockCards)
            prismaMock.deck.create.mockResolvedValue(mockDeck)

            await request(app)
                .post('/decks')
                .set('Authorization', `Bearer ${validToken}`)
                .send({
                    name: 'New Deck',
                    cards: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
                })

            expect(prismaMock.deck.create).toHaveBeenCalled()
            const createCall = (prismaMock.deck.create as any).mock.calls[0][0]
            expect(createCall.data.deckCards.create).toHaveLength(10)
        })
    })

    describe('GET /decks/mine', () => {
        it('should return user decks', async () => {
            prismaMock.deck.findMany.mockResolvedValue([mockDeck])

            const response = await request(app)
                .get('/decks/mine')
                .set('Authorization', `Bearer ${validToken}`)

            expect(response.status).toBe(200)
            expect(response.body).toHaveLength(1)
            expect(response.body[0].userid).toBe(1)
        })

        it('should return empty array if user has no decks', async () => {
            prismaMock.deck.findMany.mockResolvedValue([])

            const response = await request(app)
                .get('/decks/mine')
                .set('Authorization', `Bearer ${validToken}`)

            expect(response.status).toBe(200)
            expect(response.body.message).toBe('Aucun deck trouvé')
        })

        it('should return 500 on database error', async () => {
            prismaMock.deck.findMany.mockRejectedValue(
                new Error('Database error')
            )

            const response = await request(app)
                .get('/decks/mine')
                .set('Authorization', `Bearer ${validToken}`)

            expect(response.status).toBe(500)
            expect(response.body.error).toBe('Erreur serveur')
        })

        it('should include all deck cards', async () => {
            prismaMock.deck.findMany.mockResolvedValue([mockDeck])

            const response = await request(app)
                .get('/decks/mine')
                .set('Authorization', `Bearer ${validToken}`)

            expect(response.body[0].deckCards).toHaveLength(10)
        })

        it('should not return decks of other users', async () => {
            prismaMock.deck.findMany.mockResolvedValue([mockDeck])

            await request(app)
                .get('/decks/mine')
                .set('Authorization', `Bearer ${validToken}`)

            expect(prismaMock.deck.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { userid: 1 },
                })
            )
        })
    })

    describe('GET /decks/:id', () => {
        it('should return deck if it belongs to the user', async () => {
            prismaMock.deck.findFirst.mockResolvedValue(mockDeck)

            const response = await request(app)
                .get('/decks/1')
                .set('Authorization', `Bearer ${validToken}`)

            expect(response.status).toBe(200)
            expect(response.body.id).toBe(1)
            expect(response.body.userid).toBe(1)
        })

        it('should return 404 if deck does not exist', async () => {
            prismaMock.deck.findFirst.mockResolvedValue(null)

            const response = await request(app)
                .get('/decks/999')
                .set('Authorization', `Bearer ${validToken}`)

            expect(response.status).toBe(404)
            expect(response.body.error).toBe('Id deck non existant')
        })

        it('should return 404 if deck belongs to another user', async () => {
            prismaMock.deck.findFirst.mockResolvedValue(null)

            const response = await request(app)
                .get('/decks/1')
                .set('Authorization', `Bearer ${validToken}`)

            expect(response.status).toBe(404)
        })

        it('should return 500 on database error', async () => {
            prismaMock.deck.findFirst.mockRejectedValue(
                new Error('Database error')
            )

            const response = await request(app)
                .get('/decks/1')
                .set('Authorization', `Bearer ${validToken}`)

            expect(response.status).toBe(500)
            expect(response.body.error).toBe('Erreur serveur')
        })

        it('should return deck with all cards', async () => {
            prismaMock.deck.findFirst.mockResolvedValue(mockDeck)

            const response = await request(app)
                .get('/decks/1')
                .set('Authorization', `Bearer ${validToken}`)

            expect(response.body.deckCards).toHaveLength(10)
        })

        it('should only return deck if it belongs to the user', async () => {
            prismaMock.deck.findFirst.mockResolvedValue(mockDeck)

            await request(app)
                .get('/decks/1')
                .set('Authorization', `Bearer ${validToken}`)

            expect(prismaMock.deck.findFirst).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        userid: 1,
                    }),
                })
            )
        })
    })

    describe('PATCH /decks/:id', () => {
        it('should update deck with valid data', async () => {
            prismaMock.deck.findFirst.mockResolvedValue(mockDeck)
            prismaMock.card.findMany.mockResolvedValue(mockCards)
            prismaMock.deck.update.mockResolvedValue({
                ...mockDeck,
                name: 'Updated Deck',
            })

            const response = await request(app)
                .patch('/decks/1')
                .set('Authorization', `Bearer ${validToken}`)
                .send({
                    name: 'Updated Deck',
                    cards: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
                })

            expect(response.status).toBe(200)
            expect(response.body.message).toBe('Deck modifier')
        })

        it('should return 404 if deck does not exist', async () => {
            prismaMock.deck.findFirst.mockResolvedValue(null)

            const response = await request(app)
                .patch('/decks/999')
                .set('Authorization', `Bearer ${validToken}`)
                .send({
                    name: 'Updated Deck',
                    cards: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
                })

            expect(response.status).toBe(404)
            expect(response.body.error).toBe('Id deck non existant')
        })

        it('should return 404 if deck belongs to another user', async () => {
            prismaMock.deck.findFirst.mockResolvedValue(null)

            const response = await request(app)
                .patch('/decks/1')
                .set('Authorization', `Bearer ${validToken}`)
                .send({
                    name: 'Updated Deck',
                    cards: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
                })

            expect(response.status).toBe(404)
        })

        it('should update deck name', async () => {
            prismaMock.deck.findFirst.mockResolvedValue(mockDeck)
            prismaMock.card.findMany.mockResolvedValue(mockCards)
            const updatedDeck = { ...mockDeck, name: 'Updated Deck' }
            prismaMock.deck.update.mockResolvedValue(updatedDeck)

            await request(app)
                .patch('/decks/1')
                .set('Authorization', `Bearer ${validToken}`)
                .send({
                    name: 'Updated Deck',
                    cards: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
                })

            expect(prismaMock.deck.update).toHaveBeenCalled()
        })

        it('should delete old cards and create new ones', async () => {
            prismaMock.deck.findFirst.mockResolvedValue(mockDeck)
            prismaMock.card.findMany.mockResolvedValue(mockCards)
            prismaMock.deck.update.mockResolvedValue(mockDeck)

            await request(app)
                .patch('/decks/1')
                .set('Authorization', `Bearer ${validToken}`)
                .send({
                    name: 'Updated Deck',
                    cards: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
                })

            // Check that update was called with deleteMany in nested deckCards
            expect(prismaMock.deck.update).toHaveBeenCalled()
            const updateCall = (prismaMock.deck.update as any).mock.calls[0][0]
            expect(updateCall.data.deckCards.deleteMany).toBeDefined()
            expect(updateCall.data.deckCards.create).toHaveLength(10)
        })

        it('should return 500 on database error', async () => {
            prismaMock.deck.findFirst.mockRejectedValue(
                new Error('Database error')
            )

            const response = await request(app)
                .patch('/decks/1')
                .set('Authorization', `Bearer ${validToken}`)
                .send({
                    name: 'Updated Deck',
                    cards: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
                })

            expect(response.status).toBe(500)
            expect(response.body.error).toBe('Erreur serveur')
        })

        it('should validate that deck has exactly 10 cards', async () => {
            const deckWithInvalidCards = {
                ...mockDeck,
                deckCards: mockDeck.deckCards.slice(0, 9),
            }
            prismaMock.deck.findFirst.mockResolvedValue(deckWithInvalidCards)

            const response = await request(app)
                .patch('/decks/1')
                .set('Authorization', `Bearer ${validToken}`)
                .send({
                    name: 'Updated Deck',
                    cards: [1, 2, 3, 4, 5, 6, 7, 8, 9],
                })

            expect(response.status).toBe(400)
        })
    })

    describe('DELETE /decks/:id', () => {
        it('should delete deck if it belongs to the user', async () => {
            prismaMock.deck.findFirst.mockResolvedValue(mockDeck)
            prismaMock.deckCard.deleteMany.mockResolvedValue({ count: 10 })
            prismaMock.deck.delete.mockResolvedValue(mockDeck)

            const response = await request(app)
                .delete('/decks/1')
                .set('Authorization', `Bearer ${validToken}`)

            expect(response.status).toBe(200)
            expect(response.body.message).toBe(' supression reussi')
        })

        it('should return 404 if deck does not exist', async () => {
            prismaMock.deck.findFirst.mockResolvedValue(null)

            const response = await request(app)
                .delete('/decks/999')
                .set('Authorization', `Bearer ${validToken}`)

            expect(response.status).toBe(404)
            expect(response.body.error).toBe('Id deck non existant')
        })

        it('should return 404 if deck belongs to another user', async () => {
            prismaMock.deck.findFirst.mockResolvedValue(null)

            const response = await request(app)
                .delete('/decks/1')
                .set('Authorization', `Bearer ${validToken}`)

            expect(response.status).toBe(404)
        })

        it('should delete all deck cards before deleting deck', async () => {
            prismaMock.deck.findFirst.mockResolvedValue(mockDeck)
            prismaMock.deckCard.deleteMany.mockResolvedValue({ count: 10 })
            prismaMock.deck.delete.mockResolvedValue(mockDeck)

            await request(app)
                .delete('/decks/1')
                .set('Authorization', `Bearer ${validToken}`)

            expect(prismaMock.deckCard.deleteMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { deckId: mockDeck.id },
                })
            )
        })

        it('should delete the deck', async () => {
            prismaMock.deck.findFirst.mockResolvedValue(mockDeck)
            prismaMock.deckCard.deleteMany.mockResolvedValue({ count: 10 })
            prismaMock.deck.delete.mockResolvedValue(mockDeck)

            await request(app)
                .delete('/decks/1')
                .set('Authorization', `Bearer ${validToken}`)

            expect(prismaMock.deck.delete).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { id: mockDeck.id },
                })
            )
        })

        it('should return 500 on database error', async () => {
            prismaMock.deck.findFirst.mockRejectedValue(
                new Error('Database error')
            )

            const response = await request(app)
                .delete('/decks/1')
                .set('Authorization', `Bearer ${validToken}`)

            expect(response.status).toBe(500)
            expect(response.body.error).toBe('Erreur serveur')
        })

        it('should not delete other user decks', async () => {
            prismaMock.deck.findFirst.mockResolvedValue(null)

            await request(app)
                .delete('/decks/1')
                .set('Authorization', `Bearer ${validToken}`)

            expect(prismaMock.deck.findFirst).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        userid: 1,
                    }),
                })
            )
        })
    })
})
