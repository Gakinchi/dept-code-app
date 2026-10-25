import { useEffect, useState } from 'react'
import { Dept_deptcasesService, Dept_deptcasesModel } from './generated'
import './App.css'

type DeptCase = Dept_deptcasesModel.Dept_deptcases
type LoadState = 'loading' | 'ready' | 'error'

function App() {
  const [cases, setCases] = useState<DeptCase[]>([])
  const [state, setState] = useState<LoadState>('loading')
  const [error, setError] = useState('')
  const [title, setTitle] = useState('')

  async function load() {
    setState('loading')
    const result = await Dept_deptcasesService.getAll()
    if (result.success && result.data) {
      setCases(result.data)
      setState('ready')
    } else {
      setError(result.error?.message ?? 'Dataverse returned no data.')
      setState('error')
    }
  }

  useEffect(() => {
    void load()
  }, [])

  async function addCase() {
    if (!title.trim()) return
    const result = await Dept_deptcasesService.create({ dept_name: title.trim(), statecode: 0 })
    if (result.success) {
      setTitle('')
      await load()
    } else {
      setError(result.error?.message ?? 'Create failed.')
      setState('error')
    }
  }

  return (
    <main className="app">
      <h1>Dept Case App</h1>
      <p className="hint">
        Runs under the signed-in user's permissions. Without the Dept App User role, the first call to
        Dataverse fails.
      </p>

      <form
        className="row"
        onSubmit={(e) => {
          e.preventDefault()
          void addCase()
        }}
      >
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="New case title"
          aria-label="New case title"
        />
        <button type="submit">Register case</button>
      </form>

      {state === 'loading' && <p>Loading cases…</p>}
      {state === 'error' && <p className="error">Dataverse error: {error}</p>}
      {state === 'ready' && cases.length === 0 && <p>No cases yet.</p>}
      {state === 'ready' && cases.length > 0 && (
        <ul>
          {cases.map((c) => (
            <li key={c.dept_deptcaseid}>{c.dept_name ?? '(untitled)'}</li>
          ))}
        </ul>
      )}
    </main>
  )
}

export default App
