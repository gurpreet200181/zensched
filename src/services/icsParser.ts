
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
      // Use a CORS proxy for development/demo purposes
      // In production, you'd want to use a proper backend service
      const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
      
      const response = await fetch(proxyUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch calendar: ${response.statusText}`);
      }
      
      const data = await response.json();
      const icsContent = data.contents;
      
      return this.parseICSContent(icsContent);
    } catch (error) {
      console.error('Error fetching ICS calendar:', error);
      throw error;
    }
  }

  static parseICSContent(icsContent: string): ICSEvent[] {
    const events: ICSEvent[] = [];
    const lines = icsContent.split('\n').map(line => line.trim());
    
    let currentEvent: Partial<ICSEvent> | null = null;
    let isInEvent = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      if (line === 'BEGIN:VEVENT') {
        isInEvent = true;
        currentEvent = {};
        continue;
      }
      
      if (line === 'END:VEVENT') {
        if (currentEvent && currentEvent.title && currentEvent.startTime && currentEvent.endTime) {
          events.push(currentEvent as ICSEvent);
        }
        isInEvent = false;
        currentEvent = null;
        continue;
      }
      
      if (!isInEvent || !currentEvent) continue;
      
      // Parse event properties
      if (line.startsWith('UID:')) {
        currentEvent.id = line.substring(4);
      } else if (line.startsWith('SUMMARY:')) {
        currentEvent.title = this.unescapeText(line.substring(8));
      } else if (line.startsWith('DESCRIPTION:')) {
        currentEvent.description = this.unescapeText(line.substring(12));
      } else if (line.startsWith('LOCATION:')) {
        currentEvent.location = this.unescapeText(line.substring(9));
      } else if (line.startsWith('DTSTART')) {
        const dateStr = line.split(':')[1];
        currentEvent.startTime = this.parseICSDate(dateStr);
      } else if (line.startsWith('DTEND')) {
        const dateStr = line.split(':')[1];
        currentEvent.endTime = this.parseICSDate(dateStr);
      }
    }
    
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
    
    if (text.includes('meeting') || text.includes('call') || text.includes('conference')) {
      return 'meeting';
    }
    if (text.includes('focus') || text.includes('deep work') || text.includes('coding')) {
      return 'focus';
    }
    if (text.includes('break') || text.includes('lunch') || text.includes('coffee')) {
      return 'break';
    }
    if (text.includes('travel') || text.includes('flight') || text.includes('drive')) {
      return 'travel';
    }
    if (text.includes('personal') || text.includes('doctor') || text.includes('appointment')) {
      return 'personal';
    }
    
    // Default to meeting for unknown events
    return 'meeting';
  }
}
