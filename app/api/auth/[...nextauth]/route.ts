import NextAuth from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { supabaseAuth, getHotelDatabase } from "@/lib/hotel-database"

export const authOptions = {
  session: { 
    strategy: "jwt" as const,
    maxAge: 7 * 24 * 60 * 60, // 7 days
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
        password: { label: "Password", type: "password" },
        hotelId: { label: "Hotel ID", type: "text" }
      },
      async authorize(credentials) {
        try {
          const email = credentials?.email as string
          const password = credentials?.password as string
          const hotelId = credentials?.hotelId as string
          
          if (!email || !password) {
            throw new Error("Missing email or password")
          }

          if (!hotelId) {
            throw new Error("Hotel ID is required")
          }

          // Validate hotel ID
          const validHotels = ['hotel_001', 'hotel_002']
          if (!validHotels.includes(hotelId)) {
            throw new Error(`Invalid hotel ID: ${hotelId}`)
          }

          // Get hotel-specific database client
          const { client } = getHotelDatabase(hotelId)

          // Verify password via hotel-specific Supabase
          const { data: verifyData, error: verifyError } = await client.auth.signInWithPassword({
            email,
            password
          })
          
          if (verifyError) {
            throw new Error(verifyError.message || "Invalid credentials")
          }
          
          if (!verifyData?.user) {
            throw new Error("Invalid credentials")
          }

          const authUser = verifyData.user

          // Get staff profile from hotel-specific database
          const { data: staff, error: staffError } = await client
            .from("staff")
            .select("id, role, email, name")
            .eq("auth_user_id", authUser.id)
            .single()

          if (staffError) {
            throw new Error(`No profile found in ${hotelId}. Please contact administrator.`)
          }
          
          if (!staff) {
            throw new Error(`No profile found in ${hotelId}. Please contact administrator.`)
          }

          return {
            id: authUser.id,
            email: authUser.email,
            name: staff.name || authUser.user_metadata?.name || undefined,
            role: staff.role,
            staffId: staff.id,
            hotelId: hotelId
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
      if (user) {
        token.sub = user.id
        token.email = user.email
        token.name = user.name
        token.role = user.role
        token.staffId = user.staffId
        token.hotelId = user.hotelId
      }
      return token
    },
    async session({ session, token }: any) {
      if (session.user) {
        session.user.id = token.sub
        session.user.role = token.role
        session.user.staffId = token.staffId
        session.user.hotelId = token.hotelId
      }
      return session
    }
  }
}

const handler = NextAuth(authOptions as any)
export { handler as GET, handler as POST }