#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween.js';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore.js';

dayjs.extend(isBetween);
dayjs.extend(isSameOrBefore);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 任務介面（與主要工具保持一致）
interface Task {
  id: string;
  title: string;
  dueDate?: string;
  tags?: string[];
  priority?: number;
  repeat?: 'daily' | 'weekly' | 'none';
  note?: string;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
}

// 提醒配置介面
interface ReminderConfig {
  enabled: boolean;
  checkInterval: number; // 檢查間隔（分鐘）
  reminderTimes: string[]; // 每日提醒時間 ['09:00', '18:00']
  advanceReminder: number; // 提前提醒時間（小時）
  overdueReminder: boolean; // 是否提醒逾期任務
  soundEnabled: boolean; // 是否播放提醒聲音
}

// 提醒服務類
class ReminderService {
  private tasksFilePath: string;
  private configFilePath: string;
  private config!: ReminderConfig;
  private intervalId: NodeJS.Timeout | null = null;

  constructor() {
    // 根據編譯環境決定路徑
    const isCompiled = __dirname.includes('/dist');
    const baseDir = isCompiled ? path.join(__dirname, '..', 'dist') : __dirname;
    
    this.tasksFilePath = path.join(baseDir, 'tasks.json');
    this.configFilePath = path.join(baseDir, 'reminder-config.json');
    this.loadConfig();
  }

  // 載入提醒配置
  private loadConfig(): void {
    const defaultConfig: ReminderConfig = {
      enabled: true,
      checkInterval: 5, // 5分鐘檢查一次
      reminderTimes: ['09:00', '18:00'], // 早上9點和晚上6點
      advanceReminder: 1, // 提前1小時提醒
      overdueReminder: true,
      soundEnabled: true,
    };

    try {
      if (fs.existsSync(this.configFilePath)) {
        const data = fs.readFileSync(this.configFilePath, 'utf8');
        this.config = { ...defaultConfig, ...JSON.parse(data) };
      } else {
        this.config = defaultConfig;
        this.saveConfig();
      }
    } catch (error) {
      console.error('載入提醒配置失敗，使用預設配置:', error);
      this.config = defaultConfig;
    }
  }

  // 儲存提醒配置
  private saveConfig(): void {
    try {
      fs.writeFileSync(this.configFilePath, JSON.stringify(this.config, null, 2), 'utf8');
    } catch (error) {
      console.error('儲存提醒配置失敗:', error);
    }
  }

