import ical from 'node-ical';

class CalendarImportService {
  /**
   * Parse iCal data and extract recurring events
   * @param {string} icalData - iCal formatted string
   * @returns {Array} Array of parsed events
   */
  async parseICalData(icalData) {
    try {
      const events = ical.parseICS(icalData);
      const parsedEvents = [];

      for (const event of Object.values(events)) {
        if (event.type !== 'VEVENT') continue;

        // Parse start and end times
        const start = event.start;
        const end = event.end;

        if (!start) continue;

        // Determine day of week (0 = Sunday, 6 = Saturday)
        const dayOfWeek = start.getDay();

        // Format times as HH:MM
        const startTime = this.formatTime(start);
        const endTime = end ? this.formatTime(end) : null;

        // Determine recurrence
        let recurrence = 'once';
        if (event.rrule) {
          const freq = event.rrule.options.freq;
          if (freq === 3) recurrence = 'weekly'; // RRule.WEEKLY = 3
          if (freq === 1) recurrence = 'daily';  // RRule.DAILY = 1
          if (freq === 2) recurrence = 'monthly'; // RRule.MONTHLY = 2
        }

        parsedEvents.push({
          title: event.summary || 'Untitled Event',
          description: event.description || null,
          day_of_week: dayOfWeek,
          start_time: startTime,
          end_time: endTime,
          recurrence: recurrence,
          category: this.categorizeEvent(event.summary),
          location: event.location || null,
          full_date: start.toISOString()
        });
      }

      return parsedEvents;
    } catch (error) {
      console.error('Failed to parse iCal data:', error);
      throw new Error('Invalid iCal format');
    }
  }

  /**
   * Parse iCal file from URL (Google Calendar public URL)
   * @param {string} url - URL to iCal file
   * @returns {Array} Array of parsed events
   */
  async parseICalFromUrl(url) {
    try {
      const events = await ical.fromURL(url);
      const parsedEvents = [];

      for (const event of Object.values(events)) {
        if (event.type !== 'VEVENT') continue;

        const start = event.start;
        const end = event.end;

        if (!start) continue;

        const dayOfWeek = start.getDay();
        const startTime = this.formatTime(start);
        const endTime = end ? this.formatTime(end) : null;

        let recurrence = 'once';
        if (event.rrule) {
          const freq = event.rrule.options.freq;
          if (freq === 3) recurrence = 'weekly';
          if (freq === 1) recurrence = 'daily';
          if (freq === 2) recurrence = 'monthly';
        }

        parsedEvents.push({
          title: event.summary || 'Untitled Event',
          description: event.description || null,
          day_of_week: dayOfWeek,
          start_time: startTime,
          end_time: endTime,
          recurrence: recurrence,
          category: this.categorizeEvent(event.summary),
          location: event.location || null,
          full_date: start.toISOString()
        });
      }

      return parsedEvents;
    } catch (error) {
      console.error('Failed to fetch calendar from URL:', error);
      throw new Error('Failed to fetch calendar. Check the URL and try again.');
    }
  }

  /**
   * Format Date object to HH:MM string
   * @param {Date} date
   * @returns {string} Time in HH:MM format
   */
  formatTime(date) {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  /**
   * Categorize event based on title keywords
   * @param {string} title
   * @returns {string} Category name
   */
  categorizeEvent(title) {
    if (!title) return 'personal';

    const lowerTitle = title.toLowerCase();

    if (lowerTitle.includes('work') || lowerTitle.includes('meeting') || lowerTitle.includes('job')) {
      return 'work';
    }
    if (lowerTitle.includes('gym') || lowerTitle.includes('workout') || lowerTitle.includes('exercise')) {
      return 'fitness';
    }
    if (lowerTitle.includes('class') || lowerTitle.includes('lecture') || lowerTitle.includes('lab')) {
      return 'class';
    }
    if (lowerTitle.includes('club') || lowerTitle.includes('meeting') || lowerTitle.includes('organization')) {
      return 'extracurricular';
    }

    return 'personal';
  }
}

export default CalendarImportService;
