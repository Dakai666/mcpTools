#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween.js';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore.js';
import {
  parseNaturalDate,
  formatTaskDisplay,
  groupTasks,
  generateTaskId,
  isValidDate,
  priorityToText,
  repeatToText,
} from './utils.js';
import { ReminderService, type ReminderConfig } from './reminder.js';

dayjs.extend(isBetween);
dayjs.extend(isSameOrBefore);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 定義任務介面
interface Task {
  id: string;
  title: string;
  dueDate?: string; // ISO 8601 格式
  tags?: string[];
  priority?: number; // 1=高, 2=中, 3=低
  repeat?: 'daily' | 'weekly' | 'none';
  note?: string;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
}

// 任務儲存服務
class TaskService {
  private tasksFilePath: string;
  private tasks: Task[] = [];

  constructor() {
    this.tasksFilePath = path.join(__dirname, 'tasks.json');
    this.loadTasks();
  }

  private loadTasks(): void {
    try {
      if (fs.existsSync(this.tasksFilePath)) {
        const data = fs.readFileSync(this.tasksFilePath, 'utf8');
        this.tasks = JSON.parse(data);
      } else {
        this.tasks = [];
      }
    } catch (error) {
      console.error('載入任務時發生錯誤:', error);
      this.tasks = [];
    }
  }

  private saveTasks(): void {
    try {
      const dir = path.dirname(this.tasksFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.tasksFilePath, JSON.stringify(this.tasks, null, 2), 'utf8');
    } catch (error) {
      console.error('儲存任務時發生錯誤:', error);
      throw error;
    }
  }

  addTask(
    title: string,
    dueDate?: string,
    tags?: string[],
    priority?: number,
    repeat?: 'daily' | 'weekly' | 'none',
    note?: string
  ): Task {
    const now = dayjs().toISOString();
    
    // 嘗試解析自然語言日期
    let parsedDueDate = dueDate;
    if (dueDate && !isValidDate(dueDate)) {
      const naturalDate = parseNaturalDate(dueDate);
      if (naturalDate) {
        parsedDueDate = naturalDate;
      }
    }
    
    const newTask: Task = {
      id: generateTaskId(),
      title,
      dueDate: parsedDueDate,
      tags: tags || [],
      priority: priority || 3, // 預設低優先級
      repeat: repeat || 'none',
      note,
      completed: false,
      createdAt: now,
      updatedAt: now,
    };
    this.tasks.push(newTask);
    this.saveTasks();
    return newTask;
  }

  listTasks(filter?: 'today' | 'week' | 'overdue' | 'completed' | 'all', tags?: string[], priority?: number): Task[] {
    let filteredTasks = [...this.tasks];

    if (filter) {
      const now = dayjs();
      filteredTasks = filteredTasks.filter(task => {
        if (filter === 'completed') return task.completed;
        if (task.completed && filter !== 'all') return false; // 已完成的任務不應該出現在其他未完成的過濾器中

        if (filter === 'today' && task.dueDate) {
          return dayjs(task.dueDate).isSame(now, 'day');
        }
        if (filter === 'week' && task.dueDate) {
          return dayjs(task.dueDate).isBetween(now.startOf('week'), now.endOf('week'), null, '[]');
        }
        if (filter === 'overdue' && task.dueDate) {
          return dayjs(task.dueDate).isBefore(now, 'day') && !task.completed;
        }
        return true; // 'all' 或無日期過濾
      });
    }

    if (tags && tags.length > 0) {
      filteredTasks = filteredTasks.filter(task =>
        task.tags && tags.some(tag => task.tags?.includes(tag))
      );
    }

    if (priority) {
      filteredTasks = filteredTasks.filter(task => task.priority === priority);
    }

    return filteredTasks.sort((a, b) => {
      // 優先級排序
      if (a.priority !== b.priority) {
        return (a.priority || 3) - (b.priority || 3);
      }
      // 到期日排序
      if (a.dueDate && b.dueDate) {
        return dayjs(a.dueDate).valueOf() - dayjs(b.dueDate).valueOf();
      }
      if (a.dueDate) return -1;
      if (b.dueDate) return 1;
      return 0;
    });
  }

