import { useEffect, useState } from 'react'
import { getContext } from '@microsoft/power-apps/app'
import { Dept_deptcasesService, Dept_deptcasesModel } from './generated'
import { CaseView } from './CaseView'
import './App.css'

type DeptCase = Dept_deptcasesModel.Dept_deptcases
type LoadState = 'loading' | 'ready' | 'error'

function App() {
  const [cases, setCases] = useState<DeptCase[]>([])
  const [state, setState] = useState<LoadState>('loading')
  const [error, setError] = useState('')
  const [title, setTitle] = useState('')
  // The case that is open. Empty means the list is shown.
  const [openCaseId, setOpenCaseId] = useState('')

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
    // A link with ?caseId=<id> opens that case.
    void getContext().then((ctx) => {
      const caseId = ctx.app.queryParams.caseId
      if (caseId) setOpenCaseId(caseId)
    })
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

  if (openCaseId) {
    return (
      <main className="app">
        <h1>Dept Case App</h1>
        <CaseView key={openCaseId} caseId={openCaseId} onBack={() => setOpenCaseId('')} />
      </main>
    )
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
            <li key={c.dept_deptcaseid}>
              <button type="button" className="link" onClick={() => setOpenCaseId(c.dept_deptcaseid)}>
                {c.dept_name ?? '(untitled)'}
              </button>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}

export default App
