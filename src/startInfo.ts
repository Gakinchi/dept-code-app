import { getContext } from '@microsoft/power-apps/app'

export type StartInfo = {
  /** Query parameters the app was opened with, for example { caseId: '...' }. */
  params: Record<string, string>
  /** Link to this app in the Power Apps player. Empty when the app runs on its own (vite dev). */
  playUrl: string
}

/**
 * Reads how the app was opened.
 *
 * In the Power Apps player the app runs inside an iframe, so window.location is not the address
 * the user sees. The player hands the query parameters over through getContext().
 * Outside the player getContext() never answers, so there the app reads its own address.
 */
export async function readStartInfo(): Promise<StartInfo> {
  const inPlayer = window.self !== window.top
  if (!inPlayer) {
    return { params: Object.fromEntries(new URLSearchParams(window.location.search)), playUrl: '' }
  }
  const ctx = await getContext()
  const playUrl =
    ctx.app.appUrl ?? `https://apps.powerapps.com/play/e/${ctx.app.environmentId}/a/${ctx.app.appId}`
  return { params: ctx.app.queryParams ?? {}, playUrl }
}

/** Finds a parameter whatever casing the link used: caseId, caseid, CASEID. */
export function findParam(params: Record<string, string>, name: string): string | undefined {
  const key = Object.keys(params).find((k) => k.toLowerCase() === name.toLowerCase())
  return key ? params[key] : undefined
}

/** Builds a link that opens the app on one case. */
export function caseLink(playUrl: string, caseId: string): string {
  if (!playUrl) return `${window.location.origin}${window.location.pathname}?caseId=${caseId}`
  const url = new URL(playUrl)
  url.searchParams.set('caseId', caseId)
  return url.toString()
}
