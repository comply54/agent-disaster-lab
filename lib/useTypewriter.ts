"use client"

import { useState, useEffect } from "react"

export function useTypewriter(text: string, speedMs: number = 18): string {
  const [displayed, setDisplayed] = useState("")

  useEffect(() => {
    setDisplayed("")
    if (!text) return

    let i = 0
    const id = setInterval(() => {
      i++
      setDisplayed(text.slice(0, i))
      if (i >= text.length) clearInterval(id)
    }, speedMs)

    return () => clearInterval(id)
  }, [text, speedMs])

  return displayed
}
