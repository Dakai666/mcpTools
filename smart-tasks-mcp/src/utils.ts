import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat.js';
import relativeTime from 'dayjs/plugin/relativeTime.js';
import 'dayjs/locale/zh-tw.js';

dayjs.extend(customParseFormat);
dayjs.extend(relativeTime);
dayjs.locale('zh-tw');

// 自然語言日期解析
export function parseNaturalDate(input: string): string | null {
  const now = dayjs();
  const text = input.toLowerCase().trim();

  // 相對時間關鍵字
  const relativePatterns = [
    { pattern: /今天|today/i, fn: () => now },
    { pattern: /明天|tomorrow/i, fn: () => now.add(1, 'day') },
    { pattern: /後天|day after tomorrow/i, fn: () => now.add(2, 'day') },
    { pattern: /下週|next week/i, fn: () => now.add(1, 'week') },
    { pattern: /下個月|next month/i, fn: () => now.add(1, 'month') },
    { pattern: /(\d+)天後|in (\d+) days?/i, fn: (match: RegExpMatchArray) => now.add(parseInt(match[1] || match[2]), 'day') },
    { pattern: /(\d+)週後|in (\d+) weeks?/i, fn: (match: RegExpMatchArray) => now.add(parseInt(match[1] || match[2]), 'week') },
  ];

  // 檢查相對時間
  for (const { pattern, fn } of relativePatterns) {
    const match = text.match(pattern);
    if (match) {
      return fn(match).toISOString();
    }
  }

  // 時間格式
  const timePatterns = [
    /(\d{1,2}):(\d{2})/,      // HH:mm
    /(\d{1,2})點/,             // X點
    /下午(\d{1,2}):?(\d{2})?/, // 下午X:XX
    /上午(\d{1,2}):?(\d{2})?/, // 上午X:XX
  ];

  let timeMatch: RegExpMatchArray | null = null;
  let baseDate = now;

  for (const pattern of timePatterns) {
    timeMatch = text.match(pattern);
    if (timeMatch) break;
  }

  // 如果有時間，設定時間
  if (timeMatch) {
    const hour = parseInt(timeMatch[1]);
    const minute = parseInt(timeMatch[2] || '0');
    
    // 如果是下午，加12小時
    const isAfternoon = text.includes('下午') || text.includes('pm');
    const finalHour = isAfternoon && hour < 12 ? hour + 12 : hour;
    
    baseDate = baseDate.hour(finalHour).minute(minute).second(0);
  }

  // 日期格式
  const datePatterns = [
    /(\d{4})-(\d{1,2})-(\d{1,2})/,  // YYYY-MM-DD
    /(\d{1,2})\/(\d{1,2})/,         // MM/DD
    /(\d{1,2})月(\d{1,2})日?/,      // MM月DD日
  ];

  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match) {
      if (pattern.source.includes('\\d{4}')) {
        // 完整日期格式
        return dayjs(`${match[1]}-${match[2]}-${match[3]} ${baseDate.format('HH:mm:ss')}`).toISOString();
      } else {
        // 簡短日期格式，使用當前年份
        const month = parseInt(match[1]);
        const day = parseInt(match[2]);
        return baseDate.year(now.year()).month(month - 1).date(day).toISOString();
      }
    }
  }

  return null;
}

// 格式化任務顯示
export function formatTaskDisplay(task: any): string {
  const status = task.completed ? '✅' : '⏳';
  const priority = task.priority === 1 ? '🔴' : task.priority === 2 ? '🟡' : '🟢';
  const dueDateStr = task.dueDate ? `(${dayjs(task.dueDate).format('MM-DD HH:mm')})` : '';
  const tagsStr = task.tags?.length ? `[${task.tags.join(', ')}]` : '';
  const overdueStr = task.dueDate && dayjs(task.dueDate).isBefore(dayjs(), 'day') && !task.completed ? '⚠️逾期' : '';
  
  return `${status} ${priority} ${task.title} ${dueDateStr} ${tagsStr} ${overdueStr}`.trim();
}

// 智能分組任務
export function groupTasks(tasks: any[]): { [key: string]: any[] } {
  const groups: { [key: string]: any[] } = {
    '逾期': [],
    '今天': [],
    '明天': [],
    '本週': [],
    '下週': [],
    '未來': [],
    '無期限': [],
  };

  const now = dayjs();

  tasks.forEach(task => {
    if (task.completed) return; // 已完成的任務不分組

    if (!task.dueDate) {
      groups['無期限'].push(task);
      return;
    }

    const dueDate = dayjs(task.dueDate);
    
    if (dueDate.isBefore(now, 'day')) {
      groups['逾期'].push(task);
    } else if (dueDate.isSame(now, 'day')) {
      groups['今天'].push(task);
    } else if (dueDate.isSame(now.add(1, 'day'), 'day')) {
      groups['明天'].push(task);
    } else if (dueDate.isBetween(now, now.endOf('week'), null, '[]')) {
      groups['本週'].push(task);
    } else if (dueDate.isBetween(now.add(1, 'week').startOf('week'), now.add(1, 'week').endOf('week'), null, '[]')) {
      groups['下週'].push(task);
    } else {
      groups['未來'].push(task);
    }
  });

  // 移除空組
  Object.keys(groups).forEach(key => {
    if (groups[key].length === 0) {
      delete groups[key];
    }
  });

  return groups;
}

// 生成任務ID
export function generateTaskId(): string {
  return `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// 驗證日期格式
export function isValidDate(dateString: string): boolean {
  const date = dayjs(dateString);
  return date.isValid();
}

// 優先級轉換
export function priorityToText(priority: number): string {
  switch (priority) {
    case 1: return '高';
    case 2: return '中';  
    case 3: return '低';
    default: return '未知';
  }
}

// 重複類型轉換
export function repeatToText(repeat: string): string {
  switch (repeat) {
    case 'daily': return '每日';
    case 'weekly': return '每週';
    case 'none': return '無';
    default: return '未知';
  }
}