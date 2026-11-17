import { PublicClientApplication } from '@azure/msal-browser'
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

/** Gets a token for the Power Platform API. */
async function getToken(): Promise<string> {
  await msal.initialize()
  const account = msal.getAllAccounts()[0]
  if (account) {
    try {
      return (await msal.acquireTokenSilent({ scopes, account })).accessToken
    } catch {
      // No token without the user. Go on to the sign-in window.
    }
  }
  // A code app runs in a frame, so the sign-in has to open in its own window.
  return (await msal.loginPopup({ scopes })).accessToken
}

/** Signs the user in and returns a client that talks to the agent. */
export async function connectToAgent(): Promise<CopilotStudioClient> {
  return new CopilotStudioClient(settings, await getToken())
}
