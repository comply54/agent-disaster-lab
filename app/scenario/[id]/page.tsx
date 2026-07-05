import { notFound } from "next/navigation"
import { getScenario } from "@/lib/scenarios"
import { ScenarioRunner } from "@/components/ScenarioRunner"

interface Props {
  params: Promise<{ id: string }>
}

export default async function ScenarioPage({ params }: Props) {
  const { id } = await params
  const scenario = getScenario(id)

  if (!scenario) notFound()

  return <ScenarioRunner scenario={scenario} />
}

export async function generateStaticParams() {
  const { scenarios } = await import("@/lib/scenarios")
  return scenarios.map((s) => ({ id: s.id }))
}