  // 載入任務
  private loadTasks(): Task[] {
    try {
      if (fs.existsSync(this.tasksFilePath)) {
        const data = fs.readFileSync(this.tasksFilePath, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('載入任務失敗:', error);
    }
    return [];
  }

  // 檢測是否在WSL環境中
  private isWSL(): boolean {
    try {
      if (fs.existsSync('/proc/version')) {
        const version = fs.readFileSync('/proc/version', 'utf8');
        const isWSLEnv = version.includes('WSL') || version.includes('Microsoft') || version.includes('microsoft');
        console.log(`🔍 檢測環境: ${version.trim()}`);
        console.log(`🔍 WSL檢測結果: ${isWSLEnv}`);
        return isWSLEnv;
      }
    } catch (error) {
      console.log(`🔍 WSL檢測錯誤: ${error}`);
    }
    return false;
  }

  // 發送Windows Toast通知（WSL環境）
  private sendWindowsNotification(title: string, message: string): void {
    try {
      // 方案1: 使用自定義PowerShell腳本
      const scriptPath = path.join(__dirname, '..', 'scripts', 'windows-notify.ps1');
      
      if (fs.existsSync(scriptPath)) {
        const psCmd = spawn('powershell.exe', [
          '-NoProfile',
          '-ExecutionPolicy', 'Bypass',
          '-File', scriptPath,
          '-Title', title,
          '-Message', message
        ]);
        
        psCmd.on('error', () => {
          this.fallbackWindowsNotification(title, message);
        });
        
        return;
      }

      // 方案2: 直接使用PowerShell命令
      this.fallbackWindowsNotification(title, message);

    } catch (error) {
      console.log(`📢 WSL提醒: ${title} - ${message}`);
    }
  }

  // 備用Windows通知方案
  private fallbackWindowsNotification(title: string, message: string): void {
    // 簡單的MessageBox通知
    const simpleCommand = `Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.MessageBox]::Show('${message.replace(/'/g, "''")}', 'Smart Tasks: ${title.replace(/'/g, "''")}', 'OK', 'Information')`;
    
    const psCmd = spawn('powershell.exe', [
      '-NoProfile',
      '-ExecutionPolicy', 'Bypass',
      '-Command', simpleCommand
    ]);

    psCmd.on('error', () => {
      // 如果PowerShell也失敗，嘗試使用cmd腳本
      const cmdPath = path.join(__dirname, '..', 'scripts', 'simple-notify.cmd');
      if (fs.existsSync(cmdPath)) {
        spawn('cmd.exe', ['/C', cmdPath, title, message]).on('error', () => {
          console.log(`📢 WSL提醒: ${title} - ${message}`);
        });
      } else {
        console.log(`📢 WSL提醒: ${title} - ${message}`);
      }
    });
  }

  // 發送Linux桌面通知
  private sendLinuxNotification(title: string, message: string, urgency: 'low' | 'normal' | 'critical' = 'normal'): void {
    try {
      const notifyCmd = spawn('notify-send', [
        '--app-name=Smart Tasks',
        `--urgency=${urgency}`,
        '--icon=appointment-soon',
        title,
        message
      ]);

      notifyCmd.on('error', (err) => {
        console.log(`📢 Linux提醒: ${title} - ${message}`);
      });

      // 如果啟用聲音提醒
      if (this.config.soundEnabled) {
        spawn('paplay', ['/usr/share/sounds/alsa/Front_Right.wav']).on('error', () => {
          // 忽略聲音播放錯誤
        });
      }
    } catch (error) {
      console.log(`📢 Linux提醒: ${title} - ${message}`);
    }
  }

  // 發送桌面通知（跨平台）
  private sendNotification(title: string, message: string, urgency: 'low' | 'normal' | 'critical' = 'normal'): void {
    if (this.isWSL()) {
      console.log(`🪟 WSL環境檢測到，使用Windows通知`);
      this.sendWindowsNotification(title, message);
    } else {
      console.log(`🐧 Linux環境檢測到，使用原生通知`);
      this.sendLinuxNotification(title, message, urgency);
    }
  }

  // 檢查需要提醒的任務
  private checkReminders(): void {
    const tasks = this.loadTasks();
    const now = dayjs();

    console.log(`🔍 檢查提醒 - ${now.format('YYYY-MM-DD HH:mm:ss')}`);

    // 1. 檢查即將到期的任務
    const upcomingTasks = tasks.filter(task => {
      if (task.completed || !task.dueDate) return false;
      
      const dueDate = dayjs(task.dueDate);
      const hoursUntilDue = dueDate.diff(now, 'hour', true);
      
      return hoursUntilDue > 0 && hoursUntilDue <= this.config.advanceReminder;
    });

    upcomingTasks.forEach(task => {
      const dueDate = dayjs(task.dueDate!);
      const timeLeft = dueDate.from(now);
      const priority = task.priority === 1 ? '🔴' : task.priority === 2 ? '🟡' : '🟢';
      
      this.sendNotification(
        '⏰ 任務即將到期',
        `${priority} ${task.title}\n到期時間: ${dueDate.format('MM-DD HH:mm')} (${timeLeft})`,
        task.priority === 1 ? 'critical' : 'normal'
      );
    });

    // 2. 檢查逾期任務
    if (this.config.overdueReminder) {
      const overdueTasks = tasks.filter(task => {
        if (task.completed || !task.dueDate) return false;
        return dayjs(task.dueDate).isBefore(now);
      });

      if (overdueTasks.length > 0) {
        const overdueCount = overdueTasks.length;
        const taskList = overdueTasks.slice(0, 3).map(t => `• ${t.title}`).join('\n');
        const moreText = overdueCount > 3 ? `\n...還有 ${overdueCount - 3} 個任務` : '';
        
        this.sendNotification(
          '⚠️ 逾期任務提醒',
          `您有 ${overdueCount} 個逾期任務:\n${taskList}${moreText}`,
          'critical'
        );
      }
    }

    // 3. 檢查今日到期任務（定時提醒）
    const isReminderTime = this.config.reminderTimes.some(time => {
      const [hour, minute] = time.split(':').map(Number);
      return now.hour() === hour && now.minute() === minute;
    });

    if (isReminderTime) {
      const todayTasks = tasks.filter(task => {
        if (task.completed || !task.dueDate) return false;
        return dayjs(task.dueDate).isSame(now, 'day');
      });

      if (todayTasks.length > 0) {
        const taskList = todayTasks.slice(0, 5).map(t => {
          const priority = t.priority === 1 ? '🔴' : t.priority === 2 ? '🟡' : '🟢';
          return `${priority} ${t.title}`;
        }).join('\n');
        const moreText = todayTasks.length > 5 ? `\n...還有 ${todayTasks.length - 5} 個任務` : '';

        this.sendNotification(
          '📅 今日任務提醒',
          `您今天有 ${todayTasks.length} 個任務:\n${taskList}${moreText}`,
          'normal'
        );
      }
    }

    // 4. 檢查重複任務
    const repeatTasks = tasks.filter(task => {
      if (task.completed) return false;
      
      if (task.repeat === 'daily') {
        return true; // 每天都提醒
      } else if (task.repeat === 'weekly') {
        const createdDay = dayjs(task.createdAt).day();
        return now.day() === createdDay;
      }
      
      return false;
    });

    repeatTasks.forEach(task => {
      const repeatType = task.repeat === 'daily' ? '每日' : '每週';
      this.sendNotification(
        `🔄 ${repeatType}任務提醒`,
        `${task.title}`,
        'normal'
      );
    });
  }

  // 啟動提醒服務
  public start(): void {
    if (!this.config.enabled) {
      console.log('📴 提醒服務已停用');
      return;
    }

    console.log(`🚀 啟動提醒服務 - 每 ${this.config.checkInterval} 分鐘檢查一次`);
    console.log(`⏰ 定時提醒時間: ${this.config.reminderTimes.join(', ')}`);
    console.log(`⚡ 提前提醒時間: ${this.config.advanceReminder} 小時`);

    // 立即檢查一次
    this.checkReminders();

    // 設定定時檢查
    this.intervalId = setInterval(() => {
      this.checkReminders();
    }, this.config.checkInterval * 60 * 1000);

    // 處理程式結束信號
    process.on('SIGINT', () => {
      this.stop();
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      this.stop();
      process.exit(0);
    });
  }

  // 停止提醒服務
  public stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('🛑 提醒服務已停止');
    }
  }

