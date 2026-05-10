import { Routes, Route, Navigate } from 'react-router-dom'
import Navbar from './components/Navbar'
import Home from './pages/Home'
import Analysis from './pages/Analysis'
import Report from './pages/Report'

export default function App() {
  return (
    <div
      className="h-screen w-screen flex flex-col overflow-hidden"
      style={{ background: 'radial-gradient(ellipse at 15% 40%, #071828 0%, #020b14 55%, #000508 100%)' }}
    >
      {/* Subtle grid texture */}
      <div
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.04]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(6,182,212,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(6,182,212,0.6) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />
      <div className="relative z-10 flex flex-col h-full">
        <Navbar />
        <main className="flex-1 overflow-hidden">
          <Routes>
            <Route path="/"         element={<Navigate to="/home" replace />} />
            <Route path="/home"     element={<Home />} />
            <Route path="/analysis" element={<Analysis />} />
            <Route path="/report"   element={<Report />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}
