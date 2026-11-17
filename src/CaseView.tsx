import { useEffect, useState } from 'react'
import { Dept_deptcasesService, Dept_deptcasesModel } from './generated'

type DeptCase = Dept_deptcasesModel.Dept_deptcases

/** Shows one case, loaded by its ID. */
export function CaseView({ caseId, onBack }: { caseId: string; onBack: () => void }) {
  const [item, setItem] = useState<DeptCase | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    void Dept_deptcasesService.get(caseId).then((result) => {
      if (result.success && result.data) setItem(result.data)
      else setError(result.error?.message ?? 'Case not found.')
    })
  }, [caseId])

  return (
    <section>
      <button type="button" className="link" onClick={onBack}>
        ← All cases
      </button>
      {error && <p className="error">Could not open the case: {error}</p>}
      {!error && !item && <p>Loading case…</p>}
      {item && (
        <>
          <h2>{item.dept_name ?? '(untitled)'}</h2>
          <p>Case ID: {item.dept_deptcaseid}</p>
        </>
      )}
    </section>
  )
}
