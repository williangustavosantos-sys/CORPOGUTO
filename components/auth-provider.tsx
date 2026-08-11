"use client"

import React, { createContext, useContext, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AuthUser, getMe, LoginResponse, logout as apiLogout } from "@/lib/api/auth"
import { setApiAuthToken } from "@/lib/api/client"

interface AuthContextType {
  user: AuthUser | null
  token: string | null
  isLoading: boolean
  login: (data: LoginResponse) => void
  logout: () => void
  refreshMe: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

function readStoredToken() {
  try {
    return localStorage.getItem("guto-auth-token")
  } catch {
    return null
  }
}

function writeStoredToken(token: string) {
  try {
    localStorage.setItem("guto-auth-token", token)
  } catch {
    // Safari/private browsing can block storage; keep the session in React state.
  }
}

function removeStoredToken() {
  try {
    localStorage.removeItem("guto-auth-token")
  } catch {
    // Storage is optional for first-run access.
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  const refreshMe = async () => {
    try {
      const me = await getMe()
      setUser(me)
    } catch (err) {
      console.error("Failed to refresh user info:", err)
      logout()
    }
  }

  const login = (data: LoginResponse) => {
    setApiAuthToken(data.token)
    writeStoredToken(data.token)
    setToken(data.token)
    setUser({
      userId: data.userId,
      name: data.name,
      email: data.email,
      role: data.role,
      coachId: data.coachId,
      teamId: data.teamId,
      subscriptionStatus: data.subscriptionStatus,
      subscriptionEndsAt: data.subscriptionEndsAt,
    })
  }

  const logout = () => {
    setApiAuthToken(null)
    removeStoredToken()
    setToken(null)
    setUser(null)
    void apiLogout().catch(() => {})
    router.push("/login")
  }

  useEffect(() => {
    const storedToken = readStoredToken()
    if (storedToken) {
      setApiAuthToken(storedToken)
      setToken(storedToken)
      getMe()
        .then((me) => {
          setUser(me)
          setIsLoading(false)
        })
        .catch(() => {
          setApiAuthToken(null)
          removeStoredToken()
          setToken(null)
          setUser(null)
          setIsLoading(false)
        })
    } else {
      setApiAuthToken(null)
      setIsLoading(false)
    }
  }, [])

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout, refreshMe }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
