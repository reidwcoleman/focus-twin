import express from 'express';
import cors from 'cors';
import db from './database.js';
import CanvasService from './canvas-service.js';
import CalendarImportService from './calendar-import-service.js';
import AIActivityService from './ai-activity-service.js';
import ScheduleGeneratorService from './schedule-generator-service.js';

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

// ===== COURSES =====
app.get('/api/courses', (req, res) => {
  const courses = db.prepare('SELECT * FROM courses ORDER BY name').all();
  res.json(courses);
});

app.post('/api/courses', (req, res) => {
  const { name, code, instructor, color } = req.body;
  const result = db.prepare(
    'INSERT INTO courses (name, code, instructor, color) VALUES (?, ?, ?, ?)'
  ).run(name, code, instructor, color);
  res.json({ id: result.lastInsertRowid, name, code, instructor, color });
});

app.put('/api/courses/:id', (req, res) => {
  const { name, code, instructor, color } = req.body;
  db.prepare(
    'UPDATE courses SET name = ?, code = ?, instructor = ?, color = ? WHERE id = ?'
  ).run(name, code, instructor, color, req.params.id);
  res.json({ id: req.params.id, name, code, instructor, color });
});

app.delete('/api/courses/:id', (req, res) => {
  db.prepare('DELETE FROM courses WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ===== SCHEDULE =====
app.get('/api/schedule', (req, res) => {
  const schedule = db.prepare(`
    SELECT s.*, c.name as course_name, c.code as course_code, c.color
    FROM schedule s
    JOIN courses c ON s.course_id = c.id
    ORDER BY s.day_of_week, s.start_time
  `).all();
  res.json(schedule);
});

app.post('/api/schedule', (req, res) => {
  const { course_id, day_of_week, start_time, end_time, location } = req.body;
  const result = db.prepare(
    'INSERT INTO schedule (course_id, day_of_week, start_time, end_time, location) VALUES (?, ?, ?, ?, ?)'
  ).run(course_id, day_of_week, start_time, end_time, location);
  res.json({ id: result.lastInsertRowid });
});

app.delete('/api/schedule/:id', (req, res) => {
  db.prepare('DELETE FROM schedule WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ===== ASSIGNMENTS =====
app.get('/api/assignments', (req, res) => {
  const assignments = db.prepare(`
    SELECT a.*, c.name as course_name, c.code as course_code, c.color
    FROM assignments a
    JOIN courses c ON a.course_id = c.id
    ORDER BY a.due_date
  `).all();
  res.json(assignments);
});

app.post('/api/assignments', (req, res) => {
  const { course_id, title, description, due_date, priority, estimated_hours } = req.body;
  const result = db.prepare(
    'INSERT INTO assignments (course_id, title, description, due_date, priority, estimated_hours) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(course_id, title, description, due_date, priority, estimated_hours);
  res.json({ id: result.lastInsertRowid });
});

app.put('/api/assignments/:id', (req, res) => {
  const { status, completed_at } = req.body;
  db.prepare(
    'UPDATE assignments SET status = ?, completed_at = ? WHERE id = ?'
  ).run(status, completed_at, req.params.id);
  res.json({ success: true });
});

app.delete('/api/assignments/:id', (req, res) => {
  db.prepare('DELETE FROM assignments WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ===== GRADES =====
app.get('/api/grades', (req, res) => {
  const grades = db.prepare(`
    SELECT g.*, c.name as course_name, c.code as course_code
    FROM grades g
    JOIN courses c ON g.course_id = c.id
    ORDER BY g.date_received DESC
  `).all();
  res.json(grades);
});

app.get('/api/grades/summary', (req, res) => {
  const summary = db.prepare(`
    SELECT
      c.id,
      c.name,
      c.code,
      c.color,
      AVG((g.grade / g.max_grade) * 100) as average
    FROM courses c
    LEFT JOIN grades g ON c.id = g.course_id
    GROUP BY c.id
  `).all();
  res.json(summary);
});

app.post('/api/grades', (req, res) => {
  const { course_id, assignment_name, grade, max_grade, weight, category } = req.body;
  const result = db.prepare(
    'INSERT INTO grades (course_id, assignment_name, grade, max_grade, weight, category) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(course_id, assignment_name, grade, max_grade, weight, category);
  res.json({ id: result.lastInsertRowid });
});

app.delete('/api/grades/:id', (req, res) => {
  db.prepare('DELETE FROM grades WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ===== TASKS =====
app.get('/api/tasks', (req, res) => {
  const tasks = db.prepare('SELECT * FROM tasks ORDER BY due_date').all();
  res.json(tasks);
});

app.post('/api/tasks', (req, res) => {
  const { title, description, due_date, priority, category } = req.body;
  const result = db.prepare(
    'INSERT INTO tasks (title, description, due_date, priority, category) VALUES (?, ?, ?, ?, ?)'
  ).run(title, description, due_date, priority, category);
  res.json({ id: result.lastInsertRowid });
});

app.put('/api/tasks/:id', (req, res) => {
  const { status, completed_at } = req.body;
  db.prepare(
    'UPDATE tasks SET status = ?, completed_at = ? WHERE id = ?'
  ).run(status, completed_at, req.params.id);
  res.json({ success: true });
});

app.delete('/api/tasks/:id', (req, res) => {
  db.prepare('DELETE FROM tasks WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ===== NOTES =====
app.get('/api/notes', (req, res) => {
  const notes = db.prepare(`
    SELECT n.*, c.name as course_name, c.code as course_code
    FROM notes n
    LEFT JOIN courses c ON n.course_id = c.id
    ORDER BY n.updated_at DESC
  `).all();
  res.json(notes);
});

app.post('/api/notes', (req, res) => {
  const { course_id, title, content, tags } = req.body;
  const result = db.prepare(
    'INSERT INTO notes (course_id, title, content, tags) VALUES (?, ?, ?, ?)'
  ).run(course_id, title, content, tags);
  res.json({ id: result.lastInsertRowid });
});

app.put('/api/notes/:id', (req, res) => {
  const { title, content, tags } = req.body;
  db.prepare(
    'UPDATE notes SET title = ?, content = ?, tags = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
  ).run(title, content, tags, req.params.id);
  res.json({ success: true });
});

app.delete('/api/notes/:id', (req, res) => {
  db.prepare('DELETE FROM notes WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ===== EXAMS =====
app.get('/api/exams', (req, res) => {
  const exams = db.prepare(`
    SELECT e.*, c.name as course_name, c.code as course_code, c.color
    FROM exams e
    JOIN courses c ON e.course_id = c.id
    ORDER BY e.exam_date
  `).all();
  res.json(exams);
});

app.post('/api/exams', (req, res) => {
  const { course_id, title, exam_date, location, duration, topics, study_materials } = req.body;
  const result = db.prepare(
    'INSERT INTO exams (course_id, title, exam_date, location, duration, topics, study_materials) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(course_id, title, exam_date, location, duration, topics, study_materials);
  res.json({ id: result.lastInsertRowid });
});

app.delete('/api/exams/:id', (req, res) => {
  db.prepare('DELETE FROM exams WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ===== STUDY SESSIONS =====
app.get('/api/study-sessions', (req, res) => {
  const sessions = db.prepare(`
    SELECT s.*, c.name as course_name, c.code as course_code
    FROM study_sessions s
    LEFT JOIN courses c ON s.course_id = c.id
    ORDER BY s.start_time DESC
  `).all();
  res.json(sessions);
});

app.post('/api/study-sessions', (req, res) => {
  const { course_id, title, start_time, end_time, notes } = req.body;
  const result = db.prepare(
    'INSERT INTO study_sessions (course_id, title, start_time, end_time, notes) VALUES (?, ?, ?, ?, ?)'
  ).run(course_id, title, start_time, end_time, notes);
  res.json({ id: result.lastInsertRowid });
});

// ===== DASHBOARD STATS =====
app.get('/api/dashboard/stats', (req, res) => {
  const stats = {
    totalAssignments: db.prepare('SELECT COUNT(*) as count FROM assignments WHERE status = "pending"').get().count,
    completedToday: db.prepare('SELECT COUNT(*) as count FROM assignments WHERE DATE(completed_at) = DATE("now")').get().count,
    upcomingExams: db.prepare('SELECT COUNT(*) as count FROM exams WHERE exam_date >= DATE("now")').get().count,
    totalCourses: db.prepare('SELECT COUNT(*) as count FROM courses').get().count,
  };
  res.json(stats);
});

// ===== SETTINGS =====
app.get('/api/settings/:key', (req, res) => {
  const setting = db.prepare('SELECT * FROM settings WHERE key = ?').get(req.params.key);
  res.json(setting || null);
});

app.post('/api/settings', (req, res) => {
  const { key, value } = req.body;
  db.prepare(`
    INSERT INTO settings (key, value) VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = CURRENT_TIMESTAMP
  `).run(key, value, value);
  res.json({ success: true });
});

// ===== CALENDAR EVENTS =====
app.get('/api/calendar-events', (req, res) => {
  const { month, year } = req.query;

  let query = `
    SELECT ce.*, c.name as course_name, c.code as course_code, c.color
    FROM calendar_events ce
    LEFT JOIN courses c ON ce.course_id = c.id
  `;

  const params = [];

  if (month && year) {
    // Filter by month and year
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);
    query += ` WHERE ce.start_time >= ? AND ce.start_time <= ?`;
    params.push(startDate.toISOString(), endDate.toISOString());
  }

  query += ` ORDER BY ce.start_time`;

  const events = db.prepare(query).all(...params);
  res.json(events);
});

app.post('/api/calendar-events', (req, res) => {
  const { course_id, title, description, start_time, end_time, location, event_type } = req.body;
  const result = db.prepare(
    'INSERT INTO calendar_events (course_id, title, description, start_time, end_time, location, event_type) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(course_id, title, description, start_time, end_time, location, event_type || 'event');
  res.json({ id: result.lastInsertRowid });
});

app.delete('/api/calendar-events/:id', (req, res) => {
  db.prepare('DELETE FROM calendar_events WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ===== CANVAS SYNC =====
app.post('/api/canvas/test', async (req, res) => {
  const { canvasUrl, accessToken } = req.body;

  try {
    const canvas = new CanvasService(canvasUrl, accessToken);
    const result = await canvas.testConnection();
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/canvas/sync', async (req, res) => {
  try {
    // Get Canvas credentials from settings
    const canvasUrlSetting = db.prepare('SELECT value FROM settings WHERE key = ?').get('canvas_url');
    const accessTokenSetting = db.prepare('SELECT value FROM settings WHERE key = ?').get('canvas_token');

    if (!canvasUrlSetting || !accessTokenSetting) {
      return res.status(400).json({ success: false, error: 'Canvas not configured' });
    }

    const canvas = new CanvasService(canvasUrlSetting.value, accessTokenSetting.value);

    // Sync courses
    const canvasCourses = await canvas.getCourses();
    const syncedCourses = [];

    for (const course of canvasCourses) {
      // Check if course already exists
      const existing = db.prepare('SELECT * FROM courses WHERE canvas_id = ?').get(course.canvas_id);

      if (existing) {
        // Update existing course
        db.prepare(
          'UPDATE courses SET name = ?, code = ?, instructor = ? WHERE canvas_id = ?'
        ).run(course.name, course.code, course.instructor, course.canvas_id);
        syncedCourses.push({ ...existing, ...course });
      } else {
        // Insert new course with random color
        const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#06b6d4'];
        const color = colors[Math.floor(Math.random() * colors.length)];

        const result = db.prepare(
          'INSERT INTO courses (name, code, instructor, color, canvas_id) VALUES (?, ?, ?, ?, ?)'
        ).run(course.name, course.code, course.instructor, color, course.canvas_id);

        syncedCourses.push({ id: result.lastInsertRowid, ...course, color });
      }
    }

    // Sync assignments for each course
    let totalAssignments = 0;
    let totalGrades = 0;
    for (const course of syncedCourses) {
      const assignments = await canvas.getAssignments(course.canvas_id);

      for (const assignment of assignments) {
        if (!assignment.due_date) continue; // Skip assignments without due dates

        // Check if assignment already exists
        const existing = db.prepare('SELECT * FROM assignments WHERE canvas_id = ?').get(assignment.canvas_id);

        if (existing) {
          // Update existing assignment
          db.prepare(
            'UPDATE assignments SET title = ?, description = ?, due_date = ?, status = ? WHERE canvas_id = ?'
          ).run(assignment.title, assignment.description, assignment.due_date, assignment.status, assignment.canvas_id);
        } else {
          // Insert new assignment
          db.prepare(
            'INSERT INTO assignments (course_id, title, description, due_date, priority, status, canvas_id) VALUES (?, ?, ?, ?, ?, ?, ?)'
          ).run(course.id, assignment.title, assignment.description, assignment.due_date, 'medium', assignment.status, assignment.canvas_id);
          totalAssignments++;
        }

        // Sync grade if assignment is graded
        if (assignment.graded && assignment.grade != null && assignment.max_grade != null) {
          // Check if grade already exists
          const existingGrade = db.prepare(
            'SELECT * FROM grades WHERE course_id = ? AND assignment_name = ?'
          ).get(course.id, assignment.title);

          if (existingGrade) {
            // Update existing grade
            db.prepare(
              'UPDATE grades SET grade = ?, max_grade = ? WHERE course_id = ? AND assignment_name = ?'
            ).run(assignment.grade, assignment.max_grade, course.id, assignment.title);
          } else {
            // Insert new grade
            db.prepare(
              'INSERT INTO grades (course_id, assignment_name, grade, max_grade, category) VALUES (?, ?, ?, ?, ?)'
            ).run(course.id, assignment.title, assignment.grade, assignment.max_grade, 'Canvas Assignment');
            totalGrades++;
          }
        }
      }
    }

    // Note: We no longer sync per-course schedules as Canvas API doesn't support it well
    // Instead, we rely on calendar_events which contains all class meetings

    // Sync ALL calendar events
    const calendarEvents = await canvas.getCalendarEvents();
    let totalEvents = 0;

    for (const event of calendarEvents) {
      if (!event.start_time) continue; // Skip events without start time

      // Find matching course by canvas_id
      const course = syncedCourses.find(c => c.canvas_id === event.canvas_course_id);

      // Check if event already exists
      const existing = db.prepare('SELECT * FROM calendar_events WHERE canvas_id = ?').get(event.canvas_id);

      if (existing) {
        // Update existing event
        db.prepare(`
          UPDATE calendar_events
          SET title = ?, description = ?, start_time = ?, end_time = ?, location = ?, event_type = ?, course_id = ?
          WHERE canvas_id = ?
        `).run(event.title, event.description, event.start_time, event.end_time, event.location, event.event_type, course?.id || null, event.canvas_id);
      } else {
        // Insert new event
        db.prepare(`
          INSERT INTO calendar_events (course_id, title, description, start_time, end_time, location, event_type, canvas_id)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(course?.id || null, event.title, event.description, event.start_time, event.end_time, event.location, event.event_type, event.canvas_id);
        totalEvents++;
      }
    }

    // Update last sync time
    db.prepare(`
      INSERT INTO settings (key, value) VALUES ('last_sync', ?)
      ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = CURRENT_TIMESTAMP
    `).run(new Date().toISOString(), new Date().toISOString());

    res.json({
      success: true,
      stats: {
        courses: syncedCourses.length,
        newAssignments: totalAssignments,
        newGrades: totalGrades,
        calendarEvents: totalEvents
      }
    });
  } catch (error) {
    console.error('Canvas sync error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/canvas/sync-status', (req, res) => {
  const lastSync = db.prepare('SELECT value FROM settings WHERE key = ?').get('last_sync');
  res.json({
    lastSync: lastSync ? lastSync.value : null,
    configured: !!(
      db.prepare('SELECT value FROM settings WHERE key = ?').get('canvas_url') &&
      db.prepare('SELECT value FROM settings WHERE key = ?').get('canvas_token')
    )
  });
});

// ===== CALENDAR EVENTS =====
app.get('/api/calendar-events', (req, res) => {
  const events = db.prepare(`
    SELECT ce.*, c.name as course_name, c.code as course_code, c.color
    FROM calendar_events ce
    LEFT JOIN courses c ON ce.course_id = c.id
    ORDER BY ce.start_time
  `).all();
  res.json(events);
});

app.delete('/api/calendar-events/:id', (req, res) => {
  db.prepare('DELETE FROM calendar_events WHERE id = ? AND canvas_id IS NULL').run(req.params.id);
  res.json({ success: true });
});

// ===== PERSONAL ACTIVITIES =====
app.get('/api/activities', (req, res) => {
  const activities = db.prepare('SELECT * FROM personal_activities ORDER BY day_of_week, start_time').all();
  res.json(activities);
});

app.post('/api/activities', (req, res) => {
  const { title, description, day_of_week, start_time, end_time, recurrence, category, is_flexible } = req.body;
  const result = db.prepare(`
    INSERT INTO personal_activities (title, description, day_of_week, start_time, end_time, recurrence, category, is_flexible)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(title, description, day_of_week, start_time, end_time, recurrence || 'weekly', category || 'personal', is_flexible ? 1 : 0);
  res.json({ id: result.lastInsertRowid, title, description, day_of_week, start_time, end_time, recurrence, category, is_flexible });
});

app.delete('/api/activities/:id', (req, res) => {
  db.prepare('DELETE FROM personal_activities WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ===== CALENDAR IMPORT =====
app.post('/api/calendar/import', async (req, res) => {
  try {
    const { icalData, url } = req.body;
    const calendarService = new CalendarImportService();

    let events = [];
    if (icalData) {
      events = await calendarService.parseICalData(icalData);
    } else if (url) {
      events = await calendarService.parseICalFromUrl(url);
    } else {
      return res.status(400).json({ success: false, error: 'Please provide iCal data or URL' });
    }

    // Insert events as personal activities
    let imported = 0;
    for (const event of events) {
      // Only import recurring events
      if (event.recurrence === 'weekly' && event.start_time && event.end_time) {
        db.prepare(`
          INSERT INTO personal_activities (title, description, day_of_week, start_time, end_time, recurrence, category, is_flexible)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(event.title, event.description, event.day_of_week, event.start_time, event.end_time, event.recurrence, event.category, 0);
        imported++;
      }
    }

    res.json({ success: true, imported, total: events.length });
  } catch (error) {
    console.error('Calendar import error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===== AI ACTIVITY PARSER =====
app.post('/api/activities/parse', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ success: false, error: 'Please provide activity description' });
    }

    const aiService = new AIActivityService();
    const activities = aiService.parseActivities(text);

    res.json({ success: true, activities });
  } catch (error) {
    console.error('AI parsing error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/activities/parse-and-save', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ success: false, error: 'Please provide activity description' });
    }

    const aiService = new AIActivityService();
    const activities = aiService.parseActivities(text);

    // Save each activity
    let saved = 0;
    for (const activity of activities) {
      if (activity.day_of_week !== null && activity.start_time && activity.end_time) {
        db.prepare(`
          INSERT INTO personal_activities (title, description, day_of_week, start_time, end_time, recurrence, category, is_flexible)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          activity.title,
          activity.description,
          activity.day_of_week,
          activity.start_time,
          activity.end_time,
          activity.recurrence || 'weekly',
          activity.category || 'personal',
          activity.is_flexible ? 1 : 0
        );
        saved++;
      }
    }

    res.json({ success: true, parsed: activities.length, saved });
  } catch (error) {
    console.error('AI parsing error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===== SCHEDULE GENERATION =====
app.post('/api/schedule/generate', async (req, res) => {
  try {
    const generator = new ScheduleGeneratorService();
    const result = await generator.generateWeeklySchedule();
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Schedule generation error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/schedule/generated', (req, res) => {
  const latestSchedule = db.prepare(`
    SELECT * FROM generated_schedules
    ORDER BY created_at DESC
    LIMIT 1
  `).get();

  if (!latestSchedule) {
    return res.json({ success: false, message: 'No generated schedule found' });
  }

  const studyBlocks = db.prepare(`
    SELECT sb.*, c.name as course_name, c.code as course_code, c.color
    FROM study_blocks sb
    JOIN courses c ON sb.course_id = c.id
    WHERE sb.generated_schedule_id = ?
    ORDER BY sb.day_of_week, sb.start_time
  `).all(latestSchedule.id);

  res.json({
    success: true,
    schedule: JSON.parse(latestSchedule.schedule_data),
    studyHours: {
      recommended: latestSchedule.study_hours_recommended,
      allocated: latestSchedule.study_hours_available,
      deficit: Math.max(0, latestSchedule.study_hours_recommended - latestSchedule.study_hours_available)
    },
    studyBlocks,
    createdAt: latestSchedule.created_at
  });
});

app.listen(PORT, () => {
  console.log(`🎓 Focus Twin server running on http://localhost:${PORT}`);
});
