# Focus Twin 🎓

**Your entire school life, organized automatically.**

Focus Twin is a comprehensive web application that helps students manage every aspect of their academic life - from class schedules and assignments to grades and study notes. Built with React, Node.js, and SQLite.

## Features ✨

### 📊 Dashboard
- Quick overview of all pending assignments
- Today's class schedule
- Upcoming exams
- Grade statistics
- Completion tracking

### 📅 Schedule Management
- Weekly class timetable
- Color-coded courses
- Location tracking
- Easy drag-and-drop interface

### 📚 Assignment Tracker
- Create and manage homework assignments
- Set due dates and priorities
- Track completion status
- Estimate time required
- Filter by status (pending/completed)

### 🏆 Grade Tracker
- Record grades for all courses
- Automatic GPA calculation
- Grade breakdown by course
- Category-based grading (exams, quizzes, homework)
- Performance analytics

### ✅ Task Manager
- General to-do list
- Priority levels
- Category organization
- Due date reminders

### 📝 Notes System
- Create and organize study notes
- Link notes to specific courses
- Tag-based organization
- Full-text search
- Markdown support

### 🎨 Course Management
- Add and manage courses
- Assign instructors
- Color-code for easy identification
- Track all course-related data

## Tech Stack 🛠️

### Frontend
- **React 18** - UI framework
- **React Router** - Navigation
- **Tailwind CSS** - Styling
- **Vite** - Build tool
- **Lucide React** - Icons
- **date-fns** - Date formatting

### Backend
- **Node.js** - Runtime
- **Express** - Web framework
- **better-sqlite3** - Database
- **CORS** - API security

## Installation 🚀

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd focus-twin
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the application**
   ```bash
   npm run dev
   ```

   This will start:
   - Frontend dev server on `http://localhost:3000`
   - Backend API server on `http://localhost:5000`

4. **Open your browser**
   Navigate to `http://localhost:3000`

## Project Structure 📁

```
focus-twin/
├── server/
│   ├── database.js       # SQLite database initialization
│   └── index.js          # Express API server
├── src/
│   ├── pages/
│   │   ├── Dashboard.jsx
│   │   ├── Schedule.jsx
│   │   ├── Assignments.jsx
│   │   ├── Grades.jsx
│   │   ├── Tasks.jsx
│   │   ├── Notes.jsx
│   │   └── Courses.jsx
│   ├── App.jsx           # Main app component with routing
│   ├── main.jsx          # React entry point
│   └── index.css         # Global styles
├── package.json
├── vite.config.js
└── README.md
```

## Database Schema 🗄️

The app uses SQLite with the following tables:

- **courses** - Course information
- **schedule** - Weekly class timetable
- **assignments** - Homework and projects
- **grades** - Grade records
- **tasks** - General to-do items
- **notes** - Study notes
- **exams** - Exam schedule
- **study_sessions** - Study time tracking

## API Endpoints 🔌

### Courses
- `GET /api/courses` - Get all courses
- `POST /api/courses` - Create a course
- `PUT /api/courses/:id` - Update a course
- `DELETE /api/courses/:id` - Delete a course

### Schedule
- `GET /api/schedule` - Get weekly schedule
- `POST /api/schedule` - Add class to schedule
- `DELETE /api/schedule/:id` - Remove class

### Assignments
- `GET /api/assignments` - Get all assignments
- `POST /api/assignments` - Create assignment
- `PUT /api/assignments/:id` - Update assignment status
- `DELETE /api/assignments/:id` - Delete assignment

### Grades
- `GET /api/grades` - Get all grades
- `GET /api/grades/summary` - Get grade summary by course
- `POST /api/grades` - Add grade
- `DELETE /api/grades/:id` - Delete grade

### Tasks
- `GET /api/tasks` - Get all tasks
- `POST /api/tasks` - Create task
- `PUT /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task

### Notes
- `GET /api/notes` - Get all notes
- `POST /api/notes` - Create note
- `PUT /api/notes/:id` - Update note
- `DELETE /api/notes/:id` - Delete note

### Dashboard
- `GET /api/dashboard/stats` - Get dashboard statistics

## Usage Guide 📖

### Getting Started

1. **Add Your Courses**
   - Navigate to "Courses" page
   - Click "Add Course"
   - Enter course name, code, instructor, and pick a color
   - Click "Add Course"

2. **Set Up Your Schedule**
   - Go to "Schedule" page
   - Click "Add Class"
   - Select course, day, time, and location
   - Repeat for all your classes

3. **Track Assignments**
   - Visit "Assignments" page
   - Click "New Assignment"
   - Fill in details: course, title, due date, priority
   - Mark as complete when done

4. **Record Grades**
   - Go to "Grades" page
   - Click "Add Grade"
   - Enter assignment name, score, and category
   - View your GPA on the dashboard

5. **Take Notes**
   - Navigate to "Notes" page
   - Click "New Note"
   - Write your notes with optional course linking
   - Add tags for easy searching

## Smart Features 🤖

### Automatic Organization
- **Color Coding** - Each course has a unique color for visual organization
- **Priority System** - Assignments and tasks use priority levels (high/medium/low)
- **Status Tracking** - Automatic tracking of pending vs completed items
- **Date Sorting** - Everything sorted by due date automatically

### Quick Stats
- Pending assignments count
- Completed items today
- Upcoming exams
- Course averages

### Filtering & Search
- Filter assignments by status
- Search notes by title, content, or tags
- View schedule by day

## Development 🔧

### Available Scripts

- `npm run dev` - Start both frontend and backend in development mode
- `npm run server` - Start only the backend server
- `npm run client` - Start only the frontend
- `npm run build` - Build for production
- `npm run preview` - Preview production build

### Environment

The app runs entirely locally with no external dependencies:
- All data stored in local SQLite database (`server/school.db`)
- No internet connection required after installation
- Privacy-focused - your data never leaves your computer

## Future Enhancements 💡

Potential features to add:
- [ ] Study timer with Pomodoro technique
- [ ] Export data to PDF/CSV
- [ ] Calendar view for assignments and exams
- [ ] Grade predictions and trend analysis
- [ ] Study session tracking and analytics
- [ ] File attachments for assignments
- [ ] Reminder notifications
- [ ] Dark mode
- [ ] Mobile app version
- [ ] Cloud sync option

## License 📄

MIT License - feel free to use this for your own academic organization!

## Support 💬

If you encounter any issues or have suggestions, please open an issue on GitHub.

---

**Built with ❤️ for students who want to stay organized and succeed academically.**
