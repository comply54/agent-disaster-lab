"use client"

import {
  createContext, useContext, useEffect, useState, useCallback, useMemo,
} from "react"
import { createClient } from "@/lib/supabase/client"
import type { User } from "@supabase/supabase-js"

export interface AuthState {
  user: User | null
  username: string | null
  loading: boolean
  // Modals
  authModalOpen: boolean
  usernameModalOpen: boolean
  openAuthModal: () => void
  closeAuthModal: () => void
  // Auth actions
  signInWithEmail: (email: string) => Promise<{ error?: string }>
  signInWithGoogle: () => Promise<{ error?: string }>
  signOut: () => Promise<void>
  // Profile actions
  createProfile: (username: string) => Promise<{ error?: string }>
  checkUsername: (username: string) => Promise<boolean>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => createClient(), [])

  const [user, setUser] = useState<User | null>(null)
  const [username, setUsername] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [usernameModalOpen, setUsernameModalOpen] = useState(false)

  const fetchProfile = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", userId)
      .single()

    if (data?.username) {
      setUsername(data.username)
    } else {
      // Signed in but no username yet
      setUsernameModalOpen(true)
    }
  }, [supabase])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const nextUser = session?.user ?? null
        setUser(nextUser)
        if (nextUser) {
          await fetchProfile(nextUser.id)
        } else {
          setUsername(null)
          setUsernameModalOpen(false)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [supabase, fetchProfile])

  const signInWithEmail = async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    return { error: error?.message }
  }

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    return { error: error?.message }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setUsername(null)
  }

  const createProfile = async (uname: string): Promise<{ error?: string }> => {
    if (!user) return { error: "Not signed in" }
    const { error } = await supabase
      .from("profiles")
      .insert({ id: user.id, username: uname })
    if (error) return { error: error.message }
    setUsername(uname)
    setUsernameModalOpen(false)
    return {}
  }

  const checkUsername = async (uname: string): Promise<boolean> => {
    if (uname.length < 3) return false
    const { data } = await supabase
      .from("profiles")
      .select("username")
      .ilike("username", uname)
      .maybeSingle()
    return !data // true = available
  }

  return (
    <AuthContext.Provider value={{
      user, username, loading,
      authModalOpen, usernameModalOpen,
      openAuthModal: () => setAuthModalOpen(true),
      closeAuthModal: () => setAuthModalOpen(false),
      signInWithEmail, signInWithGoogle, signOut,
      createProfile, checkUsername,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}
