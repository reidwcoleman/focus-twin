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
      startDate.setMonth(startDate.getMonth() - 1); // Start from 1 month ago to catch recent past events
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 12); // Get 12 months of future events

      console.log(`Fetching calendar events from ${startDate.toISOString()} to ${endDate.toISOString()}`);

      const events = await this.makeRequest(
        `/calendar_events?all_events=true&start_date=${startDate.toISOString()}&end_date=${endDate.toISOString()}&per_page=500`
      );

      console.log(`Canvas returned ${events.length} calendar events`);

      return events.map(event => ({
        canvas_id: event.id,
        title: event.title,
        description: event.description,
        start_time: event.start_at,
        end_time: event.end_at,
        location: event.location_name || event.location_address,
        event_type: event.type || 'event',
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
      // Get all calendar events (Canvas doesn't support per-course calendar endpoint reliably)
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 14); // Next 2 weeks

      const events = await this.makeRequest(
        `/calendar_events?context_codes[]=course_${canvasCourseId}&start_date=${startDate.toISOString()}&end_date=${endDate.toISOString()}&per_page=100`
      );

      // Track unique schedule patterns (to avoid duplicates)
      const scheduleMap = new Map();

      for (const event of events) {
        // Only process events with start and end times
        if (!event.start_at || !event.end_at) continue;

        const startDateTime = new Date(event.start_at);
        const endDateTime = new Date(event.end_at);

        // Extract day of week (0=Sunday, 1=Monday, etc.)
        const dayOfWeek = startDateTime.getDay();

        // Format times as HH:MM
        const startTime = startDateTime.toTimeString().substring(0, 5);
        const endTime = endDateTime.toTimeString().substring(0, 5);

        // Create unique key for this schedule pattern
        const key = `${dayOfWeek}-${startTime}-${endTime}`;

        // Only add if we haven't seen this pattern yet
        if (!scheduleMap.has(key)) {
          scheduleMap.set(key, {
            day_of_week: dayOfWeek,
            start_time: startTime,
            end_time: endTime,
            location: event.location_name || event.location_address || null
          });
        }
      }

      return Array.from(scheduleMap.values());
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