  // 更新配置
  public updateConfig(newConfig: Partial<ReminderConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.saveConfig();
    
    // 重啟服務以應用新配置
    if (this.intervalId) {
      this.stop();
      this.start();
    }
  }

  // 獲取配置
  public getConfig(): ReminderConfig {
    return { ...this.config };
  }

  // 手動觸發檢查
  public manualCheck(): void {
    console.log('🔍 手動觸發提醒檢查');
    this.checkReminders();
  }

  // 測試通知
  public testNotification(): void {
    this.sendNotification(
      '🧪 測試通知',
      'Smart Tasks 提醒系統正常運作！',
      'normal'
    );
  }
}

// 如果直接執行此文件，啟動提醒服務
if (import.meta.url === `file://${process.argv[1]}`) {
  const reminderService = new ReminderService();
  
  // 處理命令行參數
  const args = process.argv.slice(2);
  
  if (args.includes('--test')) {
    reminderService.testNotification();
    reminderService.manualCheck();
  } else if (args.includes('--check')) {
    reminderService.manualCheck();
  } else {
    reminderService.start();
    
    // 保持程式運行
    console.log('🔔 提醒服務運行中... 按 Ctrl+C 停止');
    
    // 防止程式退出
    process.stdin.resume();
  }
}

export { ReminderService, type ReminderConfig };