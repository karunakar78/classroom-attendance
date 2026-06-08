const BASE = 'http://localhost:8000'

async function req(path, opts = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export const api = {
  getStudents:         ()                              => req('/students'),
  getStudentAnalysis:  (id)                            => req(`/students/${id}/analysis`),
  getClasses:          ()                              => req('/classes'),
  getCameras:          ()                              => req('/cameras'),
  getCurrentSession:   ()                              => req('/sessions/current'),
  startSession:        (semester, camera_id)            => req('/sessions/start', { method: 'POST', body: JSON.stringify({ semester, camera_id }) }),
  endSession:          ()                              => req('/sessions/end',   { method: 'POST' }),
  markAttendance:      (session_id, student_name)      => req('/attendance/mark', { method: 'POST', body: JSON.stringify({ session_id, student_name }) }),
  getReport:           (class_id, from_date, to_date)  => req(`/report?class_id=${class_id}&from_date=${from_date}&to_date=${to_date}`),
}
