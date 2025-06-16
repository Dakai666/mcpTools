#!/usr/bin/env node
interface ReminderConfig {
    enabled: boolean;
    checkInterval: number;
    reminderTimes: string[];
    advanceReminder: number;
    overdueReminder: boolean;
    soundEnabled: boolean;
}
declare class ReminderService {
    private tasksFilePath;
    private configFilePath;
    private config;
    private intervalId;
    constructor();
    private loadConfig;
    private saveConfig;
    private loadTasks;
    private isWSL;
    private sendWindowsNotification;
    private fallbackWindowsNotification;
    private sendLinuxNotification;
    private sendNotification;
    private checkReminders;
    start(): void;
    stop(): void;
    updateConfig(newConfig: Partial<ReminderConfig>): void;
    getConfig(): ReminderConfig;
    manualCheck(): void;
    testNotification(): void;
}
export { ReminderService, type ReminderConfig };
