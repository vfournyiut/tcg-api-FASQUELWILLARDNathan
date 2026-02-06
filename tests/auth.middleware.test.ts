import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { authenticateToken } from '../src/auth.middleware'

vi.mock('jsonwebtoken')

describe('authenticateToken middleware', () => {
    let req: Partial<Request>
    let res: Partial<Response>
    let next: NextFunction
    let jsonSpy: any

    beforeEach(() => {
        req = {
            headers: {},
        }
        res = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn().mockReturnThis(),
        }
        next = vi.fn()
        jsonSpy = vi.spyOn(jwt, 'verify')
    })

    it('should return 401 if token is missing', () => {
        authenticateToken(req as Request, res as Response, next)

        expect(res.status).toHaveBeenCalledWith(401)
        expect(res.json).toHaveBeenCalledWith({ error: 'Token manquant' })
        expect(next).not.toHaveBeenCalled()
    })

    it('should return 401 if authorization header is present but token is missing', () => {
        req.headers = { authorization: 'Bearer ' }

        authenticateToken(req as Request, res as Response, next)

        expect(res.status).toHaveBeenCalledWith(401)
        expect(res.json).toHaveBeenCalledWith({ error: 'Token manquant' })
    })

    it('should set userId and call next if token is valid', () => {
        const validToken = 'valid-jwt-token'
        const decodedToken = { userId: 1, email: 'test@example.com' }

        req.headers = { authorization: `Bearer ${validToken}` }
        jsonSpy.mockReturnValue(decodedToken)

        authenticateToken(req as Request, res as Response, next)

        expect(req.userId).toBe(1)
        expect(next).toHaveBeenCalled()
        expect(res.status).not.toHaveBeenCalled()
    })

    it('should return 401 if token is invalid', () => {
        const invalidToken = 'invalid-jwt-token'

        req.headers = { authorization: `Bearer ${invalidToken}` }
        jsonSpy.mockImplementation(() => {
            throw new Error('Invalid token')
        })

        authenticateToken(req as Request, res as Response, next)

        expect(res.status).toHaveBeenCalledWith(401)
        expect(res.json).toHaveBeenCalledWith({ error: 'Token invalide ou expiré' })
        expect(next).not.toHaveBeenCalled()
    })

    it('should return 401 if token is expired', () => {
        const expiredToken = 'expired-jwt-token'

        req.headers = { authorization: `Bearer ${expiredToken}` }
        jsonSpy.mockImplementation(() => {
            const error = new Error('Token expired')
            ;(error as any).name = 'TokenExpiredError'
            throw error
        })

        authenticateToken(req as Request, res as Response, next)

        expect(res.status).toHaveBeenCalledWith(401)
        expect(res.json).toHaveBeenCalledWith({ error: 'Token invalide ou expiré' })
    })

    it('should extract token correctly from Bearer format', () => {
        const token = 'my-secret-token'
        const decodedToken = { userId: 2, email: 'user@example.com' }

        req.headers = { authorization: `Bearer ${token}` }
        jsonSpy.mockReturnValue(decodedToken)

        authenticateToken(req as Request, res as Response, next)

        expect(jsonSpy).toHaveBeenCalledWith(token, process.env.JWT_SECRET)
    })

    it('should handle missing authorization header gracefully', () => {
        req.headers = {}

        authenticateToken(req as Request, res as Response, next)

        expect(res.status).toHaveBeenCalledWith(401)
        expect(res.json).toHaveBeenCalledWith({ error: 'Token manquant' })
    })
})
