import 'dayjs/locale/zh-tw.js';
export declare function parseNaturalDate(input: string): string | null;
export declare function formatTaskDisplay(task: any): string;
export declare function groupTasks(tasks: any[]): {
    [key: string]: any[];
};
export declare function generateTaskId(): string;
export declare function isValidDate(dateString: string): boolean;
export declare function priorityToText(priority: number): string;
export declare function repeatToText(repeat: string): string;
