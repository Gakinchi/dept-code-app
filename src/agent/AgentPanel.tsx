import { useState } from 'react'
import { Activity } from '@microsoft/agents-activity'
import type { CopilotStudioClient } from '@microsoft/agents-copilotstudio-client'
import { connectToAgent } from './agentClient'
import './AgentPanel.css'

type Message = { from: 'user' | 'agent'; text: string }

/** The button that opens the chat panel. Rendered next to the app in main.tsx. */
export function AgentLauncher() {
  const [open, setOpen] = useState(false)
  if (open) return <AgentPanel onClose={() => setOpen(false)} />
  return (
    <button type="button" className="agent-toggle" onClick={() => setOpen(true)}>
      Ask the helper
    </button>
  )
}

/** A chat panel beside the app. The conversation is with a Copilot Studio agent. */
function AgentPanel({ onClose }: { onClose: () => void }) {
  // The client exists once the user has signed in and the conversation has started.
  const [client, setClient] = useState<CopilotStudioClient | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  /** Shows a message from the agent. Other activities (typing, events) are skipped. */
  function show(activity: Activity) {
    const text = activity.text
    if (activity.type === 'message' && text) setMessages((all) => [...all, { from: 'agent', text }])
  }

  async function connect() {
    setBusy(true)
    setError('')
    try {
      const agent = await connectToAgent()
      for await (const activity of agent.startConversationStreaming(true)) show(activity)
      setClient(agent)
    } catch (e) {
      setError((e as Error).message)
    }
    setBusy(false)
  }

  async function send() {
    const text = draft.trim()
    if (!text || !client) return
    setDraft('')
    setMessages((all) => [...all, { from: 'user', text }])
    setBusy(true)
    setError('')
    try {
      const question = Activity.fromObject({ type: 'message', text })
      for await (const activity of client.sendActivityStreaming(question)) show(activity)
    } catch (e) {
      setError((e as Error).message)
    }
    setBusy(false)
  }

  return (
    <aside className="agent-panel">
      <header>
        <strong>Dept Case Helper</strong>
        <button type="button" onClick={onClose}>
          Close
        </button>
      </header>

      <div className="agent-messages">
        {messages.map((m, i) => (
          <p key={i} className={m.from}>
            {m.text}
          </p>
        ))}
        {busy && <p>…</p>}
        {error && <p className="error">{error}</p>}
      </div>

      {client ? (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            void send()
          }}
        >
          <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Ask about a case" />
          <button type="submit" disabled={busy}>
            Send
          </button>
        </form>
      ) : (
        <button type="button" disabled={busy} onClick={() => void connect()}>
          Sign in and start
        </button>
      )}
    </aside>
  )
}
