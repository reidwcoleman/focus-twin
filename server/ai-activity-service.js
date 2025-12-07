class AIActivityService {
  constructor() {
    this.dayMap = {
      'monday': 1, 'mon': 1, 'm': 1,
      'tuesday': 2, 'tue': 2, 'tu': 2,
      'wednesday': 3, 'wed': 3, 'w': 3,
      'thursday': 4, 'thu': 4, 'th': 4,
      'friday': 5, 'fri': 5, 'f': 5,
      'saturday': 6, 'sat': 6, 'sa': 6,
      'sunday': 0, 'sun': 0, 'su': 0
    };

    this.timePatterns = [
      // "3pm", "3:30pm", "15:00"
      /(\d{1,2}):?(\d{2})?\s*(am|pm|AM|PM)?/g,
      // "at 3", "at 15"
      /at\s+(\d{1,2}):?(\d{2})?/gi
    ];
  }

  /**
   * Parse natural language activity description
   * Example: "I have gym on Monday and Wednesday at 6pm for 1 hour"
   * @param {string} text - Natural language description
   * @returns {Array} Array of parsed activities
   */
  parseActivities(text) {
    const activities = [];
    const sentences = text.split(/[.!;]/).filter(s => s.trim());

    for (const sentence of sentences) {
      const activity = this.parseSentence(sentence.trim());
      if (activity) {
        // If multiple days found, create separate activities
        if (activity.days && activity.days.length > 0) {
          for (const day of activity.days) {
            activities.push({
              ...activity,
              day_of_week: day,
              days: undefined
            });
          }
        } else if (activity.day_of_week !== null) {
          activities.push(activity);
        }
      }
    }

    return activities;
  }

  /**
   * Parse a single sentence into an activity
   */
  parseSentence(sentence) {
    const lower = sentence.toLowerCase();

    // Extract activity title
    const title = this.extractTitle(lower);
    if (!title) return null;

    // Extract days of week
    const days = this.extractDays(lower);

    // Extract time
    const { startTime, endTime, duration } = this.extractTime(lower);

    // Determine category
    const category = this.categorizeActivity(title);

    return {
      title,
      description: sentence,
      days: days.length > 0 ? days : null,
      day_of_week: days.length === 1 ? days[0] : null,
      start_time: startTime,
      end_time: endTime,
      duration,
      category,
      recurrence: 'weekly',
      is_flexible: this.isFlexible(lower)
    };
  }

  /**
   * Extract activity title from sentence
   */
  extractTitle(sentence) {
    // Common patterns: "I have [activity]", "I go to [activity]", "[activity] on"
    const patterns = [
      /(?:have|attend|go to|take)\s+([a-z\s]+?)(?:\s+(?:on|at|from|every|each))/i,
      /^([a-z\s]+?)(?:\s+(?:on|at|from|every|each))/i,
      /(?:i\s+)?([a-z\s]+?)\s+(?:class|practice|session|meeting)/i
    ];

    for (const pattern of patterns) {
      const match = sentence.match(pattern);
      if (match && match[1]) {
        const title = match[1].trim();
        // Clean up common words
        return title
          .replace(/^(i|my|the|a|an)\s+/gi, '')
          .replace(/\s+(is|are|at|on)\s+/gi, ' ')
          .trim();
      }
    }

    // Fallback: take first few words
    const words = sentence.split(' ').slice(0, 4);
    return words.join(' ').replace(/[^a-z\s]/gi, '').trim();
  }

  /**
   * Extract days of week from sentence
   */
  extractDays(sentence) {
    const days = [];
    const foundDays = new Set();

    // Check for "and" pattern: "Monday and Wednesday"
    const andPattern = /(monday|tuesday|wednesday|thursday|friday|saturday|sunday)(?:\s+and\s+|\s*,\s*)(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/gi;
    let match;
    while ((match = andPattern.exec(sentence)) !== null) {
      const day1 = this.dayMap[match[1].toLowerCase()];
      const day2 = this.dayMap[match[2].toLowerCase()];
      if (day1 !== undefined) foundDays.add(day1);
      if (day2 !== undefined) foundDays.add(day2);
    }

    // Check for individual days
    for (const [dayName, dayNum] of Object.entries(this.dayMap)) {
      const regex = new RegExp(`\\b${dayName}s?\\b`, 'i');
      if (regex.test(sentence)) {
        foundDays.add(dayNum);
      }
    }

    // Check for "every day" or "daily"
    if (/every\s*day|daily|all\s*days/i.test(sentence)) {
      return [0, 1, 2, 3, 4, 5, 6];
    }

    // Check for "weekdays"
    if (/weekdays?|mon-fri|monday-friday/i.test(sentence)) {
      return [1, 2, 3, 4, 5];
    }

    // Check for "weekends"
    if (/weekends?|sat-sun|saturday-sunday/i.test(sentence)) {
      return [0, 6];
    }

    return Array.from(foundDays).sort();
  }

  /**
   * Extract time information from sentence
   */
  extractTime(sentence) {
    let startTime = null;
    let endTime = null;
    let duration = null;

    // Look for time patterns
    const timeMatches = [];
    for (const pattern of this.timePatterns) {
      let match;
      while ((match = pattern.exec(sentence)) !== null) {
        const time = this.parseTimeMatch(match);
        if (time) timeMatches.push(time);
      }
    }

    if (timeMatches.length > 0) {
      startTime = timeMatches[0];
      if (timeMatches.length > 1) {
        endTime = timeMatches[1];
      }
    }

    // Look for duration
    const durationMatch = sentence.match(/(?:for|lasts?)\s+(\d+(?:\.\d+)?)\s*(hour|hr|minute|min)s?/i);
    if (durationMatch) {
      const value = parseFloat(durationMatch[1]);
      const unit = durationMatch[2].toLowerCase();
      duration = unit.startsWith('h') ? value : value / 60;

      // Calculate end time if we have start time
      if (startTime && !endTime) {
        endTime = this.addDuration(startTime, duration);
      }
    }

    // Look for time range: "from X to Y"
    const rangeMatch = sentence.match(/from\s+(\d{1,2}):?(\d{2})?\s*(am|pm)?\s+(?:to|until|-)\s+(\d{1,2}):?(\d{2})?\s*(am|pm)?/i);
    if (rangeMatch) {
      startTime = this.parseTimeMatch([null, rangeMatch[1], rangeMatch[2], rangeMatch[3]]);
      endTime = this.parseTimeMatch([null, rangeMatch[4], rangeMatch[5], rangeMatch[6]]);
    }

    return { startTime, endTime, duration };
  }

  /**
   * Parse time match into HH:MM format
   */
  parseTimeMatch(match) {
    let hours = parseInt(match[1]);
    const minutes = match[2] ? parseInt(match[2]) : 0;
    const meridiem = match[3] ? match[3].toLowerCase() : null;

    // Handle 12-hour format
    if (meridiem === 'pm' && hours < 12) {
      hours += 12;
    } else if (meridiem === 'am' && hours === 12) {
      hours = 0;
    } else if (!meridiem && hours < 8) {
      // Assume PM for hours 1-7 without meridiem (common for afternoon activities)
      hours += 12;
    }

    // Validate hours
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
      return null;
    }

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }

  /**
   * Add duration to a time string
   */
  addDuration(startTime, durationHours) {
    const [hours, minutes] = startTime.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes + durationHours * 60;
    const newHours = Math.floor(totalMinutes / 60) % 24;
    const newMinutes = Math.floor(totalMinutes % 60);
    return `${String(newHours).padStart(2, '0')}:${String(newMinutes).padStart(2, '0')}`;
  }

  /**
   * Categorize activity based on keywords
   */
  categorizeActivity(title) {
    const lower = title.toLowerCase();

    if (/gym|workout|exercise|fitness|yoga|run|swim|sport/i.test(lower)) {
      return 'fitness';
    }
    if (/work|job|office|shift|meeting/i.test(lower)) {
      return 'work';
    }
    if (/class|lecture|lab|seminar|tutorial/i.test(lower)) {
      return 'class';
    }
    if (/club|organization|volunteer|extracurricular/i.test(lower)) {
      return 'extracurricular';
    }
    if (/study|homework|assignment|project/i.test(lower)) {
      return 'study';
    }

    return 'personal';
  }

  /**
   * Determine if activity is flexible based on keywords
   */
  isFlexible(sentence) {
    return /flexible|optional|maybe|usually|sometimes/i.test(sentence);
  }
}

export default AIActivityService;
