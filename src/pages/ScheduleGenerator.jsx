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
        setParsedActivities(data.activities)
        setMessage({ type: 'success', text: `Parsed ${data.activities.length} activities!` })
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
      const response = await fetch('/api/activities/parse-and-save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: aiInput })
      })

      const data = await response.json()
      if (data.success) {
        setMessage({ type: 'success', text: `Saved ${data.saved} activities!` })
        setAiInput('')
        setParsedActivities([])
      } else {
        setMessage({ type: 'error', text: data.error })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save activities' })
    } finally {
      setLoading(false)
    }
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
              className="px-6 py-2 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? <Loader size={20} className="animate-spin" /> : <FileText size={20} />}
              Preview Parsed Activities
            </button>
            <button
              onClick={handleSaveActivities}
              disabled={loading || !aiInput.trim()}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? <Loader size={20} className="animate-spin" /> : <CheckCircle size={20} />}
              Save Activities
            </button>
          </div>

          {/* Parsed Activities Preview */}
          {parsedActivities.length > 0 && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-3">Parsed Activities:</h3>
              <div className="space-y-2">
                {parsedActivities.map((activity, idx) => (
                  <div key={idx} className="p-3 bg-white rounded border border-gray-200">
                    <div className="font-medium text-gray-900">{activity.title}</div>
                    <div className="text-sm text-gray-600 mt-1">
                      {activity.day_of_week !== null && (
                        <span>Day: {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][activity.day_of_week]} | </span>
                      )}
                      {activity.start_time && activity.end_time && (
                        <span>{activity.start_time} - {activity.end_time} | </span>
                      )}
                      <span className="text-indigo-600">{activity.category}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
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
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Your Generated Schedule</h2>

          {/* Study Hours Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="p-4 bg-indigo-50 rounded-lg">
              <div className="text-sm text-indigo-600 font-medium">Recommended Study Hours</div>
              <div className="text-2xl font-bold text-indigo-900">{generatedSchedule.studyHours.recommended.toFixed(1)} hrs</div>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <div className="text-sm text-green-600 font-medium">Allocated Study Hours</div>
              <div className="text-2xl font-bold text-green-900">{generatedSchedule.studyHours.allocated.toFixed(1)} hrs</div>
            </div>
            <div className="p-4 bg-orange-50 rounded-lg">
              <div className="text-sm text-orange-600 font-medium">Remaining Deficit</div>
              <div className="text-2xl font-bold text-orange-900">{generatedSchedule.studyHours.deficit.toFixed(1)} hrs</div>
            </div>
          </div>

          {/* Weekly Schedule Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-4">
            {Object.values(generatedSchedule.schedule).map((day) => (
              <div key={day.dayIndex} className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-bold text-gray-900 mb-3">{day.day}</h3>
                <div className="space-y-2">
                  {day.events.length === 0 ? (
                    <p className="text-gray-400 text-sm text-center py-4">Free day!</p>
                  ) : (
                    day.events.map((event, idx) => (
                      <div
                        key={idx}
                        className={`p-2 rounded text-xs ${
                          event.type === 'class' ? 'bg-blue-100 border-l-4 border-blue-500' :
                          event.type === 'study' ? 'bg-purple-100 border-l-4 border-purple-500' :
                          'bg-gray-100 border-l-4 border-gray-400'
                        }`}
                      >
                        <div className="font-semibold">{event.title}</div>
                        <div className="text-gray-600 mt-1">
                          {event.start_time} - {event.end_time}
                        </div>
                        {event.location && (
                          <div className="text-gray-500 mt-1">📍 {event.location}</div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
