import { PublicClientApplication } from '@azure/msal-browser'
import { getContext } from '@microsoft/power-apps/app'
import { ConnectionSettings, CopilotStudioClient, ScopeHelper } from '@microsoft/agents-copilotstudio-client'

// None of these values are secrets: a single-page app registration has no client secret.
const tenantId = 'd4cfddc3-1c78-4cbc-8b42-c169b6aad343' // Directory (tenant) ID of the app registration
const appClientId = 'e7414022-118a-42b1-b4ab-b6c64bd58ac3' // Application (client) ID of the app registration
const environmentId = '1f1bf6da-187f-e015-adb4-b4eb3c59d14d' // Copilot Studio > agent > Settings > Advanced > Metadata
const schemaName = 'dept_DeptCaseHelper' // same place

const settings = new ConnectionSettings({ environmentId, schemaName })
const scopes = [ScopeHelper.getScopeFromSettings(settings)]

const msal = new PublicClientApplication({
  auth: {
    clientId: appClientId,
    authority: `https://login.microsoftonline.com/${tenantId}`,
    // The address the sign-in window returns to. The app's own origin is registered on the
    // app registration and stays the same after every pa app push.
    redirectUri: window.location.origin,
  },
})

/** Signs the user in and returns a client that talks to the agent. */
export async function connectToAgent(silent: boolean): Promise<CopilotStudioClient> {
  await msal.initialize()
  const { user } = await getContext()
  const request = { scopes, loginHint: user.userPrincipalName }
  // silent: a hidden frame reuses the user's Microsoft sign-in from Power Apps, no window.
  // Otherwise a sign-in window, which the browser only opens after a click.
  const result = silent ? await msal.ssoSilent(request) : await msal.loginPopup(request)
  return new CopilotStudioClient(settings, result.accessToken)
}
