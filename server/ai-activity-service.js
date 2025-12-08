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

    console.log(`[AI Service] Parsing ${sentences.length} sentences from input`);

    for (const sentence of sentences) {
      const activity = this.parseSentence(sentence.trim());
      if (activity) {
        console.log(`[AI Service] Parsed activity:`, {
          title: activity.title,
          days: activity.days,
          day_of_week: activity.day_of_week,
          time: `${activity.start_time} - ${activity.end_time}`
        });

        // If multiple days found, create separate activities
        if (activity.days && activity.days.length > 0) {
          console.log(`[AI Service] Creating ${activity.days.length} separate activities for days: ${activity.days.join(', ')}`);
          for (const day of activity.days) {
            const newActivity = {
              ...activity,
              day_of_week: day,
              days: undefined
            };
            activities.push(newActivity);
            console.log(`[AI Service] Created activity for day ${day}: ${activity.title}`);
          }
        } else if (activity.day_of_week !== null) {
          activities.push(activity);
          console.log(`[AI Service] Created single activity for day ${activity.day_of_week}: ${activity.title}`);
        }
      }
    }

    console.log(`[AI Service] Total activities created: ${activities.length}`);
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
      // "I have soccer practice on..."
      /(?:have|attend|go to|take|do)\s+([a-z\s]+?)(?:\s+(?:on|at|from|every|each|monday|tuesday|wednesday|thursday|friday|saturday|sunday))/i,
      // "Soccer practice on..."
      /^([a-z\s]+?)(?:\s+(?:on|at|from|every|each|monday|tuesday|wednesday|thursday|friday|saturday|sunday))/i,
      // "I have soccer class/practice/session/meeting"
      /(?:i\s+)?(?:have|attend|go to|take|do)\s+([a-z\s]+?(?:class|practice|session|meeting|training))/i,
      // "Soccer practice" standalone
      /([a-z\s]+?)\s+(?:class|practice|session|meeting|training)/i
    ];

    for (const pattern of patterns) {
      const match = sentence.match(pattern);
      if (match && match[1]) {
        let title = match[1].trim();
        // Clean up common words
        title = title
          .replace(/^(i|my|the|a|an)\s+/gi, '')
          .replace(/\s+(is|are|at|on)\s+/gi, ' ')
          .trim();

        // Capitalize first letter of each word for display
        title = title.split(' ').map(word =>
          word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');

        return title;
      }
    }

    // Fallback: take first few words and capitalize
    const words = sentence.split(' ').slice(0, 3);
    let title = words.join(' ').replace(/[^a-z\s]/gi, '').trim();
    return title.split(' ').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  }

  /**
   * Extract days of week from sentence
   */
  extractDays(sentence) {
    const foundDays = new Set();
    const lowerSentence = sentence.toLowerCase();

    // Check for "every day" or "daily" FIRST
    if (/every\s*day|daily|all\s*days/i.test(lowerSentence)) {
      return [0, 1, 2, 3, 4, 5, 6];
    }

    // Check for "weekdays"
    if (/weekdays?|mon-fri|monday-friday/i.test(lowerSentence)) {
      return [1, 2, 3, 4, 5];
    }

    // Check for "weekends"
    if (/weekends?|sat-sun|saturday-sunday/i.test(lowerSentence)) {
      return [0, 6];
    }

    // Enhanced pattern for "Monday and Wednesday" or "Monday, Wednesday" or "Monday and Wednesday and Friday"
    // This will catch multiple days connected by "and" or ","
    const multiDayPattern = /(monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|wed|thu|fri|sat|sun)(?:\s*(?:and|,)\s*|\s+)(monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|wed|thu|fri|sat|sun)/gi;
    let match;
    let foundMatches = [];

    // Reset regex before using
    multiDayPattern.lastIndex = 0;
    while ((match = multiDayPattern.exec(lowerSentence)) !== null) {
      foundMatches.push(match[1]);
      foundMatches.push(match[2]);
    }

    // Add all matched days
    for (const dayName of foundMatches) {
      const dayNum = this.dayMap[dayName];
      if (dayNum !== undefined) {
        foundDays.add(dayNum);
      }
    }

    // Also check for individual days that might not be in "and" patterns
    // This catches standalone days or days at the end of lists
    for (const [dayName, dayNum] of Object.entries(this.dayMap)) {
      // Use word boundaries to avoid false matches
      const regex = new RegExp(`\\b${dayName}s?\\b`, 'i');
      if (regex.test(lowerSentence)) {
        foundDays.add(dayNum);
      }
    }

    // Convert Set to sorted Array
    const result = Array.from(foundDays).sort();

    console.log(`[AI Service] Extracted days from "${sentence}": ${result.join(', ')}`);
    return result;
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

    // Fitness & Sports (check this first to catch "soccer practice", "basketball practice", etc.)
    if (/gym|workout|exercise|fitness|yoga|run|swim|sport|soccer|football|basketball|baseball|tennis|volleyball|hockey|practice|training|team/i.test(lower)) {
      return 'fitness';
    }
    // Work
    if (/work|job|office|shift|business/i.test(lower)) {
      return 'work';
    }
    // Class (academic)
    if (/class|lecture|lab|seminar|tutorial|course/i.test(lower)) {
      return 'class';
    }
    // Extracurricular (clubs, meetings)
    if (/club|meeting|organization|volunteer|extracurricular|community/i.test(lower)) {
      return 'extracurricular';
    }
    // Study
    if (/study|homework|assignment|project|review|exam prep/i.test(lower)) {
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
