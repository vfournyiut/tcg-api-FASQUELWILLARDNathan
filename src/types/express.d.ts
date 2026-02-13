import 'express'

declare module 'express' {
  interface Request {
    user?: {
      userId: number
      email: string
    }
  }
}

declare module 'express-serve-static-core' {
  interface Request {
    userId?: number
  }
}

