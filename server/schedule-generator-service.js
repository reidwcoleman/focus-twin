import db from './database.js';

class ScheduleGeneratorService {
  constructor() {
    // Constants for schedule generation
    this.DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    this.MIN_STUDY_BLOCK_HOURS = 1; // Minimum study session length
    this.MAX_STUDY_BLOCK_HOURS = 3; // Maximum study session length
    this.PREFERRED_STUDY_TIMES = {
      weekday: { start: '09:00', end: '22:00' },
      weekend: { start: '10:00', end: '20:00' }
    };
  }

  /**
   * Generate a complete weekly schedule
   * Combines classes, activities, and optimal study times
   */
  async generateWeeklySchedule() {
    // 1. Get all scheduled classes
    const classes = db.prepare(`
      SELECT s.*, c.name as course_name, c.code as course_code, c.color, c.id as course_id
      FROM schedule s
      JOIN courses c ON s.course_id = c.id
      ORDER BY s.day_of_week, s.start_time
    `).all();

    // 2. Get all personal activities
    const activities = db.prepare(`
      SELECT * FROM personal_activities
      WHERE recurrence = 'weekly'
      ORDER BY day_of_week, start_time
    `).all();

    // 3. Get all courses for study time calculation
    const courses = db.prepare('SELECT * FROM courses').all();

    // 4. Calculate required study hours per course
    const studyRequirements = await this.calculateStudyRequirements(courses);

    // 5. Build weekly time grid
    const weeklyGrid = this.buildWeeklyGrid(classes, activities);

    // 6. Find available time slots
    const availableSlots = this.findAvailableSlots(weeklyGrid);

    // 7. Allocate study blocks optimally
    const studyBlocks = this.allocateStudyBlocks(availableSlots, studyRequirements);

    // 8. Calculate total study hours
    const totalStudyHours = studyBlocks.reduce((sum, block) => sum + block.duration_hours, 0);
    const recommendedStudyHours = Object.values(studyRequirements).reduce((sum, req) => sum + req.hours, 0);

    // 9. Build complete schedule
    const completeSchedule = this.buildCompleteSchedule(classes, activities, studyBlocks);

    // 10. Save to database
    const scheduleData = JSON.stringify(completeSchedule);
    const result = db.prepare(`
      INSERT INTO generated_schedules (week_start_date, schedule_data, study_hours_recommended, study_hours_available)
      VALUES (DATE('now', 'weekday 0', '-7 days'), ?, ?, ?)
    `).run(scheduleData, recommendedStudyHours, totalStudyHours);

    const scheduleId = result.lastInsertRowid;

    // Save study blocks
    for (const block of studyBlocks) {
      db.prepare(`
        INSERT INTO study_blocks (course_id, day_of_week, start_time, end_time, duration_hours, generated_schedule_id)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(block.course_id, block.day_of_week, block.start_time, block.end_time, block.duration_hours, scheduleId);
    }

    return {
      id: scheduleId,
      schedule: completeSchedule,
      studyHours: {
        recommended: recommendedStudyHours,
        allocated: totalStudyHours,
        deficit: Math.max(0, recommendedStudyHours - totalStudyHours)
      },
      studyBlocks
    };
  }

  /**
   * Calculate study hours needed for each course
   */
  async calculateStudyRequirements(courses) {
    const requirements = {};

    for (const course of courses) {
      // Get upcoming assignments (next 2 weeks)
      const assignments = db.prepare(`
        SELECT * FROM assignments
        WHERE course_id = ?
        AND status = 'pending'
        AND due_date >= DATE('now')
        AND due_date <= DATE('now', '+14 days')
        ORDER BY due_date
      `).all(course.id);

      // Base study hours (2-3 hours per credit hour per week is typical)
      // We'll estimate 3 credit hours per course
      let baseHours = 6; // 2 hours per credit hour for a 3-credit course

      // Add time for upcoming assignments
      let assignmentHours = 0;
      for (const assignment of assignments) {
        if (assignment.estimated_hours) {
          assignmentHours += assignment.estimated_hours;
        } else {
          // Estimate based on priority
          if (assignment.priority === 'high') assignmentHours += 3;
          else if (assignment.priority === 'medium') assignmentHours += 2;
          else assignmentHours += 1;
        }
      }

      // Check for upcoming exams
      const exams = db.prepare(`
        SELECT * FROM exams
        WHERE course_id = ?
        AND exam_date >= DATE('now')
        AND exam_date <= DATE('now', '+14 days')
      `).all(course.id);

      const examHours = exams.length * 5; // 5 hours per exam

      requirements[course.id] = {
        course_id: course.id,
        course_name: course.name,
        course_code: course.code,
        color: course.color,
        hours: baseHours + (assignmentHours / 2) + (examHours / 2), // Spread over the week
        upcomingAssignments: assignments.length,
        upcomingExams: exams.length
      };
    }

    return requirements;
  }

  /**
   * Build a weekly time grid showing occupied times
   */
  buildWeeklyGrid(classes, activities) {
    const grid = {};
    for (let day = 0; day < 7; day++) {
      grid[day] = [];
    }

    // Add classes to grid
    for (const cls of classes) {
      grid[cls.day_of_week].push({
        type: 'class',
        title: cls.course_name,
        start_time: cls.start_time,
        end_time: cls.end_time,
        location: cls.location,
        color: cls.color,
        is_flexible: false
      });
    }

    // Add activities to grid
    for (const activity of activities) {
      if (activity.day_of_week !== null) {
        grid[activity.day_of_week].push({
          type: 'activity',
          title: activity.title,
          start_time: activity.start_time,
          end_time: activity.end_time,
          category: activity.category,
          is_flexible: activity.is_flexible === 1
        });
      }
    }

    // Sort each day by start time
    for (let day = 0; day < 7; day++) {
      grid[day].sort((a, b) => a.start_time.localeCompare(b.start_time));
    }

    return grid;
  }

  /**
   * Find available time slots in the weekly grid
   */
  findAvailableSlots(weeklyGrid) {
    const slots = [];

    for (let day = 0; day < 7; day++) {
      const isWeekday = day >= 1 && day <= 5;
      const dayStart = isWeekday ? this.PREFERRED_STUDY_TIMES.weekday.start : this.PREFERRED_STUDY_TIMES.weekend.start;
      const dayEnd = isWeekday ? this.PREFERRED_STUDY_TIMES.weekday.end : this.PREFERRED_STUDY_TIMES.weekend.end;

      const occupiedSlots = weeklyGrid[day];
      let currentTime = dayStart;

      for (const slot of occupiedSlots) {
        // Gap before this occupied slot
        if (currentTime < slot.start_time) {
          const duration = this.timeDifferenceHours(currentTime, slot.start_time);
          if (duration >= this.MIN_STUDY_BLOCK_HOURS) {
            slots.push({
              day_of_week: day,
              start_time: currentTime,
              end_time: slot.start_time,
              duration_hours: duration,
              priority: this.calculateSlotPriority(day, currentTime)
            });
          }
        }
        currentTime = slot.end_time || currentTime;
      }

      // Gap after all occupied slots until end of day
      if (currentTime < dayEnd) {
        const duration = this.timeDifferenceHours(currentTime, dayEnd);
        if (duration >= this.MIN_STUDY_BLOCK_HOURS) {
          slots.push({
            day_of_week: day,
            start_time: currentTime,
            end_time: dayEnd,
            duration_hours: duration,
            priority: this.calculateSlotPriority(day, currentTime)
          });
        }
      }
    }

    // Sort by priority (higher is better)
    return slots.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Calculate priority for a time slot (better times = higher priority)
   */
  calculateSlotPriority(day, startTime) {
    let priority = 0;

    // Weekdays are better than weekends
    if (day >= 1 && day <= 5) priority += 2;

    // Morning (9-12) gets high priority
    const hour = parseInt(startTime.split(':')[0]);
    if (hour >= 9 && hour < 12) priority += 3;
    // Afternoon (14-17) gets medium priority
    else if (hour >= 14 && hour < 17) priority += 2;
    // Evening (18-20) gets lower priority
    else if (hour >= 18 && hour < 20) priority += 1;

    return priority;
  }

  /**
   * Allocate study blocks to available slots
   */
  allocateStudyBlocks(availableSlots, studyRequirements) {
    const studyBlocks = [];
    const courseHoursRemaining = {};

    // Initialize remaining hours
    for (const [courseId, req] of Object.entries(studyRequirements)) {
      courseHoursRemaining[courseId] = req.hours;
    }

    // Iterate through slots and allocate study time
    for (const slot of availableSlots) {
      if (slot.duration_hours < this.MIN_STUDY_BLOCK_HOURS) continue;

      // Find course that needs the most study time
      let targetCourse = null;
      let maxHours = 0;
      for (const [courseId, hours] of Object.entries(courseHoursRemaining)) {
        if (hours > maxHours) {
          maxHours = hours;
          targetCourse = courseId;
        }
      }

      if (!targetCourse || maxHours === 0) break;

      // Allocate study block (cap at MAX_STUDY_BLOCK_HOURS)
      const blockDuration = Math.min(
        slot.duration_hours,
        this.MAX_STUDY_BLOCK_HOURS,
        courseHoursRemaining[targetCourse]
      );

      const endTime = this.addHoursToTime(slot.start_time, blockDuration);

      studyBlocks.push({
        course_id: parseInt(targetCourse),
        course_name: studyRequirements[targetCourse].course_name,
        course_code: studyRequirements[targetCourse].course_code,
        color: studyRequirements[targetCourse].color,
        day_of_week: slot.day_of_week,
        start_time: slot.start_time,
        end_time: endTime,
        duration_hours: blockDuration
      });

      courseHoursRemaining[targetCourse] -= blockDuration;
    }

    return studyBlocks;
  }

  /**
   * Build complete schedule combining all elements
   */
  buildCompleteSchedule(classes, activities, studyBlocks) {
    const schedule = {};
    for (let day = 0; day < 7; day++) {
      schedule[day] = {
        day: this.DAYS[day],
        dayIndex: day,
        events: []
      };
    }

    // Add classes
    for (const cls of classes) {
      schedule[cls.day_of_week].events.push({
        type: 'class',
        title: cls.course_name,
        code: cls.course_code,
        start_time: cls.start_time,
        end_time: cls.end_time,
        location: cls.location,
        color: cls.color
      });
    }

    // Add activities
    for (const activity of activities) {
      if (activity.day_of_week !== null) {
        schedule[activity.day_of_week].events.push({
          type: 'activity',
          title: activity.title,
          start_time: activity.start_time,
          end_time: activity.end_time,
          category: activity.category,
          is_flexible: activity.is_flexible === 1
        });
      }
    }

    // Add study blocks
    for (const block of studyBlocks) {
      schedule[block.day_of_week].events.push({
        type: 'study',
        title: `Study: ${block.course_name}`,
        course_name: block.course_name,
        course_code: block.course_code,
        start_time: block.start_time,
        end_time: block.end_time,
        duration_hours: block.duration_hours,
        color: block.color
      });
    }

    // Sort events by time for each day
    for (let day = 0; day < 7; day++) {
      schedule[day].events.sort((a, b) => a.start_time.localeCompare(b.start_time));
    }

    return schedule;
  }

  /**
   * Calculate time difference in hours
   */
  timeDifferenceHours(startTime, endTime) {
    const [startHours, startMinutes] = startTime.split(':').map(Number);
    const [endHours, endMinutes] = endTime.split(':').map(Number);

    const startTotalMinutes = startHours * 60 + startMinutes;
    const endTotalMinutes = endHours * 60 + endMinutes;

    return (endTotalMinutes - startTotalMinutes) / 60;
  }

  /**
   * Add hours to a time string
   */
  addHoursToTime(time, hours) {
    const [h, m] = time.split(':').map(Number);
    const totalMinutes = h * 60 + m + hours * 60;
    const newHours = Math.floor(totalMinutes / 60);
    const newMinutes = Math.floor(totalMinutes % 60);
    return `${String(newHours).padStart(2, '0')}:${String(newMinutes).padStart(2, '0')}`;
  }
}

export default ScheduleGeneratorService;
