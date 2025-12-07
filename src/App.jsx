import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import { LayoutDashboard, Calendar, BookOpen, GraduationCap, CheckSquare, StickyNote, Trophy } from 'lucide-react'
import Dashboard from './pages/Dashboard'
import Schedule from './pages/Schedule'
import Assignments from './pages/Assignments'
import Grades from './pages/Grades'
import Tasks from './pages/Tasks'
import Notes from './pages/Notes'
import Courses from './pages/Courses'

function App() {
  return (
    <BrowserRouter>
      <div className="flex h-screen bg-gray-50">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
          <div className="p-6 border-b border-gray-200">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Focus Twin
            </h1>
            <p className="text-sm text-gray-500 mt-1">Your school life, organized</p>
          </div>

          <nav className="flex-1 p-4 space-y-1">
            <NavItem to="/" icon={<LayoutDashboard size={20} />} label="Dashboard" />
            <NavItem to="/schedule" icon={<Calendar size={20} />} label="Schedule" />
            <NavItem to="/assignments" icon={<BookOpen size={20} />} label="Assignments" />
            <NavItem to="/grades" icon={<Trophy size={20} />} label="Grades" />
            <NavItem to="/tasks" icon={<CheckSquare size={20} />} label="Tasks" />
            <NavItem to="/notes" icon={<StickyNote size={20} />} label="Notes" />
            <NavItem to="/courses" icon={<GraduationCap size={20} />} label="Courses" />
          </nav>

          <div className="p-4 border-t border-gray-200">
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg p-4 text-white">
              <p className="text-sm font-semibold">📚 Study Tip</p>
              <p className="text-xs mt-1 opacity-90">Take breaks every 45 minutes for better retention!</p>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-auto">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/schedule" element={<Schedule />} />
            <Route path="/assignments" element={<Assignments />} />
            <Route path="/grades" element={<Grades />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/notes" element={<Notes />} />
            <Route path="/courses" element={<Courses />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}

function NavItem({ to, icon, label }) {
  return (
    <NavLink
      to={to}
      end
      className={({ isActive }) =>
        `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
          isActive
            ? 'bg-indigo-50 text-indigo-600 font-medium'
            : 'text-gray-700 hover:bg-gray-100'
        }`
      }
    >
      {icon}
      <span>{label}</span>
    </NavLink>
  )
}

export default App
