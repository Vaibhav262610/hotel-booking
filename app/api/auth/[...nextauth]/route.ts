import NextAuth from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { supabaseAuth } from "@/lib/supabase"

export const authOptions = {
  session: { 
    strategy: "jwt" as const,
    maxAge: 7 * 24 * 60 * 60, // 7 days (in seconds)
    updateAge: 60 * 60, // 1 hour (in seconds) - refresh token every hour
  },
  jwt: {
    maxAge: 7 * 24 * 60 * 60, // 7 days (in seconds)
  },
  pages: {
    signIn: '/login',
    signOut: '/login',
    error: '/login',
  },
  providers: [
    CredentialsProvider({
      name: "Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        try {
          const email = credentials?.email as string
          const password = credentials?.password as string
          
          if (!email || !password) {
            throw new Error("Missing email or password")
          }

          // 1) Verify password via Supabase
          const { data: verifyData, error: verifyError } = await supabaseAuth.auth.signInWithPassword({
            email,
            password
          })
          
          if (verifyError) {
            throw new Error(verifyError.message || "Invalid password")
          }
          
          if (!verifyData?.user) {
            throw new Error("Invalid password")
          }

          const authUser = verifyData.user

          // 2) Ensure staff profile exists (auth_user_id linked)
          const { data: staff, error: staffError } = await supabaseAuth
            .from("staff")
            .select("id, role, email, name")
            .eq("auth_user_id", authUser.id)
            .single()

          if (staffError) {
            throw new Error(`No profile found. Please sign up first. Error: ${staffError.message}`)
          }
          
          if (!staff) {
            throw new Error("No profile found. Please sign up first.")
          }

          return {
            id: authUser.id,
            email: authUser.email,
            name: staff.name || authUser.user_metadata?.name || undefined,
            role: staff.role,
            staffId: staff.id
          } as any
        } catch (error) {
          console.error('NextAuth authorize error:', error)
          throw error
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }: any) {
      // Initial sign in
      if (user) {
        token.sub = user.id
        token.email = user.email
        token.name = user.name
        token.role = user.role
        token.staffId = user.staffId
        token.iat = Math.floor(Date.now() / 1000) // Issued at
        token.exp = Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60) // Expires in 7 days
      }
      
      // Check if token is expired
      if (token.exp && Date.now() >= token.exp * 1000) {
        throw new Error('Token expired')
      }
      
      return token
    },
    async session({ session, token }: any) {
      if (session.user) {
        session.user.id = token.sub
        session.user.role = token.role
        session.user.staffId = token.staffId
      }
      return session
    }
  }
}

const handler = NextAuth(authOptions as any)
export { handler as GET, handler as POST }


