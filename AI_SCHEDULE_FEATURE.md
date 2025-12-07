# AI Schedule Generator Feature

## Overview

The Focus Twin app now includes an **AI-powered schedule generation system** that automatically creates an optimal weekly study schedule based on your classes, personal activities, and upcoming assignments. The system calculates exactly how many hours you need to study each week to achieve good grades and intelligently fits study blocks into your available time.

## Features

### 1. Calendar Import
- **Google Calendar Integration**: Import events from your Google Calendar using a public iCal URL
- **iCal File Upload**: Upload `.ics` files directly from any calendar application
- Automatically categorizes imported events (fitness, work, personal, etc.)
- Filters recurring weekly events for schedule planning

### 2. AI Activity Input with Interactive Review
- **Natural Language Processing**: Describe your weekly activities in plain English
- The AI understands patterns like:
  - "I have gym on Monday and Wednesday at 6pm for 1 hour"
  - "I work Tuesday and Thursday from 2pm to 6pm"
  - "Club meetings every Friday at 4pm for 2 hours"
- Automatically extracts:
  - Activity title
  - Days of week (handles "weekdays", "weekends", "Monday and Wednesday", etc.)
  - Start/end times (supports 12-hour and 24-hour formats)
  - Duration
  - Category (fitness, work, study, extracurricular, etc.)
- **Interactive Confirmation**: After AI parsing, you can:
  - Review all parsed activities
  - Edit any details (name, day, time, category)
  - Delete unwanted activities
  - Add new activities manually
  - Confirm before saving

### 3. Intelligent Schedule Generation
- **Automatic Study Time Calculation**:
  - Base hours: 6 hours/week per course (2 hours per credit hour for a typical 3-credit course)
  - Assignment load: Adds time based on upcoming assignments (next 2 weeks)
  - Exam preparation: Adds 5 hours per upcoming exam
- **Smart Time Slot Allocation**:
  - Finds all available time slots in your week
  - Prioritizes optimal study times (morning > afternoon > evening)
  - Caps study sessions at 3 hours maximum for better retention
  - Distributes study time across the week for each course
- **Complete Schedule View**:
  - Shows all classes from Canvas
  - Displays personal activities
  - Highlights generated study blocks
  - Color-coded by course/activity type

### 4. Study Hours Dashboard with Clear Time Slots
- **Recommended Study Hours**: Based on course load, assignments, and exams
- **Allocated Study Hours**: How much study time was fit into your schedule
- **Deficit Indicator**: Shows if you need to find more time or adjust activities
- **Study Block Summary**: Dedicated section showing exactly when to study:
  - Each study session with course name, day, and specific time slots
  - Duration clearly displayed (e.g., "2.5 hour session")
  - Color-coded by course
  - Prominent visual indicators (📚) for easy identification

## How to Use

### Step 1: Import Your Calendar or Add Activities

Navigate to **AI Schedule** in the sidebar.

#### Option A: Calendar Import
1. Click the "Calendar Import" tab
2. Either:
   - Paste your Google Calendar public URL (iCal format)
   - Upload an `.ics` file from your calendar app
3. Click "Import Calendar"

#### Option B: AI Activity Input (Recommended)
1. Click the "AI Activity Input" tab
2. Describe your weekly activities in the text area. Example:
   ```
   I have gym on Monday and Wednesday at 6pm for 1 hour.
   I work Tuesday and Thursday from 2pm to 6pm.
   I have club meetings on Friday at 4pm for 2 hours.
   I volunteer on weekends from 10am to 12pm.
   ```
3. Click "Create Activities from Description"
4. **Review & Confirm Modal** appears with all parsed activities:
   - ✏️ Click the **Edit** button on any activity to modify details
   - 🗑️ Click the **Delete** button to remove unwanted activities
   - ➕ Click "Add Another Activity" to manually add more
   - Each activity shows: Name, Day, Time, and Category
5. Once satisfied, click "Save X Activities" to confirm

### Step 2: Sync Canvas Classes

Make sure you've synced your Canvas courses in the Settings page. This is essential for the AI to know your class schedule and upcoming assignments.

### Step 3: Generate Your Schedule

Click the big **"Generate My Schedule"** button. The AI will:
1. Analyze your class schedule from Canvas
2. Factor in your personal activities
3. Review upcoming assignments and exams
4. Calculate required study hours
5. Find optimal time slots
6. Create a complete weekly schedule

### Step 4: Review Your Schedule

The generated schedule shows:

**Study Hours Dashboard:**
- Recommended hours (based on workload)
- Allocated hours (what fits in your schedule)
- Deficit/surplus indicator

