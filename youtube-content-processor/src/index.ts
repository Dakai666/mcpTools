#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool
} from '@modelcontextprotocol/sdk/types.js';

import { YtDlpTranscriptExtractor } from './services/YtDlpTranscriptExtractor.js';

class YouTubeTranscriptServer {
  private server: Server;
  private transcriptExtractor: YtDlpTranscriptExtractor;

  constructor() {
    this.server = new Server(
      {
        name: 'youtube-transcript-extractor',
        version: '3.0.0',
      }
    );

    this.transcriptExtractor = new YtDlpTranscriptExtractor();
    this.setupToolHandlers();
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'get_available_captions',
            description: 'Get list of available captions for a YouTube video',
            inputSchema: {
              type: 'object',
              properties: {
                videoUrl: { 
                  type: 'string', 
                  description: 'YouTube video URL or video ID' 
                }
              },
              required: ['videoUrl']
            }
          },
          {
            name: 'extract_transcript',
            description: 'Extract clean transcript from YouTube video',
            inputSchema: {
              type: 'object',
              properties: {
                videoUrl: { 
                  type: 'string', 
                  description: 'YouTube video URL or video ID' 
                },
                languages: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Language preference list (e.g., ["zh-TW", "zh-Hans", "zh", "en"])',
                  default: ['zh-TW', 'zh-Hans', 'zh', 'en']
                },
                format: {
                  type: 'string',
                  enum: ['segments', 'text', 'vtt', 'srt'],
                  description: 'Output format for the transcript',
                  default: 'segments'
                },
                includeGenerated: {
                  type: 'boolean',
                  description: 'Include automatically generated captions',
                  default: true
                }
              },
              required: ['videoUrl']
            }
          }
        ]
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'get_available_captions':
            return await this.handleGetAvailableCaptions(args);
          case 'extract_transcript':
            return await this.handleExtractTranscript(args);
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `❌ Tool execution failed: ${error instanceof Error ? error.message : String(error)}`
            }
          ],
          isError: true
        };
      }
    });
  }

  private async handleGetAvailableCaptions(args: any) {
    const { videoUrl } = args;

    try {
      // 檢查 yt_dlp 可用性
      const isAvailable = await this.transcriptExtractor.checkYtDlpAvailability();
      if (!isAvailable) {
        throw new Error('yt_dlp is not available. Please ensure Python and yt_dlp are installed.');
      }

      const captions = await this.transcriptExtractor.getAvailableCaptions(videoUrl);
      
      if (captions.length === 0) {
        const responseText = `📺 **${this.extractVideoId(videoUrl)}** - Caption Query Result\n\n` +
          `❌ No captions available for this video`;

        return {
          content: [
            {
              type: 'text',
              text: responseText
            }
          ]
        };
      }

      let responseText = `📺 **Available Captions**\n\n`;
      responseText += `🎬 Video ID: ${this.extractVideoId(videoUrl)}\n`;
      responseText += `📊 Total: ${captions.length} languages\n\n`;

      const manualCaptions = captions.filter(cap => !cap.isAutomatic);
      const autoCaptions = captions.filter(cap => cap.isAutomatic);

      if (manualCaptions.length > 0) {
        responseText += `✍️ **Manual Captions** (${manualCaptions.length} languages):\n`;
        manualCaptions.forEach((cap, i) => {
          responseText += `${i + 1}. ${cap.language} - ${cap.name}\n`;
        });
        responseText += `\n`;
      }

      if (autoCaptions.length > 0) {
        responseText += `🤖 **Auto-generated Captions** (${autoCaptions.length} languages):\n`;
        autoCaptions.slice(0, 10).forEach((cap, i) => {
          responseText += `${i + 1}. ${cap.language} - ${cap.name}\n`;
        });
        if (autoCaptions.length > 10) {
          responseText += `... and ${autoCaptions.length - 10} more\n`;
        }
        responseText += `\n`;
      }

      responseText += `💡 **Usage Tips:**\n`;
      responseText += `• Manual captions usually have higher quality\n`;
      responseText += `• Use extract_transcript with language preferences\n`;
      responseText += `• Recommended priority: ["zh-TW", "zh-Hans", "zh", "en"]`;

      return {
        content: [
          {
            type: 'text',
            text: responseText
          }
        ]
      };

    } catch (error) {
      const errorText = `❌ **Failed to get captions list**\n\n` +
        `Error: ${error instanceof Error ? error.message : String(error)}\n\n` +
        `💡 **Possible solutions:**\n` +
        `• Ensure Python 3 and yt_dlp are installed\n` +
        `• Check if video URL is correct\n` +
        `• Verify the video exists and is publicly accessible`;

      return {
        content: [
          {
            type: 'text',
            text: errorText
          }
        ],
        isError: true
      };
    }
  }

  private async handleExtractTranscript(args: any) {
    const { 
      videoUrl, 
      languages = ['zh-TW', 'zh-Hans', 'zh', 'en'],
      format = 'segments',
      includeGenerated = true
    } = args;

    try {
      // 檢查 yt_dlp 可用性
      const isAvailable = await this.transcriptExtractor.checkYtDlpAvailability();
      if (!isAvailable) {
        throw new Error('yt_dlp is not available. Please ensure Python and yt_dlp are installed.');
      }

      const result = await this.transcriptExtractor.extract(videoUrl, {
        languagePreference: languages,
        includeAutomatic: includeGenerated,
        outputFormat: format
      });

      let responseText = `🎤 **Transcript Extracted Successfully (yt_dlp)**\n\n`;
      responseText += `🎬 Video: ${result.videoInfo.title}\n`;
      responseText += `📺 Channel: ${result.videoInfo.channel}\n`;
      responseText += `🌐 Language: ${result.captionInfo.name}\n`;
      responseText += `📝 Format: ${format}\n`;
      responseText += `⏱️ Duration: ${this.formatDuration(result.videoInfo.duration)}\n\n`;

      if (format === 'segments') {
        const segments = result.segments;
        responseText += `✅ Successfully extracted ${segments.length} segments\n\n`;
        responseText += `**Preview (first 3 segments):**\n`;
        segments.slice(0, 3).forEach((seg, i) => {
          responseText += `${i + 1}. [${this.formatTime(seg.start)} - ${this.formatTime(seg.end)}] ${seg.text}\n`;
        });
        
        if (segments.length > 3) {
          responseText += `... and ${segments.length - 3} more segments\n`;
        }

        return {
          content: [
            {
              type: 'text',
              text: responseText
            }
          ],
          isError: false
        };
      } else {
        // 格式化輸出
        const formattedOutput = this.transcriptExtractor.formatOutput(result, format);
        
        return {
          content: [
            {
              type: 'text',
              text: responseText + `\n**${format.toUpperCase()} Format Content:**\n\`\`\`\n${formattedOutput.substring(0, 2000)}\n\`\`\``
            }
          ],
          isError: false
        };
      }

    } catch (error) {
      const errorText = `❌ **Transcript extraction failed**\n\n` +
        `Error: ${error instanceof Error ? error.message : String(error)}\n\n` +
        `💡 **Possible solutions:**\n` +
        `• Ensure Python 3 and yt_dlp are installed\n` +
        `• Check if video URL is correct\n` +
        `• Verify the video has available captions\n` +
        `• Try different language preferences`;

      return {
        content: [
          {
            type: 'text',
            text: errorText
          }
        ],
        isError: true
      };
    }
  }

  private extractVideoId(urlOrId: string): string | null {
    if (/^[a-zA-Z0-9_-]{11}$/.test(urlOrId)) {
      return urlOrId;
    }

    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})/
    ];

    for (const pattern of patterns) {
      const match = urlOrId.match(pattern);
      if (match) return match[1];
    }

    return urlOrId;
  }

  private formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }

  private formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('YouTube Transcript Extractor MCP server running on stdio');
  }
}

const server = new YouTubeTranscriptServer();
server.run().catch(console.error);