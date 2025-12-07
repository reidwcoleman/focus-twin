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
    course_id: '',
    day_of_week: 1,
    start_time: '',
    end_time: '',
    location: ''
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

  const handleSubmit = async (e) => {
    e.preventDefault()
    await fetch('/api/schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    })
    setShowModal(false)
    setFormData({ course_id: '', day_of_week: 1, start_time: '', end_time: '', location: '' })
    fetchData()
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

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-md">
              <h2 className="text-xl font-bold mb-4">Add Class to Schedule</h2>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Day</label>
                  <select
                    value={formData.day_of_week}
                    onChange={(e) => setFormData({ ...formData, day_of_week: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    {DAYS.map((day, index) => (
                      <option key={index} value={index}>{day}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                    <input
                      type="time"
                      value={formData.start_time}
                      onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                    <input
                      type="time"
                      value={formData.end_time}
                      onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="Room 101"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                  >
                    Add Class
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

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Add Class to Schedule</h2>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Day</label>
                <select
                  value={formData.day_of_week}
                  onChange={(e) => setFormData({ ...formData, day_of_week: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  {DAYS.map((day, index) => (
                    <option key={index} value={index}>{day}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                  <input
                    type="time"
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                  <input
                    type="time"
                    value={formData.end_time}
                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="Room 101"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  Add Class
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
