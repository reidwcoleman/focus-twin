import { useEffect, useState } from 'react'
import { Plus, X, ChevronLeft, ChevronRight, Calendar } from 'lucide-react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, startOfWeek, endOfWeek, parseISO } from 'date-fns'

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function Schedule() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [view, setView] = useState('month') // 'month' or 'week'
  const [schedule, setSchedule] = useState([])
  const [calendarEvents, setCalendarEvents] = useState([])
  const [courses, setCourses] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [formData, setFormData] = useState({
    type: 'class', // 'class' or 'activity'
    course_id: '',
    activity_name: '',
    selectedDays: [],
    start_time: '',
    end_time: '',
    location: ''
  })
  const [timeInput, setTimeInput] = useState({
    start: '',
    end: ''
  })

  useEffect(() => {
    fetchData()
  }, [currentDate, view])

  const fetchData = async () => {
    const [scheduleRes, coursesRes, eventsRes] = await Promise.all([
      fetch('/api/schedule'),
      fetch('/api/courses'),
      fetch('/api/calendar-events')
    ])

    setSchedule(await scheduleRes.json())
    setCourses(await coursesRes.json())
    const allEvents = await eventsRes.json()

    // Filter events for current month
    const month = currentDate.getMonth()
    const year = currentDate.getFullYear()
    const filteredEvents = allEvents.filter(event => {
      const eventDate = parseISO(event.start_time)
      return eventDate.getMonth() === month && eventDate.getFullYear() === year
    })

    setCalendarEvents(filteredEvents)
  }

  const parseTimeInput = (input) => {
    if (!input) return ''

    // Remove extra spaces and convert to lowercase
    input = input.trim().toLowerCase().replace(/\s+/g, ' ')

    // Try to match various formats
    let match

    // Format: "9:30 am" or "9:30am" or "9am" or "9 am"
    match = input.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/)
    if (match) {
      let hours = parseInt(match[1])
      const minutes = match[2] || '00'
      const period = match[3]

      if (period === 'pm' && hours !== 12) hours += 12
      if (period === 'am' && hours === 12) hours = 0

      return `${String(hours).padStart(2, '0')}:${minutes}`
    }

    // Format: "930" or "0930"
    match = input.match(/^(\d{3,4})$/)
    if (match) {
      const time = match[1].padStart(4, '0')
      return `${time.slice(0, 2)}:${time.slice(2)}`
    }

    // Already in HH:MM format
    if (/^\d{1,2}:\d{2}$/.test(input)) {
      const [h, m] = input.split(':')
      return `${h.padStart(2, '0')}:${m}`
    }

    return input
  }

  const handleTimeBlur = (field) => {
    const parsed = parseTimeInput(timeInput[field])
    if (parsed) {
      setFormData(prev => ({
        ...prev,
        [field === 'start' ? 'start_time' : 'end_time']: parsed
      }))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (formData.type === 'class') {
      // Create class schedule entry for each selected day
      for (const day of formData.selectedDays) {
        await fetch('/api/schedule', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            course_id: formData.course_id,
            day_of_week: day,
            start_time: formData.start_time,
            end_time: formData.end_time,
            location: formData.location
          })
        })
      }
    } else {
      // Create activity for each selected day
      for (const day of formData.selectedDays) {
        await fetch('/api/activities', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: formData.activity_name,
            day_of_week: day,
            start_time: formData.start_time,
            end_time: formData.end_time,
            location: formData.location,
            category: 'personal',
            recurrence: 'weekly'
          })
        })
      }
    }

    setShowModal(false)
    setFormData({ type: 'class', course_id: '', activity_name: '', selectedDays: [], start_time: '', end_time: '', location: '' })
    setTimeInput({ start: '', end: '' })
    fetchData()
  }

  const toggleDay = (day) => {
    setFormData(prev => ({
      ...prev,
      selectedDays: prev.selectedDays.includes(day)
        ? prev.selectedDays.filter(d => d !== day)
        : [...prev.selectedDays, day].sort()
    }))
  }

  const selectDayPattern = (pattern) => {
    const patterns = {
      'weekdays': [1, 2, 3, 4, 5], // M-F
      'mwf': [1, 3, 5], // MWF
      'tth': [2, 4], // T/Th
      'all': [0, 1, 2, 3, 4, 5, 6]
    }
    setFormData(prev => ({ ...prev, selectedDays: patterns[pattern] || [] }))
  }

  const handleDelete = async (id) => {
    await fetch(`/api/schedule/${id}`, { method: 'DELETE' })
    fetchData()
  }

  const handleDeleteEvent = async (id) => {
    await fetch(`/api/calendar-events/${id}`, { method: 'DELETE' })
    fetchData()
  }

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
  }

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
  }

  const today = () => {
    setCurrentDate(new Date())
  }

  // Generate calendar days
  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const calendarStart = startOfWeek(monthStart)
  const calendarEnd = endOfWeek(monthEnd)
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd })

  // Get events for a specific day
  const getEventsForDay = (day) => {
    const dayEvents = calendarEvents.filter(event => {
      const eventDate = parseISO(event.start_time)
      return isSameDay(eventDate, day)
    })

    // Also get recurring schedule items for this day
    const dayOfWeek = day.getDay()
    const recurringClasses = schedule.filter(s => s.day_of_week === dayOfWeek)

    return { events: dayEvents, classes: recurringClasses }
  }

  if (view === 'week') {
    const groupedSchedule = DAYS.map((day, index) => ({
      day,
      dayIndex: index,
      classes: schedule.filter(s => s.day_of_week === index).sort((a, b) => a.start_time.localeCompare(b.start_time))
    }))

    return (
      <div className="p-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Weekly Schedule</h1>
            <p className="text-gray-500 mt-1">Manage your class timetable</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setView('month')}
              className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              <Calendar size={20} />
              Month View
            </button>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              <Plus size={20} />
              Add Class
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-4">
          {groupedSchedule.map(({ day, dayIndex, classes }) => (
            <div key={dayIndex} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <h3 className="font-semibold text-gray-900 mb-3">{day}</h3>
              <div className="space-y-2">
                {classes.length === 0 ? (
                  <p className="text-gray-400 text-sm text-center py-4">No classes</p>
                ) : (
                  classes.map(item => (
                    <div
                      key={item.id}
                      className="p-3 rounded-lg border-l-4 bg-gray-50 relative group"
                      style={{ borderLeftColor: item.color }}
                    >
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X size={14} />
                      </button>
                      <p className="font-medium text-sm text-gray-900">{item.course_name}</p>
                      <p className="text-xs text-gray-600 mt-1">
                        {item.start_time} - {item.end_time}
                      </p>
                      {item.location && (
                        <p className="text-xs text-gray-500 mt-1">📍 {item.location}</p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Polished Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              {/* Modal Header */}
              <div className={`sticky top-0 ${
                formData.type === 'class'
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600'
                  : 'bg-gradient-to-r from-green-600 to-teal-600'
              } text-white px-8 py-6 rounded-t-2xl transition-all`}>
                <h2 className="text-2xl font-bold">
                  {formData.type === 'class' ? '📚 Add Class' : '⚽ Add Activity'}
                </h2>
                <p className="text-indigo-100 text-sm mt-1">
                  {formData.type === 'class'
                    ? 'Set up your recurring class schedule'
                    : 'Schedule a recurring personal activity'}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="p-8 space-y-6">
                {/* Course Selection */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Select Course
                  </label>
                  <select
                    value={formData.course_id}
                    onChange={(e) => setFormData({ ...formData, course_id: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    required
                  >
                    <option value="">Choose a course...</option>
                    {courses.map(course => (
                      <option key={course.id} value={course.id}>{course.name}</option>
                    ))}
                  </select>
                </div>

                {/* Quick Day Patterns */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-3">
                    Quick Select Days
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
                    <button
                      type="button"
                      onClick={() => selectDayPattern('weekdays')}
                      className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 font-medium shadow-sm transition-all"
                    >
                      M-F
                    </button>
                    <button
                      type="button"
                      onClick={() => selectDayPattern('mwf')}
                      className="px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 font-medium shadow-sm transition-all"
                    >
                      MWF
                    </button>
                    <button
                      type="button"
                      onClick={() => selectDayPattern('tth')}
                      className="px-4 py-2 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg hover:from-purple-600 hover:to-purple-700 font-medium shadow-sm transition-all"
                    >
                      T/Th
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, selectedDays: [] }))}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium transition-all"
                    >
                      Clear
                    </button>
                  </div>

                  {/* Individual Day Selection */}
                  <div className="grid grid-cols-7 gap-2">
                    {DAYS.map((day, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => toggleDay(index)}
                        className={`p-3 rounded-xl font-semibold transition-all ${
                          formData.selectedDays.includes(index)
                            ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg scale-105'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        <div className="text-xs">{day.substring(0, 3)}</div>
                      </button>
                    ))}
                  </div>
                  {formData.selectedDays.length === 0 && (
                    <p className="text-sm text-red-600 mt-2">⚠️ Please select at least one day</p>
                  )}
                </div>

                {/* Time Selection */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      Start Time
                    </label>
                    <input
                      type="time"
                      value={formData.start_time}
                      onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      End Time
                    </label>
                    <input
                      type="time"
                      value={formData.end_time}
                      onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                      required
                    />
                  </div>
                </div>

                {/* Location */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Location (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    placeholder="e.g., Room 101, Science Building"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={formData.selectedDays.length === 0}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Add Class
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false)
                      setFormData({ type: 'class', course_id: '', activity_name: '', selectedDays: [], start_time: '', end_time: '', location: '' })
                      setTimeInput({ start: '', end: '' })
                    }}
                    className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 font-semibold transition-all"
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

  // Month View
  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Calendar</h1>
          <p className="text-gray-500 mt-1">{format(currentDate, 'MMMM yyyy')}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setView('week')}
            className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
          >
            Week View
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            <Plus size={20} />
            Add Class
          </button>
        </div>
      </div>

      {/* Calendar Navigation */}
      <div className="flex items-center justify-between mb-6 bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <button
          onClick={prevMonth}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          <ChevronLeft size={24} />
        </button>
        <h2 className="text-xl font-semibold">{format(currentDate, 'MMMM yyyy')}</h2>
        <div className="flex gap-2">
          <button
            onClick={today}
            className="px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200"
          >
            Today
          </button>
          <button
            onClick={nextMonth}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ChevronRight size={24} />
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Weekday Headers */}
        <div className="grid grid-cols-7 gap-px bg-gray-200">
          {WEEKDAYS.map(day => (
            <div key={day} className="bg-gray-50 p-3 text-center font-semibold text-gray-700">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7 gap-px bg-gray-200">
          {calendarDays.map((day, index) => {
            const { events, classes } = getEventsForDay(day)
            const isCurrentMonth = isSameMonth(day, currentDate)
            const isToday = isSameDay(day, new Date())

            return (
              <div
                key={index}
                className={`min-h-40 bg-white p-2 overflow-y-auto max-h-60 ${
                  !isCurrentMonth ? 'bg-gray-50 text-gray-400' : ''
                } ${isToday ? 'bg-indigo-50' : ''}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className={`text-sm font-semibold ${
                    isToday ? 'text-indigo-600' : 'text-gray-700'
                  }`}>
                    {format(day, 'd')}
                  </div>
                  {(events.length + classes.length) > 0 && (
                    <div className="text-[10px] px-1.5 py-0.5 bg-indigo-100 text-indigo-700 rounded-full font-medium">
                      {events.length + classes.length}
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  {/* Recurring Classes */}
                  {classes.map(cls => (
                    <div
                      key={`class-${cls.id}`}
                      className="text-xs p-1 rounded border-l-2 bg-gray-50 group relative mb-1"
                      style={{ borderLeftColor: cls.color }}
                      title={`${cls.course_name}\n${cls.start_time} - ${cls.end_time}${cls.location ? `\n${cls.location}` : ''}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium line-clamp-1">{cls.course_code || cls.course_name}</span>
                        <button
                          onClick={() => handleDelete(cls.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 rounded"
                        >
                          <X size={10} className="text-red-600" />
                        </button>
                      </div>
                      <div className="text-gray-600 text-[10px]">{cls.start_time} - {cls.end_time}</div>
                      {cls.location && (
                        <div className="text-gray-500 text-[10px] line-clamp-1">📍 {cls.location}</div>
                      )}
                    </div>
                  ))}

                  {/* Calendar Events */}
                  {events.map(event => {
                    const startTime = event.start_time ? parseISO(event.start_time) : null;
                    const endTime = event.end_time ? parseISO(event.end_time) : null;
                    const timeStr = startTime ?
                      (endTime ? `${format(startTime, 'h:mm a')} - ${format(endTime, 'h:mm a')}` : format(startTime, 'h:mm a'))
                      : '';

                    return (
                      <div
                        key={`event-${event.id}`}
                        className="text-xs p-1 rounded border-l-2 bg-blue-50 border-blue-400 group relative mb-1"
                        title={`${event.title}${timeStr ? `\n${timeStr}` : ''}${event.location ? `\n${event.location}` : ''}`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-blue-900 line-clamp-1">{event.title}</span>
                          {!event.canvas_id && (
                            <button
                              onClick={() => handleDeleteEvent(event.id)}
                              className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 rounded"
                            >
                              <X size={10} className="text-red-600" />
                            </button>
                          )}
                        </div>
                        {timeStr && (
                          <div className="text-blue-700 text-[10px]">
                            {timeStr}
                          </div>
                        )}
                        {event.location && (
                          <div className="text-gray-600 text-[10px] line-clamp-1">
                            📍 {event.location}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Polished Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-8 py-6 rounded-t-2xl">
              <h2 className="text-2xl font-bold">Add Class to Schedule</h2>
              <p className="text-indigo-100 text-sm mt-1">Set up your recurring class schedule</p>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              {/* Type Selection */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-3">
                  What are you adding?
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: 'class' })}
                    className={`p-4 rounded-xl font-semibold transition-all ${
                      formData.type === 'class'
                        ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    📚 Class
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: 'activity' })}
                    className={`p-4 rounded-xl font-semibold transition-all ${
                      formData.type === 'activity'
                        ? 'bg-gradient-to-br from-green-500 to-teal-600 text-white shadow-lg'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    ⚽ Activity
                  </button>
                </div>
              </div>

              {/* Course Selection (for classes only) */}
              {formData.type === 'class' && (
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Select Course
                  </label>
                  <select
                    value={formData.course_id}
                    onChange={(e) => setFormData({ ...formData, course_id: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    required
                  >
                    <option value="">Choose a course...</option>
                    {courses.map(course => (
                      <option key={course.id} value={course.id}>{course.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Activity Name (for activities only) */}
              {formData.type === 'activity' && (
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Activity Name
                  </label>
                  <input
                    type="text"
                    value={formData.activity_name}
                    onChange={(e) => setFormData({ ...formData, activity_name: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                    placeholder="e.g., Soccer Practice, Gym, Piano Lessons"
                    required
                  />
                </div>
              )}

              {/* Quick Day Patterns */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-3">
                  Quick Select Days
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
                  <button
                    type="button"
                    onClick={() => selectDayPattern('weekdays')}
                    className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 font-medium shadow-sm transition-all"
                  >
                    M-F
                  </button>
                  <button
                    type="button"
                    onClick={() => selectDayPattern('mwf')}
                    className="px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 font-medium shadow-sm transition-all"
                  >
                    MWF
                  </button>
                  <button
                    type="button"
                    onClick={() => selectDayPattern('tth')}
                    className="px-4 py-2 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg hover:from-purple-600 hover:to-purple-700 font-medium shadow-sm transition-all"
                  >
                    T/Th
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, selectedDays: [] }))}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium transition-all"
                  >
                    Clear
                  </button>
                </div>

                {/* Individual Day Selection */}
                <div className="grid grid-cols-7 gap-2">
                  {DAYS.map((day, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => toggleDay(index)}
                      className={`p-3 rounded-xl font-semibold transition-all ${
                        formData.selectedDays.includes(index)
                          ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg scale-105'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      <div className="text-xs">{day.substring(0, 3)}</div>
                    </button>
                  ))}
                </div>
                {formData.selectedDays.length === 0 && (
                  <p className="text-sm text-red-600 mt-2">⚠️ Please select at least one day</p>
                )}
              </div>

              {/* Time Selection - Smart Input */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Time
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Start Time</label>
                    <input
                      type="text"
                      value={timeInput.start || (formData.start_time ? formData.start_time : '')}
                      onChange={(e) => setTimeInput({ ...timeInput, start: e.target.value })}
                      onBlur={() => handleTimeBlur('start')}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all font-mono"
                      placeholder="9am or 9:30am"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Try: "9am", "2:30pm", "14:30"
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">End Time</label>
                    <input
                      type="text"
                      value={timeInput.end || (formData.end_time ? formData.end_time : '')}
                      onChange={(e) => setTimeInput({ ...timeInput, end: e.target.value })}
                      onBlur={() => handleTimeBlur('end')}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all font-mono"
                      placeholder="10am or 10:30am"
                      required
                    />
                  </div>
                </div>
                {formData.start_time && formData.end_time && (
                  <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-800">
                      ✓ {formData.start_time} - {formData.end_time}
                    </p>
                  </div>
                )}
              </div>

              {/* Location */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Location (Optional)
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  placeholder="e.g., Room 101, Science Building"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={formData.selectedDays.length === 0}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add Class
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false)
                    setFormData({ type: 'class', course_id: '', activity_name: '', selectedDays: [], start_time: '', end_time: '', location: '' })
                    setTimeInput({ start: '', end: '' })
                  }}
                  className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 font-semibold transition-all"
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
