import { useEffect, useState } from 'react'
import { Dept_deptcasesService, Dept_deptcasesModel } from './generated'
import { CaseView } from './CaseView'
import { caseLink, findParam, readStartInfo } from './startInfo'
import './App.css'

type DeptCase = Dept_deptcasesModel.Dept_deptcases
type LoadState = 'loading' | 'ready' | 'error'

function App() {
  const [cases, setCases] = useState<DeptCase[]>([])
  const [state, setState] = useState<LoadState>('loading')
  const [error, setError] = useState('')
  const [title, setTitle] = useState('')
  // The case shown in the item view. Empty means the list is shown.
  const [openCaseId, setOpenCaseId] = useState('')
  const [playUrl, setPlayUrl] = useState('')

  function showCases(result: Awaited<ReturnType<typeof Dept_deptcasesService.getAll>>) {
    if (result.success && result.data) {
      setCases(result.data)
      setState('ready')
    } else {
      setError(result.error?.message ?? 'Dataverse returned no data.')
      setState('error')
    }
  }

  async function load() {
    showCases(await Dept_deptcasesService.getAll())
  }

  useEffect(() => {
    void Dept_deptcasesService.getAll().then(showCases)
    // A link with ?caseId=<id> opens the app directly on that case.
    void readStartInfo().then((start) => {
      setPlayUrl(start.playUrl)
      const caseId = findParam(start.params, 'caseId')
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
        <CaseView
          key={openCaseId}
          caseId={openCaseId}
          link={caseLink(playUrl, openCaseId)}
          onBack={() => setOpenCaseId('')}
        />
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
        <table className="cases">
          <thead>
            <tr>
              <th>Case</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {cases.map((c) => (
              <tr key={c.dept_deptcaseid}>
                <td>
                  <button type="button" className="link" onClick={() => setOpenCaseId(c.dept_deptcaseid)}>
                    {c.dept_name ?? '(untitled)'}
                  </button>
                </td>
                <td>{c.createdon ? new Date(c.createdon).toLocaleDateString() : ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  )
}

export default App