**Your Study Times This Week** (Purple section):
A dedicated summary showing exactly when to study:
- Course name with color coding
- **Specific day and time** (e.g., "Monday • 09:00 - 11:00")
- Duration of each session
- Easy-to-scan card layout

**Complete Weekly Schedule:**
- Day-by-day breakdown
- Classes, activities, and study blocks all visible
- Study sessions highlighted with 📚 icon
- Times prominently displayed with ⏰ icon
- Color-coded: Blue for classes, Purple for study sessions, Gray for activities

## Technical Architecture

### Backend Services

#### `/server/calendar-import-service.js`
- Parses iCal data using the `node-ical` library
- Extracts event details (title, time, recurrence, location)
- Categorizes events automatically

#### `/server/ai-activity-service.js`
- Natural language processing for activity descriptions
- Pattern matching for days, times, and durations
- Smart categorization algorithm

#### `/server/schedule-generator-service.js`
- **Study Requirements Calculator**: Analyzes courses, assignments, exams
- **Time Grid Builder**: Maps occupied vs. available time slots
- **Smart Allocation Algorithm**: Distributes study time optimally
- Priority-based slot selection (prefers morning/afternoon)
- Ensures balanced distribution across courses

### API Endpoints

#### Personal Activities
- `GET /api/activities` - Get all personal activities
- `POST /api/activities` - Add a new activity
- `DELETE /api/activities/:id` - Remove an activity

#### Calendar Import
- `POST /api/calendar/import` - Import calendar (iCal URL or data)

#### AI Parsing
- `POST /api/activities/parse` - Parse activities from text (preview only)
- `POST /api/activities/parse-and-save` - Parse and save activities

#### Schedule Generation
- `POST /api/schedule/generate` - Generate optimized weekly schedule
- `GET /api/schedule/generated` - Get latest generated schedule

### Database Schema

#### `personal_activities`
Stores user's non-class activities (gym, work, clubs, etc.)

#### `generated_schedules`
Stores complete generated schedules with metadata

#### `study_blocks`
Individual study sessions allocated by the generator

## Algorithm Details

### Study Time Calculation

For each course:
```
Base Hours = 6 hours/week (2 hrs/credit × 3 credits)
Assignment Hours = Σ(estimated_hours for upcoming assignments) / 2
Exam Hours = (number of upcoming exams × 5 hours) / 2
Total = Base + Assignment + Exam
```

### Time Slot Prioritization

Slots are ranked by:
1. **Day Type**: Weekdays (M-F) > Weekends
2. **Time of Day**:
   - Morning (9am-12pm): Priority 3
   - Afternoon (2pm-5pm): Priority 2
   - Evening (6pm-8pm): Priority 1

### Study Block Allocation

1. Sort available slots by priority (highest first)
2. For each slot:
   - Find course with most remaining study hours
   - Allocate study block (max 3 hours)
   - Update remaining hours for that course
3. Continue until all study hours allocated or slots exhausted

## Examples

### Example Input
```
I have gym Monday, Wednesday, and Friday at 6am for 1.5 hours.
I work on Tuesday from 1pm to 5pm.
I have a study group Thursday evenings from 7pm to 9pm.
```

### Example Output
The AI generates a schedule with:
- 3 gym sessions (Mon/Wed/Fri 6:00-7:30am)
- 1 work shift (Tue 1:00-5:00pm)
- 1 study group (Thu 7:00-9:00pm)
- Study blocks optimally placed in available time slots
- Study hours calculated based on Canvas courses and assignments

## Tips for Best Results

1. **Be Specific**: Include exact times and days
2. **Mention Duration**: "for 2 hours" or "from 2pm to 4pm"
3. **Use Common Formats**: The AI understands various time formats (6pm, 18:00, 6:00pm)
4. **Update Regularly**: Regenerate your schedule weekly as assignments change
5. **Sync Canvas Often**: Keep assignments and exams up to date for accurate study time calculations

## Future Enhancements

Potential improvements:
- Study preference settings (preferred times, breaks, session length)
- Multi-week schedule generation
- Study reminder notifications
- Integration with Google Calendar (write-back)
- Machine learning to optimize based on past performance
- Pomodoro timer integration for study blocks

## Troubleshooting

**Problem**: Generated schedule shows 0 study hours
- **Solution**: Make sure you've synced Canvas courses and have upcoming assignments

**Problem**: Calendar import shows 0 imported events
- **Solution**: Ensure your calendar URL is public and in iCal format, and events are recurring weekly

**Problem**: AI parsing doesn't recognize times
- **Solution**: Use clearer time formats like "6pm" or "18:00" instead of "evening"

**Problem**: Not enough study hours allocated
- **Solution**: Review personal activities - you may need to reduce commitments or mark some as "flexible"

## Support

For issues or feature requests, please check the Focus Twin documentation or submit an issue.
