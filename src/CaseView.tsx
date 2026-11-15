import { useEffect, useState } from 'react'
import { Dept_deptcasesService, Dept_deptcasesModel } from './generated'

type DeptCase = Dept_deptcasesModel.Dept_deptcases

type Props = {
  caseId: string
  link: string
  onBack: () => void
}

/** Dataverse answers with a JSON document. Show the sentence in it, not the whole document. */
function readableError(message: string | undefined, caseId: string) {
  if (!message) return `No case with ID ${caseId}.`
  try {
    return JSON.parse(message).error?.message ?? message
  } catch {
    return message
  }
}

function formatDate(value?: string) {
  return value ? new Date(value).toLocaleString() : '(not set)'
}

/** The item view: one case, loaded by its ID. */
export function CaseView({ caseId, link, onBack }: Props) {
  const [item, setItem] = useState<DeptCase | null>(null)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let current = true
    Dept_deptcasesService.get(caseId).then((result) => {
      if (!current) return
      if (result.success && result.data) setItem(result.data)
      else setError(readableError(result.error?.message, caseId))
    })
    return () => {
      current = false
    }
  }, [caseId])

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
    } catch {
      // The player may not allow clipboard access. The link stays visible in the field to copy by hand.
      setCopied(false)
    }
  }

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
          <dl className="fields">
            <dt>Status</dt>
            <dd>{item.statecode === 0 ? 'Active' : 'Inactive'}</dd>
            <dt>Created</dt>
            <dd>{formatDate(item.createdon)}</dd>
            <dt>Modified</dt>
            <dd>{formatDate(item.modifiedon)}</dd>
            <dt>Case ID</dt>
            <dd>{item.dept_deptcaseid}</dd>
          </dl>

          <label className="share">
            Link to this case
            <textarea readOnly rows={3} value={link} onFocus={(e) => e.target.select()} />
          </label>
          <button type="button" className="primary" onClick={() => void copyLink()}>
            {copied ? 'Copied' : 'Copy link'}
          </button>
        </>
      )}
    </section>
  )
}
