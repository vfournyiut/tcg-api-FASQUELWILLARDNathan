import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import { app } from '../src/index'
import { prismaMock } from './vitest.setup'

describe('CARDS ROUTES', () => {

    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('GET /api/cards', () => {

        it('should return a list of cards', async () => {
            prismaMock.card.findMany.mockResolvedValue([
                {
                    id: 1,
                    name: 'Pikachu',
                    hp: 60,
                    attack: 55,
                    type: 'Electric',
                    pokedexNumber: 25,
                    imgUrl: 'pikachu.png',
                    createdAt: new Date(),
                    updatedAt: new Date()
                },
                {
                    id: 2,
                    name: 'Bulbizarre',
                    hp: 45,
                    attack: 49,
                    type: 'Grass',
                    pokedexNumber: 1,
                    imgUrl: 'bulbizarre.png',
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
            ])

            const res = await request(app).get('/api/cards')

            expect(res.status).toBe(200)
            expect(res.body).toHaveProperty('cards')
            expect(res.body.cards).toHaveLength(2)
            expect(res.body.cards[0]).toHaveProperty('name', 'Pikachu')
        })

        it('should return empty array when no cards', async () => {
            prismaMock.card.findMany.mockResolvedValue([])

            const res = await request(app).get('/api/cards')

            expect(res.status).toBe(200)
            expect(res.body.cards).toEqual([])
        })

        it('should return 500 if prisma throws an error', async () => {
            prismaMock.card.findMany.mockRejectedValue(new Error('DB error'))

            const res = await request(app).get('/api/cards')

            expect(res.status).toBe(500)
            expect(res.body).toHaveProperty('error', 'Erreur serveur')
        })
    })
})