  updateTask(id: string, fields: Partial<Omit<Task, 'id' | 'createdAt'>>): Task | null {
    const taskIndex = this.tasks.findIndex(task => task.id === id);
    if (taskIndex === -1) {
      return null;
    }

    const updatedTask = { ...this.tasks[taskIndex], ...fields, updatedAt: dayjs().toISOString() };
    this.tasks[taskIndex] = updatedTask;
    this.saveTasks();
    return updatedTask;
  }

  deleteTask(id: string): boolean {
    const initialLength = this.tasks.length;
    this.tasks = this.tasks.filter(task => task.id !== id);
    if (this.tasks.length < initialLength) {
      this.saveTasks();
      return true;
    }
    return false;
  }

  completeTask(id: string): Task | null {
    return this.updateTask(id, { completed: true });
  }

  getReminders(date?: string): Task[] {
    const targetDate = date ? dayjs(date) : dayjs();
    return this.tasks.filter(task => {
      // 僅提醒未完成的任務
      if (task.completed) return false;

      // 如果有到期日，且到期日在目標日期或之前
      if (task.dueDate && dayjs(task.dueDate).isSameOrBefore(targetDate, 'day')) {
        return true;
      }

      // 處理重複任務的提醒邏輯（簡化版）
      if (task.repeat === 'daily') {
        return true; // 每日都提醒
      }
      if (task.repeat === 'weekly' && dayjs(task.createdAt).day() === targetDate.day()) {
        return true; // 每週同一天提醒
      }
      return false;
    }).sort((a, b) => {
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return dayjs(a.dueDate).valueOf() - dayjs(b.dueDate).valueOf();
    });
  }

  getStats(): { total: number; completed: number; overdue: number; today: number } {
    const now = dayjs();
    const total = this.tasks.length;
    const completed = this.tasks.filter(t => t.completed).length;
    const overdue = this.tasks.filter(t => 
      !t.completed && t.dueDate && dayjs(t.dueDate).isBefore(now, 'day')
    ).length;
    const today = this.tasks.filter(t => 
      !t.completed && t.dueDate && dayjs(t.dueDate).isSame(now, 'day')
    ).length;

    return { total, completed, overdue, today };
  }

