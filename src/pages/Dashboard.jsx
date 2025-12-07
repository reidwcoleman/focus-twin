import { useEffect, useState } from 'react'
import { format, isToday, isTomorrow, isPast, formatDistanceToNow } from 'date-fns'
import { AlertCircle, CheckCircle, Clock, TrendingUp, RefreshCw, Trophy } from 'lucide-react'

export default function Dashboard() {
  const [stats, setStats] = useState({})
  const [assignments, setAssignments] = useState([])
  const [exams, setExams] = useState([])
  const [schedule, setSchedule] = useState([])
  const [grades, setGrades] = useState([])
  const [syncStatus, setSyncStatus] = useState(null)
  const [autoSync, setAutoSync] = useState(false)

  useEffect(() => {
    fetchData()
    fetchSyncStatus()
    fetchAutoSyncSetting()
  }, [])

  const fetchSyncStatus = async () => {
    try {
      const res = await fetch('/api/canvas/sync-status')
      const data = await res.json()
      setSyncStatus(data)
    } catch (error) {
      console.error('Error fetching sync status:', error)
    }
  }

  const fetchAutoSyncSetting = async () => {
    try {
      const res = await fetch('/api/settings/auto_sync')
      const data = await res.json()
      if (data) setAutoSync(data.value === 'true')
    } catch (error) {
      console.error('Error fetching auto-sync setting:', error)
    }
  }

  const fetchData = async () => {
    try {
      const [statsRes, assignmentsRes, examsRes, scheduleRes, gradesRes] = await Promise.all([
        fetch('/api/dashboard/stats'),
        fetch('/api/assignments'),
        fetch('/api/exams'),
        fetch('/api/schedule'),
        fetch('/api/grades/summary')
      ])

      setStats(await statsRes.json())
      setAssignments(await assignmentsRes.json())
      setExams(await examsRes.json())
      setSchedule(await scheduleRes.json())
      setGrades(await gradesRes.json())
    } catch (error) {
      console.error('Error fetching data:', error)
    }
  }

  const upcomingAssignments = assignments
    .filter(a => a.status === 'pending')
    .slice(0, 5)

  const todaySchedule = schedule.filter(s => s.day_of_week === new Date().getDay())

  // Calculate overall GPA
  const overallGPA = grades.length > 0
    ? grades.reduce((sum, g) => sum + (g.average || 0), 0) / grades.length
    : 0

  return (
    <div className="p-8">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">Welcome back! Here's what's happening today.</p>
        </div>

        {/* Sync Status Indicator */}
        {syncStatus?.configured && (
          <div className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg shadow-sm">
            <RefreshCw
              size={16}
              className={`${autoSync ? 'text-green-600 animate-pulse' : 'text-gray-400'}`}
            />
            <div className="text-sm">
              {autoSync ? (
                <p className="font-medium text-green-600">Auto-sync active</p>
              ) : (
                <p className="text-gray-600">Auto-sync off</p>
              )}
              {syncStatus.lastSync && (
                <p className="text-xs text-gray-500">
                  {formatDistanceToNow(new Date(syncStatus.lastSync), { addSuffix: true })}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        <StatCard
          icon={<Clock className="text-orange-500" />}
          label="Pending Assignments"
          value={stats.totalAssignments || 0}
          color="orange"
        />
        <StatCard
          icon={<CheckCircle className="text-green-500" />}
          label="Completed Today"
          value={stats.completedToday || 0}
          color="green"
        />
        <StatCard
          icon={<AlertCircle className="text-red-500" />}
          label="Upcoming Exams"
          value={stats.upcomingExams || 0}
          color="red"
        />
        <StatCard
          icon={<TrendingUp className="text-blue-500" />}
          label="Active Courses"
          value={stats.totalCourses || 0}
          color="blue"
        />
        <StatCard
          icon={<Trophy className="text-purple-500" />}
          label="Overall GPA"
          value={overallGPA > 0 ? `${overallGPA.toFixed(1)}%` : 'N/A'}
          color="purple"
          highlight={overallGPA >= 90}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Schedule */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold mb-4">Today's Schedule</h2>
          {todaySchedule.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No classes today! 🎉</p>
          ) : (
            <div className="space-y-3">
              {todaySchedule.map(item => (
                <div key={item.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                  <div className="w-2 h-12 rounded-full" style={{ backgroundColor: item.color }} />
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{item.course_name}</p>
                    <p className="text-sm text-gray-500">
                      {item.start_time} - {item.end_time}
                      {item.location && ` • ${item.location}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming Assignments */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold mb-4">Upcoming Assignments</h2>
          {upcomingAssignments.length === 0 ? (
            <p className="text-gray-500 text-center py-8">All caught up! ✨</p>
          ) : (
            <div className="space-y-3">
              {upcomingAssignments.map(assignment => (
                <div key={assignment.id} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{assignment.title}</p>
                      <p className="text-sm text-gray-500">{assignment.course_name}</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${getPriorityColor(assignment.priority)}`}>
                      {assignment.priority}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-2">
                    Due: {format(new Date(assignment.due_date), 'MMM d, yyyy')}
                    {isToday(new Date(assignment.due_date)) && ' (Today!)'}
                    {isTomorrow(new Date(assignment.due_date)) && ' (Tomorrow)'}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Grade Overview */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold mb-4">Grade Overview</h2>
          {grades.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No grades yet</p>
          ) : (
            <div className="space-y-3">
              {grades.map(grade => (
                <div key={grade.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-10 rounded-full" style={{ backgroundColor: grade.color }} />
                    <div>
                      <p className="font-medium text-gray-900">{grade.name}</p>
                      <p className="text-sm text-gray-500">{grade.code}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-lg font-bold ${getGradeColor(grade.average)}`}>
                      {grade.average ? `${grade.average.toFixed(1)}%` : 'N/A'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming Exams */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold mb-4">Upcoming Exams</h2>
          {exams.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No exams scheduled</p>
          ) : (
            <div className="space-y-3">
              {exams.slice(0, 5).map(exam => (
                <div key={exam.id} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{exam.title}</p>
                      <p className="text-sm text-gray-500">{exam.course_name}</p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mt-2">
                    {format(new Date(exam.exam_date), 'MMM d, yyyy')}
                    {exam.location && ` • ${exam.location}`}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function StatCard({ icon, label, value, color, highlight }) {
  const bgColors = {
    orange: 'bg-orange-50',
    green: 'bg-green-50',
    red: 'bg-red-50',
    blue: 'bg-blue-50',
    purple: 'bg-purple-50'
  }

  return (
    <div className={`bg-white rounded-xl shadow-sm border p-6 ${
      highlight ? 'border-purple-300 ring-2 ring-purple-100' : 'border-gray-200'
    }`}>
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-lg ${bgColors[color]}`}>
          {icon}
        </div>
        <div>
          <p className="text-gray-500 text-sm">{label}</p>
          <p className={`text-2xl font-bold ${highlight ? 'text-purple-600' : 'text-gray-900'}`}>
            {value}
          </p>
        </div>
      </div>
    </div>
  )
}

function getPriorityColor(priority) {
  switch (priority) {
    case 'high':
      return 'bg-red-100 text-red-700'
    case 'medium':
      return 'bg-yellow-100 text-yellow-700'
    case 'low':
      return 'bg-green-100 text-green-700'
    default:
      return 'bg-gray-100 text-gray-700'
  }
}

function getGradeColor(grade) {
  if (!grade) return 'text-gray-500'
  if (grade >= 90) return 'text-green-600'
  if (grade >= 80) return 'text-blue-600'
  if (grade >= 70) return 'text-yellow-600'
  return 'text-red-600'
}
