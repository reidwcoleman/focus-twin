import { useEffect, useState } from 'react'
import { Plus, X, TrendingUp } from 'lucide-react'
import { format } from 'date-fns'

export default function Grades() {
  const [grades, setGrades] = useState([])
  const [summary, setSummary] = useState([])
  const [courses, setCourses] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [formData, setFormData] = useState({
    course_id: '',
    assignment_name: '',
    grade: '',
    max_grade: '100',
    weight: '1',
    category: ''
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    const [gradesRes, summaryRes, coursesRes] = await Promise.all([
      fetch('/api/grades'),
      fetch('/api/grades/summary'),
      fetch('/api/courses')
    ])
    setGrades(await gradesRes.json())
    setSummary(await summaryRes.json())
    setCourses(await coursesRes.json())
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    await fetch('/api/grades', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    })
    setShowModal(false)
    setFormData({ course_id: '', assignment_name: '', grade: '', max_grade: '100', weight: '1', category: '' })
    fetchData()
  }

  const handleDelete = async (id) => {
    await fetch(`/api/grades/${id}`, { method: 'DELETE' })
    fetchData()
  }

  const getGradeColor = (percentage) => {
    if (percentage >= 90) return 'text-green-600'
    if (percentage >= 80) return 'text-blue-600'
    if (percentage >= 70) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getGradeLetter = (percentage) => {
    if (percentage >= 90) return 'A'
    if (percentage >= 80) return 'B'
    if (percentage >= 70) return 'C'
    if (percentage >= 60) return 'D'
    return 'F'
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Grades</h1>
          <p className="text-gray-500 mt-1">Track your academic performance</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          <Plus size={20} />
          Add Grade
        </button>
      </div>

      {/* Grade Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {summary.map(course => {
          const percentage = course.average || 0
          return (
            <div
              key={course.id}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-gray-900">{course.name}</h3>
                  <p className="text-sm text-gray-500">{course.code}</p>
                </div>
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: course.color }} />
              </div>
              <div className="flex items-end justify-between">
                <div>
                  <p className={`text-4xl font-bold ${getGradeColor(percentage)}`}>
                    {percentage > 0 ? percentage.toFixed(1) : 'N/A'}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    {percentage > 0 ? `${getGradeLetter(percentage)} Average` : 'No grades yet'}
                  </p>
                </div>
                <TrendingUp className={percentage >= 70 ? 'text-green-500' : 'text-gray-400'} size={24} />
              </div>
            </div>
          )
        })}
      </div>

      {/* All Grades */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold">All Grades</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Course</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Assignment</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Score</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Percentage</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {grades.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                    No grades recorded yet
                  </td>
                </tr>
              ) : (
                grades.map(grade => {
                  const percentage = (grade.grade / grade.max_grade) * 100
                  return (
                    <tr key={grade.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: summary.find(c => c.id === grade.course_id)?.color }} />
                          <span className="font-medium text-gray-900">{grade.course_name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-700">{grade.assignment_name}</td>
                      <td className="px-6 py-4 text-gray-600">{grade.category || 'N/A'}</td>
                      <td className="px-6 py-4 text-gray-900">
                        {grade.grade}/{grade.max_grade}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`font-semibold ${getGradeColor(percentage)}`}>
                          {percentage.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {format(new Date(grade.date_received), 'MMM d, yyyy')}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleDelete(grade.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <X size={18} />
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Add Grade</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Course</label>
                <select
                  value={formData.course_id}
                  onChange={(e) => setFormData({ ...formData, course_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  required
                >
                  <option value="">Select a course</option>
                  {courses.map(course => (
                    <option key={course.id} value={course.id}>{course.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Assignment Name</label>
                <input
                  type="text"
                  value={formData.assignment_name}
                  onChange={(e) => setFormData({ ...formData, assignment_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="Midterm Exam"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Score</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.grade}
                    onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="85"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Score</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.max_grade}
                    onChange={(e) => setFormData({ ...formData, max_grade: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Weight</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.weight}
                    onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="Exam, Quiz, HW..."
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  Add Grade
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