  // 解析自然語言輸入並新增任務
  addTaskFromNaturalInput(input: string): Task {
    // 解析標籤 (#tag)
    const tagPattern = /#(\w+)/g;
    const tags: string[] = [];
    let match;
    while ((match = tagPattern.exec(input)) !== null) {
      tags.push(match[1]);
    }
    const textWithoutTags = input.replace(/#\w+/g, '').trim();

    // 解析優先級關鍵字
    let priority = 3; // 預設低優先級
    if (/重要|urgent|high|高|緊急/i.test(textWithoutTags)) {
      priority = 1;
    } else if (/中等|medium|中/i.test(textWithoutTags)) {
      priority = 2;
    }

    // 解析重複設定
    let repeat: 'daily' | 'weekly' | 'none' = 'none';
    if (/每天|每日|daily/i.test(textWithoutTags)) {
      repeat = 'daily';
    } else if (/每週|weekly/i.test(textWithoutTags)) {
      repeat = 'weekly';
    }

    // 移除關鍵字，獲取標題
    const title = textWithoutTags
      .replace(/重要|urgent|high|高|緊急|中等|medium|中|每天|每日|daily|每週|weekly/gi, '')
      .trim();

    // 嘗試解析日期時間
    const dueDate = parseNaturalDate(input);

    return this.addTask(title, dueDate || undefined, tags, priority, repeat);
  }

  // 搜索任務
  searchTasks(query: string): Task[] {
    const lowerQuery = query.toLowerCase();
    return this.tasks.filter(task => 
      task.title.toLowerCase().includes(lowerQuery) ||
      task.note?.toLowerCase().includes(lowerQuery) ||
      task.tags?.some(tag => tag.toLowerCase().includes(lowerQuery))
    );
  }

  // 獲取分組的任務
  getGroupedTasks(showCompleted: boolean = false): { [key: string]: Task[] } {
    const tasksToGroup = showCompleted ? this.tasks : this.tasks.filter(t => !t.completed);
    return groupTasks(tasksToGroup);
  }
}

// 創建任務服務實例
const taskService = new TaskService();

// 創建提醒服務實例
const reminderService = new ReminderService();

// 創建MCP服務器
const server = new Server(
  {
    name: 'smart-tasks-mcp',
    version: '0.1.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// 定義可用的工具
const TOOLS = [
  {
    name: 'add_task',
    description: '新增代辦事項',
    inputSchema: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: '任務標題',
        },
        dueDate: {
          type: 'string',
          description: '到期日期 (ISO 8601格式，如: 2024-07-01T15:00:00Z)',
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: '標籤列表',
        },
        priority: {
          type: 'number',
          description: '優先級 (1=高, 2=中, 3=低)',
          enum: [1, 2, 3],
        },
        repeat: {
          type: 'string',
          description: '重複設定',
          enum: ['daily', 'weekly', 'none'],
        },
        note: {
          type: 'string',
          description: '備註',
        },
      },
      required: ['title'],
    },
  },
  {
    name: 'list_tasks',
    description: '查詢代辦事項列表',
    inputSchema: {
      type: 'object',
      properties: {
        filter: {
          type: 'string',
          description: '過濾條件',
          enum: ['today', 'week', 'overdue', 'completed', 'all'],
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: '按標籤過濾',
        },
        priority: {
          type: 'number',
          description: '按優先級過濾',
          enum: [1, 2, 3],
        },
      },
    },
  },
  {
    name: 'update_task',
    description: '更新代辦事項',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: '任務ID',
        },
        fields: {
          type: 'object',
          description: '要更新的欄位',
          properties: {
            title: { type: 'string' },
            dueDate: { type: 'string' },
            tags: { type: 'array', items: { type: 'string' } },
            priority: { type: 'number', enum: [1, 2, 3] },
            repeat: { type: 'string', enum: ['daily', 'weekly', 'none'] },
            note: { type: 'string' },
            completed: { type: 'boolean' },
          },
        },
      },
      required: ['id', 'fields'],
    },
  },
  {
    name: 'delete_task',
    description: '刪除代辦事項',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: '任務ID',
        },
      },
      required: ['id'],
    },
  },
  {
    name: 'complete_task',
    description: '完成代辦事項',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: '任務ID',
        },
      },
      required: ['id'],
    },
  },
  {
    name: 'get_reminders',
    description: '查詢提醒事項',
    inputSchema: {
      type: 'object',
      properties: {
        date: {
          type: 'string',
          description: '指定日期 (YYYY-MM-DD格式，預設為今日)',
        },
      },
    },
  },
  {
    name: 'get_stats',
    description: '查詢任務統計',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'add_task_natural',
    description: '使用自然語言新增代辦事項（如：明天下午3點開會）',
    inputSchema: {
      type: 'object',
      properties: {
        input: {
          type: 'string',
          description: '自然語言輸入，如：明天下午3點開會 #工作 重要',
        },
      },
      required: ['input'],
    },
  },
  {
    name: 'list_tasks_grouped',
    description: '按時間分組顯示代辦事項',
    inputSchema: {
      type: 'object',
      properties: {
        showCompleted: {
          type: 'boolean',
          description: '是否顯示已完成的任務',
        },
      },
    },
  },
  {
    name: 'search_tasks',
    description: '搜索代辦事項',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: '搜索關鍵字',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_reminder_config',
    description: '查詢提醒配置',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'update_reminder_config',
    description: '更新提醒配置',
    inputSchema: {
      type: 'object',
      properties: {
        config: {
          type: 'object',
          description: '提醒配置',
          properties: {
            enabled: { type: 'boolean' },
            checkInterval: { type: 'number' },
            reminderTimes: { type: 'array', items: { type: 'string' } },
            advanceReminder: { type: 'number' },
            overdueReminder: { type: 'boolean' },
            soundEnabled: { type: 'boolean' },
          },
        },
      },
      required: ['config'],
    },
  },
  {
    name: 'test_notification',
    description: '測試桌面通知',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'manual_reminder_check',
    description: '手動觸發提醒檢查',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
];

