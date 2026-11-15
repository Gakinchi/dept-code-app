/**
 * Where the chat panel finds the agent and how the user signs in.
 * None of these values are secrets: a single-page app registration has no client secret.
 */
export const agentConfig = {
  /** Directory (tenant) ID of the app registration. */
  tenantId: 'd4cfddc3-1c78-4cbc-8b42-c169b6aad343',
  /** Application (client) ID of the app registration "Dept Case App agent chat". */
  appClientId: 'e7414022-118a-42b1-b4ab-b6c64bd58ac3',
  /** Copilot Studio > agent > Settings > Advanced > Metadata. */
  environmentId: '1f1bf6da-187f-e015-adb4-b4eb3c59d14d',
  schemaName: 'dept_DeptCaseHelper',
}
