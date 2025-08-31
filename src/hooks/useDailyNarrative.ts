
import { useMemo } from 'react';
import { CalendarEvent } from './useCalendarData';

export function useDailyNarrative(
  busynessScore: number,
  events: CalendarEvent[],
  busyHours: number,
  freeHours: number
) {
  return useMemo(() => {
    if (!events || events.length === 0) {
      return "Good morning! You have a completely free day ahead. This is a perfect opportunity to focus on personal projects, catch up on tasks, or simply enjoy some well-deserved downtime.";
    }

    const meetingCount = events.filter(e => e.classification === 'meeting').length;
    const focusBlocks = events.filter(e => e.classification === 'focus').length;
    const breaks = events.filter(e => e.classification === 'break').length;

    let narrative = "Good morning! ";

    // Busyness assessment
    if (busynessScore < 40) {
      narrative += "You have a beautifully balanced day ahead with plenty of breathing room. ";
    } else if (busynessScore < 60) {
      narrative += "Your day looks well-structured with a good mix of commitments and free time. ";
    } else if (busynessScore < 80) {
      narrative += "You have a pretty packed schedule today, but it's manageable. ";
    } else {
      narrative += "Today is going to be quite intense with a very full schedule. ";
    }

    // Meeting details
    if (meetingCount > 0) {
      if (meetingCount === 1) {
        narrative += "You have one meeting scheduled. ";
      } else {
        narrative += `You have ${meetingCount} meetings planned. `;
      }
    }

    // Focus time
    if (focusBlocks > 0) {
      narrative += `Great news - you've blocked out ${focusBlocks === 1 ? 'some' : 'multiple chunks of'} dedicated focus time. `;
    } else if (busynessScore < 60) {
      narrative += "Consider using some of your free time for deep work on important projects. ";
    }

    // Breaks and wellness
    if (breaks > 0) {
      narrative += "I see you've scheduled some breaks - excellent for maintaining your energy throughout the day. ";
    } else if (busynessScore > 60) {
      narrative += "Remember to take short breaks between your commitments to stay fresh and focused. ";
    }

    // Encouraging close
    if (busynessScore > 80) {
      narrative += "Stay organized, prioritize ruthlessly, and remember that every challenging day is an opportunity to grow stronger.";
    } else if (busynessScore > 60) {
      narrative += "You've got this! Stay focused and enjoy the productive rhythm of your day.";
    } else {
      narrative += "Enjoy the balanced pace and make the most of both your scheduled time and your flexibility.";
    }

    return narrative;
  }, [busynessScore, events, busyHours, freeHours]);
}