// 註冊工具列表處理程序
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOLS,
}));

// 註冊工具調用處理程序
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'add_task': {
        const { title, dueDate, tags, priority, repeat, note } = args as any;
        const task = taskService.addTask(title, dueDate, tags, priority, repeat, note);
        return {
          content: [
            {
              type: 'text',
              text: `✅ 成功新增任務: "${task.title}"\nID: ${task.id}\n優先級: ${task.priority}\n${task.dueDate ? `到期日: ${dayjs(task.dueDate).format('YYYY-MM-DD HH:mm')}` : '無到期日'}`,
            },
          ],
        };
      }

      case 'list_tasks': {
        const { filter = 'all', tags, priority } = args as any;
        const tasks = taskService.listTasks(filter, tags, priority);
        
        if (tasks.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: '📋 沒有找到符合條件的任務',
              },
            ],
          };
        }

        const taskList = tasks.map(task => formatTaskDisplay(task)).join('\n');

        return {
          content: [
            {
              type: 'text',
              text: `📋 任務列表 (${filter}):\n\n${taskList}`,
            },
          ],
        };
      }

      case 'update_task': {
        const { id, fields } = args as any;
        const updatedTask = taskService.updateTask(id, fields);
        if (!updatedTask) {
          return {
            content: [
              {
                type: 'text',
                text: `❌ 未找到ID為 ${id} 的任務`,
              },
            ],
          };
        }
        return {
          content: [
            {
              type: 'text',
              text: `✏️ 成功更新任務: "${updatedTask.title}"`,
            },
          ],
        };
      }

      case 'delete_task': {
        const { id } = args as any;
        const success = taskService.deleteTask(id);
        return {
          content: [
            {
              type: 'text',
              text: success ? `🗑️ 成功刪除任務` : `❌ 未找到ID為 ${id} 的任務`,
            },
          ],
        };
      }

      case 'complete_task': {
        const { id } = args as any;
        const completedTask = taskService.completeTask(id);
        if (!completedTask) {
          return {
            content: [
              {
                type: 'text',
                text: `❌ 未找到ID為 ${id} 的任務`,
              },
            ],
          };
        }
        return {
          content: [
            {
              type: 'text',
              text: `🎉 恭喜完成任務: "${completedTask.title}"`,
            },
          ],
        };
      }

      case 'get_reminders': {
        const { date } = args as any;
        const reminders = taskService.getReminders(date);
        
        if (reminders.length === 0) {
          const dateStr = date ? dayjs(date).format('YYYY-MM-DD') : '今天';
          return {
            content: [
              {
                type: 'text',
                text: `🔔 ${dateStr}沒有需要提醒的任務`,
              },
            ],
          };
        }

        const reminderList = reminders.map(task => formatTaskDisplay(task)).join('\n');

        const dateStr = date ? dayjs(date).format('YYYY-MM-DD') : '今天';
        return {
          content: [
            {
              type: 'text',
              text: `🔔 ${dateStr}的提醒事項:\n\n${reminderList}`,
            },
          ],
        };
      }

      case 'get_stats': {
        const stats = taskService.getStats();
        return {
          content: [
            {
              type: 'text',
              text: `📊 任務統計:\n\n總任務數: ${stats.total}\n已完成: ${stats.completed}\n今日到期: ${stats.today}\n已逾期: ${stats.overdue}`,
            },
          ],
        };
      }

      case 'add_task_natural': {
        const { input } = args as any;
        const task = taskService.addTaskFromNaturalInput(input);
        return {
          content: [
            {
              type: 'text',
              text: `✅ 成功解析並新增任務: "${task.title}"\nID: ${task.id}\n優先級: ${priorityToText(task.priority!)}\n${task.dueDate ? `到期日: ${dayjs(task.dueDate).format('YYYY-MM-DD HH:mm')}` : '無到期日'}\n標籤: ${task.tags?.join(', ') || '無'}\n重複: ${repeatToText(task.repeat!)}`,
            },
          ],
        };
      }

      case 'list_tasks_grouped': {
        const { showCompleted = false } = args as any;
        const groupedTasks = taskService.getGroupedTasks(showCompleted);
        
        if (Object.keys(groupedTasks).length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: '📋 沒有找到任何任務',
              },
            ],
          };
        }

        let result = '📋 任務分組顯示:\n\n';
        
        Object.entries(groupedTasks).forEach(([group, tasks]) => {
          result += `## ${group} (${tasks.length})\n`;
          tasks.forEach(task => {
            result += `${formatTaskDisplay(task)}\n`;
          });
          result += '\n';
        });

        return {
          content: [
            {
              type: 'text',
              text: result,
            },
          ],
        };
      }

      case 'search_tasks': {
        const { query } = args as any;
        const tasks = taskService.searchTasks(query);
        
        if (tasks.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: `🔍 沒有找到包含 "${query}" 的任務`,
              },
            ],
          };
        }

        const taskList = tasks.map(task => formatTaskDisplay(task)).join('\n');

        return {
          content: [
            {
              type: 'text',
              text: `🔍 搜索結果 (${tasks.length} 個結果):\n\n${taskList}`,
            },
          ],
        };
      }

      case 'get_reminder_config': {
        const config = reminderService.getConfig();
        return {
          content: [
            {
              type: 'text',
              text: `🔔 提醒配置:\n\n` +
                   `啟用狀態: ${config.enabled ? '✅ 啟用' : '❌ 停用'}\n` +
                   `檢查間隔: ${config.checkInterval} 分鐘\n` +
                   `定時提醒: ${config.reminderTimes.join(', ')}\n` +
                   `提前提醒: ${config.advanceReminder} 小時\n` +
                   `逾期提醒: ${config.overdueReminder ? '✅ 啟用' : '❌ 停用'}\n` +
                   `聲音提醒: ${config.soundEnabled ? '✅ 啟用' : '❌ 停用'}`,
            },
          ],
        };
      }

      case 'update_reminder_config': {
        const { config } = args as any;
        reminderService.updateConfig(config);
        const updatedConfig = reminderService.getConfig();
        
        return {
          content: [
            {
              type: 'text',
              text: `✅ 提醒配置已更新!\n\n` +
                   `啟用狀態: ${updatedConfig.enabled ? '✅ 啟用' : '❌ 停用'}\n` +
                   `檢查間隔: ${updatedConfig.checkInterval} 分鐘\n` +
                   `定時提醒: ${updatedConfig.reminderTimes.join(', ')}\n` +
                   `提前提醒: ${updatedConfig.advanceReminder} 小時\n` +
                   `逾期提醒: ${updatedConfig.overdueReminder ? '✅ 啟用' : '❌ 停用'}\n` +
                   `聲音提醒: ${updatedConfig.soundEnabled ? '✅ 啟用' : '❌ 停用'}`,
            },
          ],
        };
      }

      case 'test_notification': {
        reminderService.testNotification();
        return {
          content: [
            {
              type: 'text',
              text: '🧪 測試通知已發送！請檢查系統通知區域。',
            },
          ],
        };
      }

      case 'manual_reminder_check': {
        reminderService.manualCheck();
        return {
          content: [
            {
              type: 'text',
              text: '🔍 手動提醒檢查已完成！如有需要提醒的任務，您會收到通知。',
            },
          ],
        };
      }

      default:
        throw new Error(`未知的工具: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `❌ 執行工具時發生錯誤: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
});

// 啟動服務器
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  // 這裡不應該有console.log，因為會干擾MCP協議
}

main().catch((error) => {
  console.error('MCP服務器啟動失敗:', error);
  process.exit(1);
});