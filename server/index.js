import express from 'express';
import cors from 'cors';
import db from './database.js';
import CanvasService from './canvas-service.js';

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

    // Sync schedules for each course
    let totalSchedules = 0;
    for (const course of syncedCourses) {
      const schedules = await canvas.getCourseSchedule(course.canvas_id);

      // Delete existing schedules for this course
      db.prepare('DELETE FROM schedule WHERE course_id = ?').run(course.id);

      // Insert new schedules
      for (const schedule of schedules) {
        db.prepare(
          'INSERT INTO schedule (course_id, day_of_week, start_time, end_time, location) VALUES (?, ?, ?, ?, ?)'
        ).run(course.id, schedule.day_of_week, schedule.start_time, schedule.end_time, schedule.location);
        totalSchedules++;
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
        schedules: totalSchedules
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

app.listen(PORT, () => {
  console.log(`🎓 Focus Twin server running on http://localhost:${PORT}`);
});
