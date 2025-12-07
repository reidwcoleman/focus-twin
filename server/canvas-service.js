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
      const assignments = await this.makeRequest(`/courses/${canvasCourseId}/assignments?per_page=100`);
      return assignments.map(assignment => ({
        canvas_id: assignment.id,
        title: assignment.name,
        description: assignment.description?.replace(/<[^>]*>/g, '').substring(0, 500) || null, // Strip HTML
        due_date: assignment.due_at,
        status: assignment.submission?.submitted_at ? 'completed' : 'pending',
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
