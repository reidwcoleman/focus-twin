import { useState } from 'react'
import { Calendar, Sparkles, Upload, FileText, Loader, CheckCircle, AlertCircle, Edit2, Trash2, Plus } from 'lucide-react'

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export default function ScheduleGenerator() {
  const [activeTab, setActiveTab] = useState('ai') // 'ai' or 'calendar'
  const [aiInput, setAiInput] = useState('')
  const [calendarUrl, setCalendarUrl] = useState('')
  const [icalFile, setIcalFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)
  const [parsedActivities, setParsedActivities] = useState([])
  const [editingActivity, setEditingActivity] = useState(null)
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [generatedSchedule, setGeneratedSchedule] = useState(null)

  const handleAIParse = async () => {
    if (!aiInput.trim()) return

    setLoading(true)
    setMessage(null)

    try {
      const response = await fetch('/api/activities/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: aiInput })
      })

      const data = await response.json()
      if (data.success) {
        setParsedActivities(data.activities.map((act, idx) => ({ ...act, id: `temp-${idx}` })))
        setShowReviewModal(true)
        setMessage({ type: 'success', text: `Parsed ${data.activities.length} activities! Please review and confirm.` })
      } else {
        setMessage({ type: 'error', text: data.error })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to parse activities' })
    } finally {
      setLoading(false)
    }
  }

  const handleSaveActivities = async () => {
    setLoading(true)
    setMessage(null)

    try {
      // Save each activity individually
      let saved = 0
      for (const activity of parsedActivities) {
        if (activity.day_of_week !== null && activity.start_time && activity.end_time) {
          await fetch('/api/activities', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: activity.title,
              description: activity.description,
              day_of_week: activity.day_of_week,
              start_time: activity.start_time,
              end_time: activity.end_time,
              recurrence: activity.recurrence || 'weekly',
              category: activity.category || 'personal',
              is_flexible: activity.is_flexible || false
            })
          })
          saved++
        }
      }

      setMessage({ type: 'success', text: `Saved ${saved} activities!` })
      setAiInput('')
      setParsedActivities([])
      setShowReviewModal(false)
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save activities' })
    } finally {
      setLoading(false)
    }
  }

  const handleEditActivity = (activity) => {
    setEditingActivity({ ...activity })
  }

  const handleUpdateActivity = () => {
    setParsedActivities(parsedActivities.map(act =>
      act.id === editingActivity.id ? editingActivity : act
    ))
    setEditingActivity(null)
  }

  const handleDeleteActivity = (id) => {
    setParsedActivities(parsedActivities.filter(act => act.id !== id))
  }

  const handleAddNewActivity = () => {
    const newActivity = {
      id: `temp-${Date.now()}`,
      title: '',
      description: '',
      day_of_week: 1,
      start_time: '09:00',
      end_time: '10:00',
      category: 'personal',
      recurrence: 'weekly',
      is_flexible: false
    }
    setParsedActivities([...parsedActivities, newActivity])
    setEditingActivity(newActivity)
  }

  const handleCalendarImport = async () => {
    setLoading(true)
    setMessage(null)

    try {
      let body = {}

      if (calendarUrl) {
        body.url = calendarUrl
      } else if (icalFile) {
        const text = await icalFile.text()
        body.icalData = text
      } else {
        setMessage({ type: 'error', text: 'Please provide a calendar URL or file' })
        setLoading(false)
        return
      }

      const response = await fetch('/api/calendar/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      const data = await response.json()
      if (data.success) {
        setMessage({ type: 'success', text: `Imported ${data.imported} out of ${data.total} events!` })
        setCalendarUrl('')
        setIcalFile(null)
      } else {
        setMessage({ type: 'error', text: data.error })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to import calendar' })
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateSchedule = async () => {
    setLoading(true)
    setMessage(null)

    try {
      const response = await fetch('/api/schedule/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      const data = await response.json()
      if (data.success) {
        setGeneratedSchedule(data)
        setMessage({ type: 'success', text: 'Schedule generated successfully!' })
      } else {
        setMessage({ type: 'error', text: data.error })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to generate schedule' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
          <Sparkles className="text-indigo-600" size={32} />
          AI Schedule Generator
        </h1>
        <p className="text-gray-500 mt-1">Import your calendar or describe your weekly activities, then let AI create your optimal study schedule</p>
      </div>

      {message && (
        <div className={`mb-6 p-4 rounded-lg flex items-center gap-2 ${
          message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
        }`}>
          {message.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
          {message.text}
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('ai')}
          className={`px-6 py-3 rounded-lg font-medium transition-colors ${
            activeTab === 'ai'
              ? 'bg-indigo-600 text-white'
              : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
          }`}
        >
          <div className="flex items-center gap-2">
            <Sparkles size={20} />
            AI Activity Input
          </div>
        </button>
        <button
          onClick={() => setActiveTab('calendar')}
          className={`px-6 py-3 rounded-lg font-medium transition-colors ${
            activeTab === 'calendar'
              ? 'bg-indigo-600 text-white'
              : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
          }`}
        >
          <div className="flex items-center gap-2">
            <Calendar size={20} />
            Calendar Import
          </div>
        </button>
      </div>

      {/* AI Input Tab */}
      {activeTab === 'ai' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Describe Your Weekly Activities</h2>
          <p className="text-sm text-gray-600 mb-4">
            Tell me about your weekly schedule in plain English. For example:
            <br />
            <span className="italic text-gray-500">
              "I have gym on Monday and Wednesday at 6pm for 1 hour. I work Tuesday and Thursday from 2pm to 6pm.
              I have club meetings on Friday at 4pm for 2 hours."
            </span>
          </p>

          <textarea
            value={aiInput}
            onChange={(e) => setAiInput(e.target.value)}
            className="w-full h-40 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            placeholder="I have gym on Monday and Wednesday at 6pm for 1 hour..."
          />

          <div className="flex gap-3 mt-4">
            <button
              onClick={handleAIParse}
              disabled={loading || !aiInput.trim()}
              className="w-full px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-semibold"
            >
              {loading ? <Loader size={20} className="animate-spin" /> : <Sparkles size={20} />}
              Create Activities from Description
            </button>
          </div>
        </div>
      )}

      {/* Calendar Import Tab */}
      {activeTab === 'calendar' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Import Calendar</h2>

          <div className="space-y-6">
            {/* URL Import */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Google Calendar Public URL
              </label>
              <p className="text-xs text-gray-500 mb-2">
                Go to Google Calendar → Settings → Integrate calendar → Copy the "Public URL to this calendar" (iCal format)
              </p>
              <input
                type="url"
                value={calendarUrl}
                onChange={(e) => setCalendarUrl(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="https://calendar.google.com/calendar/ical/..."
              />
            </div>

            <div className="text-center text-gray-500 font-medium">OR</div>

            {/* File Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Upload iCal File (.ics)
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="file"
                  accept=".ics,.ical"
                  onChange={(e) => setIcalFile(e.target.files[0])}
                  className="flex-1 text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                />
                {icalFile && <span className="text-green-600 text-sm">✓ {icalFile.name}</span>}
              </div>
            </div>

            <button
              onClick={handleCalendarImport}
              disabled={loading || (!calendarUrl && !icalFile)}
              className="w-full px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? <Loader size={20} className="animate-spin" /> : <Upload size={20} />}
              Import Calendar
            </button>
          </div>
        </div>
      )}

      {/* Generate Schedule Button */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl shadow-lg p-6 text-white mb-6">
        <h2 className="text-2xl font-bold mb-2">Ready to Generate Your Schedule?</h2>
        <p className="mb-4 opacity-90">
          We'll combine your classes from Canvas, your personal activities, and calculate optimal study times
          to help you achieve good grades this week!
        </p>
        <button
          onClick={handleGenerateSchedule}
          disabled={loading}
          className="px-8 py-3 bg-white text-indigo-600 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed font-semibold flex items-center gap-2"
        >
          {loading ? <Loader size={20} className="animate-spin" /> : <Sparkles size={20} />}
          Generate My Schedule
        </button>
      </div>

      {/* Generated Schedule Display */}
      {generatedSchedule && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Your Optimized Study Schedule</h2>

            {/* Study Hours Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-200">
                <div className="text-sm text-indigo-600 font-medium">Recommended Study Hours</div>
                <div className="text-3xl font-bold text-indigo-900 mt-1">{generatedSchedule.studyHours.recommended.toFixed(1)} hrs</div>
                <div className="text-xs text-indigo-600 mt-1">Based on assignments & exams</div>
              </div>
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="text-sm text-green-600 font-medium">Allocated Study Hours</div>
                <div className="text-3xl font-bold text-green-900 mt-1">{generatedSchedule.studyHours.allocated.toFixed(1)} hrs</div>
                <div className="text-xs text-green-600 mt-1">Scheduled this week</div>
              </div>
              <div className={`p-4 rounded-lg border ${
                generatedSchedule.studyHours.deficit > 0
                  ? 'bg-orange-50 border-orange-200'
                  : 'bg-emerald-50 border-emerald-200'
              }`}>
                <div className={`text-sm font-medium ${
                  generatedSchedule.studyHours.deficit > 0 ? 'text-orange-600' : 'text-emerald-600'
                }`}>
                  {generatedSchedule.studyHours.deficit > 0 ? 'Hours Needed' : 'All Set!'}
                </div>
                <div className={`text-3xl font-bold mt-1 ${
                  generatedSchedule.studyHours.deficit > 0 ? 'text-orange-900' : 'text-emerald-900'
                }`}>
                  {generatedSchedule.studyHours.deficit > 0
                    ? `+${generatedSchedule.studyHours.deficit.toFixed(1)} hrs`
                    : '✓'}
                </div>
                <div className={`text-xs mt-1 ${
                  generatedSchedule.studyHours.deficit > 0 ? 'text-orange-600' : 'text-emerald-600'
                }`}>
                  {generatedSchedule.studyHours.deficit > 0
                    ? 'Find more free time!'
                    : 'Perfect balance'}
                </div>
              </div>
            </div>

            {/* Study Blocks Summary */}
            {generatedSchedule.studyBlocks && generatedSchedule.studyBlocks.length > 0 && (
              <div className="mb-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <h3 className="font-bold text-purple-900 mb-3 flex items-center gap-2">
                  <Sparkles size={20} />
                  Your Study Times This Week
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {generatedSchedule.studyBlocks.map((block, idx) => (
                    <div key={idx} className="bg-white p-3 rounded-lg border border-purple-200">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="font-semibold text-purple-900" style={{ color: block.color }}>
                            {block.course_name}
                          </div>
                          <div className="text-sm text-gray-600 mt-1">
                            <strong className="text-gray-900">{DAYS[block.day_of_week]}</strong>
                            {' '}• {block.start_time} - {block.end_time}
                          </div>
                          <div className="text-xs text-purple-600 mt-1">
                            {block.duration_hours.toFixed(1)} hour{block.duration_hours !== 1 ? 's' : ''}
                          </div>
                        </div>
                        <div className="text-2xl">📚</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Weekly Schedule Grid */}
            <h3 className="font-bold text-gray-900 mb-3 text-lg">Complete Weekly Schedule</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-4">
              {Object.values(generatedSchedule.schedule).map((day) => (
                <div key={day.dayIndex} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <h3 className="font-bold text-gray-900 mb-3 text-center pb-2 border-b border-gray-300">{day.day}</h3>
                  <div className="space-y-2">
                    {day.events.length === 0 ? (
                      <p className="text-gray-400 text-sm text-center py-4">Free day!</p>
                    ) : (
                      day.events.map((event, idx) => (
                        <div
                          key={idx}
                          className={`p-3 rounded-lg text-xs ${
                            event.type === 'class' ? 'bg-blue-100 border-l-4 border-blue-600 shadow-sm' :
                            event.type === 'study' ? 'bg-purple-100 border-l-4 border-purple-600 shadow-sm' :
                            'bg-gray-100 border-l-4 border-gray-400'
                          }`}
                        >
                          <div className={`font-bold text-sm ${
                            event.type === 'study' ? 'flex items-center gap-1' : ''
                          }`}>
                            {event.type === 'study' && <span>📚</span>}
                            {event.title}
                          </div>
                          <div className={`font-semibold mt-1 ${
                            event.type === 'study' ? 'text-purple-800' :
                            event.type === 'class' ? 'text-blue-800' :
                            'text-gray-700'
                          }`}>
                            ⏰ {event.start_time} - {event.end_time}
                          </div>
                          {event.duration_hours && (
                            <div className="text-purple-700 font-medium mt-1">
                              {event.duration_hours.toFixed(1)}hr session
                            </div>
                          )}
                          {event.location && (
                            <div className="text-gray-600 mt-1">📍 {event.location}</div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Activity Review Modal */}
      {showReviewModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">Review Your Activities</h2>
              <p className="text-gray-600 mt-1">Please confirm or edit the details for each activity</p>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {parsedActivities.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500 mb-4">No activities yet. Add one below!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {parsedActivities.map((activity) => (
                    <div key={activity.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                      {editingActivity?.id === activity.id ? (
                        // Editing Mode
                        <div className="space-y-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Activity Name</label>
                            <input
                              type="text"
                              value={editingActivity.title}
                              onChange={(e) => setEditingActivity({ ...editingActivity, title: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                              placeholder="e.g., Gym, Work, Study Group"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Day of Week</label>
                              <select
                                value={editingActivity.day_of_week}
                                onChange={(e) => setEditingActivity({ ...editingActivity, day_of_week: parseInt(e.target.value) })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                              >
                                {DAYS.map((day, idx) => (
                                  <option key={idx} value={idx}>{day}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                              <select
                                value={editingActivity.category}
                                onChange={(e) => setEditingActivity({ ...editingActivity, category: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                              >
                                <option value="personal">Personal</option>
                                <option value="work">Work</option>
                                <option value="fitness">Fitness</option>
                                <option value="extracurricular">Extracurricular</option>
                                <option value="study">Study</option>
                              </select>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                              <input
                                type="time"
                                value={editingActivity.start_time}
                                onChange={(e) => setEditingActivity({ ...editingActivity, start_time: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                              <input
                                type="time"
                                value={editingActivity.end_time}
                                onChange={(e) => setEditingActivity({ ...editingActivity, end_time: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                              />
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <button
                              onClick={handleUpdateActivity}
                              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                            >
                              <CheckCircle size={18} />
                              Save Changes
                            </button>
                            <button
                              onClick={() => setEditingActivity(null)}
                              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        // Display Mode
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-bold text-lg text-gray-900">{activity.title || 'Untitled Activity'}</h3>
                            <div className="mt-2 space-y-1 text-sm text-gray-600">
                              <div className="flex items-center gap-2">
                                <Calendar size={16} />
                                <span className="font-medium">{DAYS[activity.day_of_week]}</span>
                              </div>
                              {activity.start_time && activity.end_time && (
                                <div>
                                  <strong>Time:</strong> {activity.start_time} - {activity.end_time}
                                </div>
                              )}
                              <div>
                                <strong>Category:</strong> <span className="capitalize">{activity.category}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEditActivity(activity)}
                              className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg"
                              title="Edit activity"
                            >
                              <Edit2 size={18} />
                            </button>
                            <button
                              onClick={() => handleDeleteActivity(activity.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                              title="Delete activity"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={handleAddNewActivity}
                className="w-full mt-4 px-4 py-3 border-2 border-dashed border-gray-300 text-gray-600 rounded-lg hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 flex items-center justify-center gap-2"
              >
                <Plus size={20} />
                Add Another Activity
              </button>
            </div>

            <div className="p-6 border-t border-gray-200 bg-gray-50 flex gap-3">
              <button
                onClick={() => {
                  setShowReviewModal(false)
                  setParsedActivities([])
                  setEditingActivity(null)
                }}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveActivities}
                disabled={loading || parsedActivities.length === 0}
                className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-semibold"
              >
                {loading ? <Loader size={20} className="animate-spin" /> : <CheckCircle size={20} />}
                Save {parsedActivities.length} {parsedActivities.length === 1 ? 'Activity' : 'Activities'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
