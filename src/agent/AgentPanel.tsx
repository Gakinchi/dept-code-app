import { useRef, useState } from 'react'
import type { CopilotStudioClient } from '@microsoft/agents-copilotstudio-client'
import { connectToAgent } from './agentClient'
import './AgentPanel.css'

type Message = { from: 'user' | 'agent'; text: string }
type Status = 'signed-out' | 'connecting' | 'ready' | 'waiting' | 'error'

function errorText(e: unknown) {
  return e instanceof Error ? e.message : String(e)
}

/** The button that opens the chat panel. Rendered next to the app in main.tsx. */
export function AgentLauncher() {
  const [open, setOpen] = useState(false)
  if (open) return <AgentPanel onClose={() => setOpen(false)} />
  return (
    <button type="button" className="primary agent-toggle" onClick={() => setOpen(true)}>
      Ask the helper
    </button>
  )
}

/** A chat panel beside the app. The conversation is with a Copilot Studio agent. */
function AgentPanel({ onClose }: { onClose: () => void }) {
  const client = useRef<CopilotStudioClient | null>(null)
  const [status, setStatus] = useState<Status>('signed-out')
  const [messages, setMessages] = useState<Message[]>([])
  const [draft, setDraft] = useState('')
  const [error, setError] = useState('')

  function addAgentMessages(activities: { type?: string; text?: string }[]) {
    const replies = activities
      .filter((a) => a.type === 'message' && a.text)
      .map((a) => ({ from: 'agent' as const, text: a.text! }))
    setMessages((current) => [...current, ...replies])
  }

  async function connect() {
    setStatus('connecting')
    setError('')
    try {
      client.current = await connectToAgent()
      addAgentMessages(await client.current.startConversationAsync(true))
      setStatus('ready')
    } catch (e) {
      setError(errorText(e))
      setStatus('error')
    }
  }

  async function send() {
    const question = draft.trim()
    if (!question || !client.current) return
    setDraft('')
    setMessages((current) => [...current, { from: 'user', text: question }])
    setStatus('waiting')
    try {
      addAgentMessages(await client.current.askQuestionAsync(question))
      setStatus('ready')
    } catch (e) {
      setError(errorText(e))
      setStatus('error')
    }
  }

  return (
    <aside className="agent-panel" aria-label="Dept Case Helper">
      <header>
        <strong>Dept Case Helper</strong>
        <button type="button" className="link" onClick={onClose}>
          Close
        </button>
      </header>

      <div className="agent-messages">
        {status === 'signed-out' && (
          <p className="hint">The helper is a Copilot Studio agent. Sign in to start a conversation.</p>
        )}
        {messages.map((m, i) => (
          <p key={i} className={`bubble ${m.from}`}>
            {m.text}
          </p>
        ))}
        {(status === 'connecting' || status === 'waiting') && <p className="hint">…</p>}
        {status === 'error' && <p className="error">{error}</p>}
      </div>

      {status === 'signed-out' || status === 'error' ? (
        <button type="button" className="primary" onClick={() => void connect()}>
          Sign in and start
        </button>
      ) : (
        <form
          className="row"
          onSubmit={(e) => {
            e.preventDefault()
            void send()
          }}
        >
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Ask about a case"
            aria-label="Message to the helper"
            disabled={status !== 'ready'}
          />
          <button type="submit" className="primary" disabled={status !== 'ready'}>
            Send
          </button>
        </form>
      )}
    </aside>
  )
}
