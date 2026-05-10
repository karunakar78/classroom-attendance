import { useState } from 'react'
import StudentList from '../components/StudentList'
import StudentAnalysis from '../components/StudentAnalysis'

export default function Analysis() {
  const [selectedStudent, setSelectedStudent] = useState(null)

  return (
    <div className="h-full flex flex-col p-5 gap-4">
      {/* Top strip */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="h-px flex-1" style={{ background: 'linear-gradient(90deg, rgba(6,182,212,0.4), transparent)' }} />
        <span className="font-mono text-[10px] tracking-[0.3em] uppercase" style={{ color: 'var(--text-faint)' }}>
          {selectedStudent ? `Viewing — ${selectedStudent.name}` : 'Select a student to analyse'}
        </span>
        <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--accent-cyan)', opacity: 0.6 }} />
      </div>

      {/* Two-column layout */}
      <div className="flex-1 flex gap-5 min-h-0">
        {/* Left — student list (narrower) */}
        <div className="w-64 shrink-0 min-h-0">
          <StudentList selected={selectedStudent} onSelect={setSelectedStudent} />
        </div>

        {/* Right — analysis panel */}
        <div className="flex-1 min-h-0">
          <StudentAnalysis student={selectedStudent} />
        </div>
      </div>
    </div>
  )
}
