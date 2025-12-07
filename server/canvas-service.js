import fetch from 'node-fetch';

class CanvasService {
  constructor(canvasUrl, accessToken) {
    this.baseUrl = canvasUrl.replace(/\/$/, ''); // Remove trailing slash
    this.accessToken = accessToken;
  }

  async makeRequest(endpoint) {
    const url = `${this.baseUrl}/api/v1${endpoint}`;

    try {
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Canvas API error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Canvas API request failed:', error);
      throw error;
    }
  }

  async getCourses() {
    try {
      const courses = await this.makeRequest('/courses?enrollment_state=active&per_page=100');
      return courses.map(course => ({
        canvas_id: course.id,
        name: course.name,
        code: course.course_code,
        instructor: course.teachers?.[0]?.display_name || null,
      }));
    } catch (error) {
      console.error('Failed to fetch courses:', error);
      return [];
    }
  }

  async getAssignments(canvasCourseId) {
    try {
      const assignments = await this.makeRequest(`/courses/${canvasCourseId}/assignments?include[]=submission&per_page=100`);
      return assignments.map(assignment => ({
        canvas_id: assignment.id,
        title: assignment.name,
        description: assignment.description?.replace(/<[^>]*>/g, '').substring(0, 500) || null, // Strip HTML
        due_date: assignment.due_at,
        status: assignment.submission?.submitted_at ? 'completed' : 'pending',
        grade: assignment.submission?.score || null,
        max_grade: assignment.points_possible || null,
        graded: assignment.submission?.grade != null
      }));
    } catch (error) {
      console.error(`Failed to fetch assignments for course ${canvasCourseId}:`, error);
      return [];
    }
  }

  async getCalendarEvents() {
    try {
      const startDate = new Date();
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 3); // Get 3 months of events

      const events = await this.makeRequest(
        `/calendar_events?start_date=${startDate.toISOString()}&end_date=${endDate.toISOString()}&per_page=100`
      );

      return events.map(event => ({
        title: event.title,
        description: event.description,
        start_time: event.start_at,
        end_time: event.end_at,
        location: event.location_name,
        canvas_course_id: event.context_code?.includes('course_')
          ? parseInt(event.context_code.replace('course_', ''))
          : null
      }));
    } catch (error) {
      console.error('Failed to fetch calendar events:', error);
      return [];
    }
  }

  async getGrades(canvasCourseId) {
    try {
      const enrollments = await this.makeRequest(`/courses/${canvasCourseId}/enrollments?user_id=self`);

      if (!enrollments || enrollments.length === 0) return [];

      const grades = enrollments[0].grades;
      if (!grades || !grades.current_score) return [];

      return {
        current_score: grades.current_score,
        final_score: grades.final_score,
        current_grade: grades.current_grade,
        final_grade: grades.final_grade
      };
    } catch (error) {
      console.error(`Failed to fetch grades for course ${canvasCourseId}:`, error);
      return null;
    }
  }

  async getCourseSchedule(canvasCourseId) {
    try {
      const sections = await this.makeRequest(`/courses/${canvasCourseId}/sections?include[]=students&per_page=100`);

      const schedules = [];

      for (const section of sections) {
        // Check if this section has meeting times
        if (section.course_section_meeting_times && section.course_section_meeting_times.length > 0) {
          for (const meeting of section.course_section_meeting_times) {
            // Canvas days: "MWF", "TR", etc.
            // Convert to our day_of_week format (0=Sunday, 1=Monday, etc.)
            const dayMap = {
              'Su': 0, 'M': 1, 'T': 2, 'W': 3, 'R': 4, 'F': 5, 'S': 6
            };

            // Parse the days string (e.g., "MWF" -> [1, 3, 5])
            const days = this.parseDays(meeting.days, dayMap);

            // Create a schedule entry for each day
            for (const day of days) {
              schedules.push({
                day_of_week: day,
                start_time: meeting.start_time || '09:00', // Format: "HH:MM"
                end_time: meeting.end_time || '10:00',
                location: meeting.location || null
              });
            }
          }
        }
      }

      return schedules;
    } catch (error) {
      console.error(`Failed to fetch schedule for course ${canvasCourseId}:`, error);
      return [];
    }
  }

  parseDays(daysString, dayMap) {
    if (!daysString) return [];

    const days = [];
    const daysStr = daysString.replace(/\s/g, ''); // Remove spaces

    // Handle special cases
    if (daysStr.includes('Su')) days.push(dayMap['Su']);
    if (daysStr.includes('M') && !daysStr.includes('Su')) days.push(dayMap['M']);
    if (daysStr.includes('T') && !daysStr.includes('R')) days.push(dayMap['T']);
    if (daysStr.includes('W')) days.push(dayMap['W']);
    if (daysStr.includes('R')) days.push(dayMap['R']);
    if (daysStr.includes('F')) days.push(dayMap['F']);
    if (daysStr.includes('S') && !daysStr.includes('Su')) days.push(dayMap['S']);

    return days;
  }

  async testConnection() {
    try {
      await this.makeRequest('/users/self');
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

export default CanvasService;
