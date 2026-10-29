import type { Curriculum, LessonMeta } from './domain';

export interface CourseWeek { number: number; title: string; description: string; minutes: number; lessons: LessonMeta[] }

export function courseWeeks(curriculum: Curriculum | null): CourseWeek[] {
  if (!curriculum) return [];
  const numbers = [...new Set(curriculum.lessons.map(lesson => lesson.week))].sort((a, b) => a - b);
  return numbers.map(number => {
    const meta = curriculum.weeks?.find(week => (week['number'] ?? week.week ?? week.id) === number);
    const lessons = curriculum.lessons.filter(lesson => lesson.week === number).sort((a, b) => a.order - b.order);
    return {
      number, title: meta?.title || `Неделя ${number}`,
      description: typeof meta?.['description'] === 'string' ? meta['description'] : '',
      minutes: lessons.reduce((total, lesson) => total + lesson.minutes, 0), lessons
    };
  });
}

export function formatHours(minutes: number): string {
  if (minutes % 60 !== 0) return `${minutes} мин`;
  const hours = minutes / 60, last = hours % 10, lastTwo = hours % 100;
  const ending = lastTwo >= 11 && lastTwo <= 14 ? 'часов' : last === 1 ? 'час' : last >= 2 && last <= 4 ? 'часа' : 'часов';
  return `${hours} ${ending}`;
}
