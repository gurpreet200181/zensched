
import { useMemo } from 'react';
import { CalendarEvent } from './useCalendarData';

export function useDailyNarrative(
  busynessScore: number,
  events: CalendarEvent[],
  busyHours: number,
  freeHours: number
) {
  return useMemo(() => {
    const now = new Date();
    const currentHour = now.getHours();
    
    // Filter out past events - only show events that haven't ended yet
    const currentTime = `${currentHour.toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const upcomingEvents = events.filter(event => event.endTime > currentTime);
    
    if (!upcomingEvents || upcomingEvents.length === 0) {
      // Time-aware greeting
      let greeting = "Good morning!";
      if (currentHour >= 12 && currentHour < 17) {
        greeting = "Good afternoon!";
      } else if (currentHour >= 17) {
        greeting = "Good evening!";
      }
      
      return `${greeting} You have no more events scheduled for the rest of the day. This is a perfect opportunity to focus on personal projects, catch up on tasks, or simply enjoy some well-deserved downtime.`;
    }

    const meetingCount = upcomingEvents.filter(e => e.classification === 'meeting').length;
    const focusBlocks = upcomingEvents.filter(e => e.classification === 'focus').length;
    const breaks = upcomingEvents.filter(e => e.classification === 'break').length;

    let narrative = "";
    
    // Time-aware greeting
    if (currentHour < 12) {
      narrative += "Good morning! ";
    } else if (currentHour < 17) {
      narrative += "Good afternoon! ";
    } else {
      narrative += "Good evening! ";
    }

    // Adjust language based on time of day
    if (currentHour < 12) {
      // Morning language
      if (busynessScore < 40) {
        narrative += "You have a beautifully balanced day ahead with plenty of breathing room. ";
      } else if (busynessScore < 60) {
        narrative += "Your day looks well-structured with a good mix of commitments and free time. ";
      } else if (busynessScore < 80) {
        narrative += "You have a pretty packed schedule today, but it's manageable. ";
      } else {
        narrative += "Today is going to be quite intense with a very full schedule. ";
      }
    } else {
      // Afternoon/evening language - focus on remaining time
      if (busynessScore < 40) {
        narrative += "You have a nicely balanced rest of the day ahead with breathing room. ";
      } else if (busyness < 60) {
        narrative += "The rest of your day looks well-structured with a good mix of commitments. ";
      } else if (busynessScore < 80) {
        narrative += "You still have a busy remainder of the day ahead. ";
      } else {
        narrative += "The rest of your day is quite packed with commitments. ";
      }
    }

    // Meeting details - focus on upcoming only
    if (meetingCount > 0) {
      if (meetingCount === 1) {
        narrative += currentHour < 12 ? "You have one meeting scheduled. " : "You have one meeting remaining. ";
      } else {
        narrative += currentHour < 12 ? `You have ${meetingCount} meetings planned. ` : `You have ${meetingCount} meetings remaining. `;
      }
    }

    // Focus time
    if (focusBlocks > 0) {
      narrative += `Great news - you've blocked out ${focusBlocks === 1 ? 'some' : 'multiple chunks of'} dedicated focus time. `;
    } else if (busynessScore < 60) {
      narrative += currentHour < 12 ? "Consider using some of your free time for deep work on important projects. " : "Consider using your remaining free time for important tasks. ";
    }

    // Breaks and wellness
    if (breaks > 0) {
      narrative += "I see you've scheduled some breaks - excellent for maintaining your energy. ";
    } else if (busynessScore > 60) {
      narrative += "Remember to take short breaks between your commitments to stay fresh and focused. ";
    }

    // Time-aware encouraging close
    if (busynessScore > 80) {
      narrative += currentHour < 12 ? 
        "Stay organized, prioritize ruthlessly, and remember that every challenging day is an opportunity to grow stronger." :
        "Stay focused and prioritize what's most important for the remainder of your day.";
    } else if (busynessScore > 60) {
      narrative += currentHour < 12 ? 
        "You've got this! Stay focused and enjoy the productive rhythm of your day." :
        "Keep up the good momentum and make the most of your remaining time.";
    } else {
      narrative += currentHour < 12 ? 
        "Enjoy the balanced pace and make the most of both your scheduled time and your flexibility." :
        "Enjoy the relaxed pace for the rest of your day.";
    }

    return narrative;
  }, [busynessScore, events, busyHours, freeHours]);
}
