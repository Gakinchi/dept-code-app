import { InteractionRequiredAuthError, PublicClientApplication } from '@azure/msal-browser'
import { ConnectionSettings, CopilotStudioClient } from '@microsoft/agents-copilotstudio-client'
import { agentConfig } from './agentConfig'

const settings = new ConnectionSettings({
  environmentId: agentConfig.environmentId,
  schemaName: agentConfig.schemaName,
})

// The address the sign-in window returns to. It must be registered on the app registration,
// character for character. The app's own origin is the same after every pa app push.
const redirectUri = window.location.origin

const msal = new PublicClientApplication({
  auth: {
    clientId: agentConfig.appClientId,
    authority: `https://login.microsoftonline.com/${agentConfig.tenantId}`,
    redirectUri,
  },
  cache: { cacheLocation: 'sessionStorage' },
})

/** Gets a token for the Power Platform API, with a sign-in window the first time. */
async function getToken(): Promise<string> {
  await msal.initialize()
  const request = { scopes: [CopilotStudioClient.scopeFromSettings(settings)], redirectUri }

  const account = msal.getAllAccounts()[0]
  if (account) {
    try {
      return (await msal.acquireTokenSilent({ ...request, account })).accessToken
    } catch (e) {
      if (!(e instanceof InteractionRequiredAuthError)) throw e
    }
  }
  // A code app runs inside an iframe, where a full-page redirect to the sign-in page is not
  // possible. The sign-in has to open in its own window.
  return (await msal.loginPopup(request)).accessToken
}

/** Signs the user in and returns a client that talks to the agent. */
export async function connectToAgent(): Promise<CopilotStudioClient> {
  return new CopilotStudioClient(settings, await getToken())
}
