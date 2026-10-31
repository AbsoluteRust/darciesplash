import NextAuth, { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      roles?: {
        commissioner: boolean
        darsubscribbler: boolean
      }
    } & DefaultSession["user"]
  }

  interface User {
    roles?: {
      commissioner: boolean
      darsubscribbler: boolean
    }
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    roles?: {
      commissioner: boolean
      darsubscribbler: boolean
    }
  }
}