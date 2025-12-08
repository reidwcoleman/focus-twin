import { useState, useEffect } from 'react'
import { Calendar, Sparkles, Upload, FileText, Loader, CheckCircle, AlertCircle, Edit2, Trash2, Plus, Clock, TrendingUp, BookOpen, X } from 'lucide-react'

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
  const [parseStep, setParseStep] = useState(0) // For animated parsing feedback

  // Auto-dismiss success messages
  useEffect(() => {
    if (message?.type === 'success') {
      const timer = setTimeout(() => setMessage(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [message])

  const handleAIParse = async () => {
    if (!aiInput.trim()) return

    setLoading(true)
    setMessage(null)
    setParseStep(0)

    try {
      // Animated progress
      setParseStep(1) // Reading your description...
      await new Promise(resolve => setTimeout(resolve, 300))

      setParseStep(2) // Understanding activities...
      const response = await fetch('/api/activities/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: aiInput })
      })

      setParseStep(3) // Extracting times and dates...
      await new Promise(resolve => setTimeout(resolve, 200))

      const data = await response.json()
      if (data.success) {
        setParseStep(4) // Creating activities...
        setParsedActivities(data.activities.map((act, idx) => ({ ...act, id: `temp-${idx}` })))
        await new Promise(resolve => setTimeout(resolve, 300))

        setShowReviewModal(true)
        setMessage({ type: 'success', text: `Found ${data.activities.length} ${data.activities.length === 1 ? 'activity' : 'activities'}! Review and confirm below.` })
      } else {
        setMessage({ type: 'error', text: data.error })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to parse activities. Please try again.' })
    } finally {
      setLoading(false)
      setParseStep(0)
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

  const getParseStepText = () => {
    switch (parseStep) {
      case 1: return 'Reading your description...'
      case 2: return 'Understanding activities...'
      case 3: return 'Extracting times and dates...'
      case 4: return 'Creating activities...'
      default: return ''
    }
  }

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto">
      {/* Header with gradient */}
      <div className="mb-8 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 mb-4">
          <Sparkles className="text-white" size={32} />
        </div>
        <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">
          AI Schedule Generator
        </h1>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Describe your weekly activities in plain English, and our AI will create an optimized study schedule tailored to your needs
        </p>
      </div>

      {/* Enhanced message display with animation */}
      {message && (
        <div className={`mb-6 p-4 rounded-xl flex items-center justify-between gap-3 shadow-lg animate-slideDown ${
          message.type === 'success'
            ? 'bg-gradient-to-r from-green-50 to-emerald-50 text-green-800 border border-green-200'
            : 'bg-gradient-to-r from-red-50 to-rose-50 text-red-800 border border-red-200'
        }`}>
          <div className="flex items-center gap-3">
            {message.type === 'success' ? <CheckCircle size={22} /> : <AlertCircle size={22} />}
            <span className="font-medium">{message.text}</span>
          </div>
          <button
            onClick={() => setMessage(null)}
            className="hover:bg-white/50 rounded-lg p-1 transition-colors"
          >
            <X size={18} />
          </button>
        </div>
      )}

      {/* Polished Tab Navigation */}
      <div className="flex gap-3 mb-6 bg-gray-100 p-2 rounded-xl">
        <button
          onClick={() => setActiveTab('ai')}
          className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-all duration-200 ${
            activeTab === 'ai'
              ? 'bg-white text-indigo-600 shadow-md'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <Sparkles size={20} className={activeTab === 'ai' ? 'animate-pulse' : ''} />
            AI Activity Input
          </div>
        </button>
        <button
          onClick={() => setActiveTab('calendar')}
          className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-all duration-200 ${
            activeTab === 'calendar'
              ? 'bg-white text-indigo-600 shadow-md'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <Upload size={20} />
            Calendar Import
          </div>
        </button>
      </div>

      {/* AI Input Tab */}
      {activeTab === 'ai' && (
        <div className="bg-gradient-to-br from-white to-indigo-50/30 rounded-2xl shadow-lg border-2 border-indigo-100 p-8 mb-6">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0">
              <BookOpen className="text-white" size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Describe Your Weekly Activities</h2>
              <p className="text-gray-600">
                Tell me about your weekly schedule in plain English. I'll create multiple activities automatically.
              </p>
            </div>
          </div>

          {/* Example box */}
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 mb-4">
            <div className="flex items-start gap-2">
              <TrendingUp className="text-indigo-600 flex-shrink-0 mt-0.5" size={18} />
              <div>
                <p className="text-sm font-semibold text-indigo-900 mb-1">Example:</p>
                <p className="text-sm text-indigo-700 italic">
                  "I have gym on Monday and Wednesday at 6pm for 1 hour. I work Tuesday and Thursday from 2pm to 6pm. Club meetings on Friday at 4pm for 2 hours."
                </p>
              </div>
            </div>
          </div>

          <div className="relative">
            <textarea
              value={aiInput}
              onChange={(e) => setAiInput(e.target.value)}
              className="w-full h-48 px-5 py-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all resize-none text-gray-900 placeholder-gray-400"
              placeholder="Type your activities here... (e.g., 'I have gym on Monday at 6pm for 1 hour')"
              disabled={loading}
            />
            <div className="absolute bottom-3 right-3 text-xs text-gray-400">
              {aiInput.length} characters
            </div>
          </div>

          {/* Parse step indicator */}
          {loading && parseStep > 0 && (
            <div className="mt-4 flex items-center gap-3 text-indigo-600 bg-indigo-50 p-3 rounded-lg animate-pulse">
              <Loader size={18} className="animate-spin" />
              <span className="text-sm font-medium">{getParseStepText()}</span>
            </div>
          )}

          <div className="mt-6">
            <button
              onClick={handleAIParse}
              disabled={loading || !aiInput.trim()}
              className="w-full px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 font-bold text-lg shadow-lg hover:shadow-xl transition-all transform hover:scale-[1.02] active:scale-[0.98]"
            >
              {loading ? (
                <Loader size={24} className="animate-spin" />
              ) : (
                <>
                  <Sparkles size={24} className="animate-pulse" />
                  Create Activities from Description
                </>
              )}
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-slideUp">
            {/* Header */}
            <div className="p-6 bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold flex items-center gap-2">
                    <CheckCircle size={28} />
                    Review Your Activities
                  </h2>
                  <p className="text-indigo-100 mt-1">
                    {parsedActivities.length} {parsedActivities.length === 1 ? 'activity' : 'activities'} parsed • Confirm or edit before saving
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowReviewModal(false)
                    setParsedActivities([])
                    setEditingActivity(null)
                  }}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {parsedActivities.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500 mb-4">No activities yet. Add one below!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {parsedActivities.map((activity, index) => (
                    <div key={activity.id} className="border-2 border-gray-200 rounded-xl p-5 bg-white hover:border-indigo-300 transition-all shadow-sm hover:shadow-md" style={{animationDelay: `${index * 50}ms`}}>
                      {editingActivity?.id === activity.id ? (
                        // Editing Mode
                        <div className="space-y-4 bg-indigo-50/50 p-4 rounded-lg">
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
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-3">
                              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                                activity.category === 'fitness' ? 'bg-green-100 text-green-600' :
                                activity.category === 'work' ? 'bg-blue-100 text-blue-600' :
                                activity.category === 'study' ? 'bg-purple-100 text-purple-600' :
                                activity.category === 'extracurricular' ? 'bg-orange-100 text-orange-600' :
                                'bg-gray-100 text-gray-600'
                              }`}>
                                {activity.category === 'fitness' ? '💪' :
                                 activity.category === 'work' ? '💼' :
                                 activity.category === 'study' ? '📚' :
                                 activity.category === 'extracurricular' ? '🎯' :
                                 '📅'}
                              </div>
                              <div>
                                <h3 className="font-bold text-xl text-gray-900">{activity.title || 'Untitled Activity'}</h3>
                                <span className="text-xs font-medium px-2 py-1 rounded-full capitalize inline-block mt-1" style={{
                                  background: activity.category === 'fitness' ? '#dcfce7' :
                                             activity.category === 'work' ? '#dbeafe' :
                                             activity.category === 'study' ? '#e9d5ff' :
                                             activity.category === 'extracurricular' ? '#fed7aa' :
                                             '#e5e7eb',
                                  color: activity.category === 'fitness' ? '#166534' :
                                        activity.category === 'work' ? '#1e40af' :
                                        activity.category === 'study' ? '#6b21a8' :
                                        activity.category === 'extracurricular' ? '#9a3412' :
                                        '#374151'
                                }}>
                                  {activity.category}
                                </span>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3 ml-13">
                              <div className="flex items-center gap-2 text-gray-700">
                                <Calendar size={16} className="text-indigo-600" />
                                <span className="font-semibold">{DAYS[activity.day_of_week]}</span>
                              </div>
                              {activity.start_time && activity.end_time && (
                                <div className="flex items-center gap-2 text-gray-700">
                                  <Clock size={16} className="text-indigo-600" />
                                  <span className="font-semibold">{activity.start_time} - {activity.end_time}</span>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEditActivity(activity)}
                              className="p-2.5 text-indigo-600 hover:bg-indigo-50 rounded-lg border-2 border-indigo-200 hover:border-indigo-300 transition-all"
                              title="Edit activity"
                            >
                              <Edit2 size={18} />
                            </button>
                            <button
                              onClick={() => handleDeleteActivity(activity.id)}
                              className="p-2.5 text-red-600 hover:bg-red-50 rounded-lg border-2 border-red-200 hover:border-red-300 transition-all"
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
                className="w-full mt-6 px-6 py-4 border-3 border-dashed border-indigo-300 text-indigo-600 rounded-xl hover:border-indigo-500 hover:bg-indigo-50 flex items-center justify-center gap-3 font-semibold text-lg transition-all hover:scale-[1.02]"
              >
                <Plus size={24} className="animate-pulse" />
                Add Another Activity Manually
              </button>
            </div>

            {/* Footer */}
            <div className="p-6 bg-gradient-to-r from-gray-50 to-gray-100 flex gap-3 border-t-2 border-gray-200">
              <button
                onClick={() => {
                  setShowReviewModal(false)
                  setParsedActivities([])
                  setEditingActivity(null)
                }}
                className="px-8 py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 font-semibold transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveActivities}
                disabled={loading || parsedActivities.length === 0}
                className="flex-1 px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 font-bold text-lg shadow-lg hover:shadow-xl transition-all"
              >
                {loading ? (
                  <>
                    <Loader size={24} className="animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle size={24} />
                    Save {parsedActivities.length} {parsedActivities.length === 1 ? 'Activity' : 'Activities'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
