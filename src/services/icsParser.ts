
export interface ICSEvent {
  id: string;
  title: string;
  startTime: Date;
  endTime: Date;
  description?: string;
  location?: string;
  attendees?: string[];
}

export class ICSParser {
  static async fetchAndParseICS(url: string): Promise<ICSEvent[]> {
    try {
      console.log('Fetching ICS from URL:', url);
      
      // Use a CORS proxy for development/demo purposes
      const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
      
      const response = await fetch(proxyUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch calendar: ${response.statusText}`);
      }
      
      const data = await response.json();
      let icsContent = data.contents;
      
      // Handle base64 encoded content
      if (icsContent.startsWith('data:text/calendar')) {
        const base64Data = icsContent.split(',')[1];
        icsContent = atob(base64Data);
      }
      
      console.log('ICS content preview:', icsContent.substring(0, 200));
      
      return this.parseICSContent(icsContent);
    } catch (error) {
      console.error('Error fetching ICS calendar:', error);
      throw error;
    }
  }

  static parseICSContent(icsContent: string): ICSEvent[] {
    const events: ICSEvent[] = [];
    const lines = icsContent.split(/\r?\n/).map(line => line.trim());
    
    let currentEvent: Partial<ICSEvent> | null = null;
    let isInEvent = false;
    
    console.log('Parsing ICS content, total lines:', lines.length);
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      if (line === 'BEGIN:VEVENT') {
        isInEvent = true;
        currentEvent = {};
        continue;
      }
      
      if (line === 'END:VEVENT') {
        if (currentEvent && currentEvent.title && currentEvent.startTime && currentEvent.endTime) {
          // Ensure we have a valid ID
          if (!currentEvent.id) {
            currentEvent.id = `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          }
          events.push(currentEvent as ICSEvent);
          console.log('Parsed event:', currentEvent.title, currentEvent.startTime);
        }
        isInEvent = false;
        currentEvent = null;
        continue;
      }
      
      if (!isInEvent || !currentEvent) continue;
      
      // Handle line continuations (lines starting with space or tab)
      let fullLine = line;
      while (i + 1 < lines.length && (lines[i + 1].startsWith(' ') || lines[i + 1].startsWith('\t'))) {
        i++;
        fullLine += lines[i].substring(1); // Remove the leading space/tab
      }
      
      // Parse event properties
      if (fullLine.startsWith('UID:')) {
        currentEvent.id = fullLine.substring(4);
      } else if (fullLine.startsWith('SUMMARY:')) {
        currentEvent.title = this.unescapeText(fullLine.substring(8));
      } else if (fullLine.startsWith('DESCRIPTION:')) {
        currentEvent.description = this.unescapeText(fullLine.substring(12));
      } else if (fullLine.startsWith('LOCATION:')) {
        currentEvent.location = this.unescapeText(fullLine.substring(9));
      } else if (fullLine.startsWith('DTSTART')) {
        const colonIndex = fullLine.indexOf(':');
        if (colonIndex !== -1) {
          const dateStr = fullLine.substring(colonIndex + 1);
          currentEvent.startTime = this.parseICSDate(dateStr);
        }
      } else if (fullLine.startsWith('DTEND')) {
        const colonIndex = fullLine.indexOf(':');
        if (colonIndex !== -1) {
          const dateStr = fullLine.substring(colonIndex + 1);
          currentEvent.endTime = this.parseICSDate(dateStr);
        }
      }
    }
    
    console.log(`Parsed ${events.length} events from ICS`);
    return events;
  }

  static parseICSDate(dateStr: string): Date {
    // Handle both YYYYMMDDTHHMMSSZ and YYYYMMDD formats
    if (dateStr.includes('T')) {
      // DateTime format: 20240131T143000Z
      const year = parseInt(dateStr.substring(0, 4));
      const month = parseInt(dateStr.substring(4, 6)) - 1; // Month is 0-indexed
      const day = parseInt(dateStr.substring(6, 8));
      const hour = parseInt(dateStr.substring(9, 11));
      const minute = parseInt(dateStr.substring(11, 13));
      const second = parseInt(dateStr.substring(13, 15));
      
      return new Date(Date.UTC(year, month, day, hour, minute, second));
    } else {
      // Date only format: 20240131
      const year = parseInt(dateStr.substring(0, 4));
      const month = parseInt(dateStr.substring(4, 6)) - 1;
      const day = parseInt(dateStr.substring(6, 8));
      
      return new Date(year, month, day);
    }
  }

  static unescapeText(text: string): string {
    return text
      .replace(/\\n/g, '\n')
      .replace(/\\,/g, ',')
      .replace(/\\;/g, ';')
      .replace(/\\\\/g, '\\');
  }

  static classifyEvent(title: string, description?: string): 'meeting' | 'focus' | 'break' | 'personal' | 'travel' | 'buffer' {
    const text = `${title} ${description || ''}`.toLowerCase();
    
    if (text.includes('meeting') || text.includes('call') || text.includes('conference') || text.includes('standup') || text.includes('sync') || text.includes('review')) {
      return 'meeting';
    }
    if (text.includes('focus') || text.includes('deep work') || text.includes('coding') || text.includes('workshop') || text.includes('block')) {
      return 'focus';
    }
    if (text.includes('break') || text.includes('lunch') || text.includes('coffee') || text.includes('recharge')) {
      return 'break';
    }
    if (text.includes('travel') || text.includes('flight') || text.includes('drive')) {
      return 'travel';
    }
    if (text.includes('personal') || text.includes('doctor') || text.includes('appointment') || text.includes('dentist') || text.includes('workout') || text.includes('dinner')) {
      return 'personal';
    }
    if (text.includes('buffer')) {
      return 'buffer';
    }
    
    // Default to meeting for unknown events
    return 'meeting';
  }
}
