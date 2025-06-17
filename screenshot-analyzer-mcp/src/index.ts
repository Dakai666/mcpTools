#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { HybridOCREngine } from './services/HybridOCREngine.js';
import { ContentAnalyzer } from './services/ContentAnalyzer.js';
import { 
  AnalysisOptions, 
  ScreenshotAnalysis, 
  ImageMetadata,
  ImageProcessOptions 
} from './types/index.js';
import sharp from 'sharp';
import { promises as fs } from 'fs';
import path from 'path';

class ScreenshotAnalyzerServer {
  private server: Server;
  private ocrEngine: HybridOCREngine;
  private contentAnalyzer: ContentAnalyzer;

  constructor() {
    this.server = new Server(
      {
        name: 'screenshot-analyzer-mcp',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.ocrEngine = new HybridOCREngine();
    this.contentAnalyzer = new ContentAnalyzer();
    this.setupHandlers();
  }

  private setupHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'analyze_screenshot',
            description: 'Analyze a screenshot image using OCR and content analysis',
            inputSchema: {
              type: 'object',
              properties: {
                imagePath: {
                  type: 'string',
                  description: 'Path to the screenshot image file',
                },
                options: {
                  type: 'object',
                  description: 'Analysis options',
                  properties: {
                    languages: {
                      type: 'array',
                      items: { type: 'string' },
                      description: 'OCR languages to use (e.g., ["eng", "chi_tra"])',
                      default: ['eng', 'chi_tra', 'chi_sim']
                    },
                    imageProcessing: {
                      type: 'object',
                      description: 'Image processing options',
                      properties: {
                        enhanceContrast: { type: 'boolean', default: true },
                        removeNoise: { type: 'boolean', default: true },
                        deskew: { type: 'boolean', default: false },
                        resize: {
                          type: 'object',
                          properties: {
                            width: { type: 'number' },
                            height: { type: 'number' },
                            maintainAspectRatio: { type: 'boolean', default: true }
                          }
                        }
                      }
                    },
                    extractStructure: { type: 'boolean', default: true },
                    detectTables: { type: 'boolean', default: true },
                    confidenceThreshold: { type: 'number', default: 30 }
                  }
                }
              },
              required: ['imagePath'],
            },
          },
          {
            name: 'extract_text_only',
            description: 'Extract only text content from screenshot without detailed analysis',
            inputSchema: {
              type: 'object',
              properties: {
                imagePath: {
                  type: 'string',
                  description: 'Path to the screenshot image file',
                },
                languages: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'OCR languages to use',
                  default: ['eng', 'chi_tra', 'chi_sim']
                },
                enhanceImage: {
                  type: 'boolean',
                  description: 'Whether to enhance image before OCR',
                  default: true
                }
              },
              required: ['imagePath'],
            },
          },
          {
            name: 'get_image_metadata',
            description: 'Get metadata information about an image file',
            inputSchema: {
              type: 'object',
              properties: {
                imagePath: {
                  type: 'string',
                  description: 'Path to the image file',
                },
              },
              required: ['imagePath'],
            },
          },
          {
            name: 'preprocess_image',
            description: 'Preprocess image for better OCR results and save to a new file',
            inputSchema: {
              type: 'object',
              properties: {
                inputPath: {
                  type: 'string',
                  description: 'Path to the input image file',
                },
                outputPath: {
                  type: 'string',
                  description: 'Path where the processed image will be saved',
                },
                options: {
                  type: 'object',
                  description: 'Processing options',
                  properties: {
                    enhanceContrast: { type: 'boolean', default: true },
                    removeNoise: { type: 'boolean', default: true },
                    resize: {
                      type: 'object',
                      properties: {
                        width: { type: 'number' },
                        height: { type: 'number' },
                        maintainAspectRatio: { type: 'boolean', default: true }
                      }
                    }
                  }
                }
              },
              required: ['inputPath', 'outputPath'],
            },
          }
        ] as Tool[],
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'analyze_screenshot':
            return await this.analyzeScreenshot(args);
          
          case 'extract_text_only':
            return await this.extractTextOnly(args);
          
          case 'get_image_metadata':
            return await this.getImageMetadata(args);
          
          case 'preprocess_image':
            return await this.preprocessImage(args);
          
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  private async analyzeScreenshot(args: any) {
    const { imagePath, options = {} } = args;
    
    await this.validateImageFile(imagePath);
    
    const metadata = await this.extractImageMetadata(imagePath);
    
    // 使用混合 OCR 引擎直接處理圖像
    const hybridResult = await this.ocrEngine.processImage(imagePath, options);
    
    const analysis = this.contentAnalyzer.analyzeContent(hybridResult);
    
    const result: ScreenshotAnalysis = {
      ocr: hybridResult,
      metadata,
      analysis: {
        ...analysis,
        processingDetails: {
          enginesUsed: hybridResult.engineUsed,
          processingTime: hybridResult.processingTime,
          imageStats: hybridResult.imageStats,
          tablesDetected: hybridResult.tableResults?.totalTables || 0
        }
      }
    };

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  private async extractTextOnly(args: any) {
    const { imagePath, languages = ['eng', 'chi_tra', 'chi_sim'], enhanceImage = true } = args;
    
    await this.validateImageFile(imagePath);
    
    const options = {
      languages,
      imageProcessing: enhanceImage ? {
        enhanceContrast: true,
        removeNoise: true
      } : {}
    };
    
    const hybridResult = await this.ocrEngine.processImage(imagePath, options);
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            text: hybridResult.text,
            confidence: hybridResult.confidence,
            wordCount: hybridResult.words.length,
            enginesUsed: hybridResult.engineUsed,
            processingTime: hybridResult.processingTime
          }, null, 2),
        },
      ],
    };
  }

  private async getImageMetadata(args: any) {
    const { imagePath } = args;
    
    await this.validateImageFile(imagePath);
    const metadata = await this.extractImageMetadata(imagePath);
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(metadata, null, 2),
        },
      ],
    };
  }

  private async preprocessImage(args: any) {
    const { inputPath, outputPath, options = {} } = args;
    
    await this.validateImageFile(inputPath);
    
    const outputDir = path.dirname(outputPath);
    await fs.mkdir(outputDir, { recursive: true });
    
    // 注意：HybridOCREngine.processImage 返回完整結果，這裡需要調用內部的預處理
    // 暫時使用 AdaptiveOCREngine 的預處理功能
    const { AdaptiveOCREngine } = await import('./services/AdaptiveOCREngine.js');
    const adaptiveEngine = new AdaptiveOCREngine();
    const processedBuffer = await adaptiveEngine.processImage(inputPath, options);
    await fs.writeFile(outputPath, processedBuffer);
    
    return {
      content: [
        {
          type: 'text',
          text: `Image processed and saved to: ${outputPath}`,
        },
      ],
    };
  }

  private async validateImageFile(imagePath: string): Promise<void> {
    try {
      const stats = await fs.stat(imagePath);
      if (!stats.isFile()) {
        throw new Error(`Path is not a file: ${imagePath}`);
      }
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
        throw new Error(`Image file not found: ${imagePath}`);
      }
      throw error;
    }
  }

  private async extractImageMetadata(imagePath: string): Promise<ImageMetadata> {
    const imageBuffer = await fs.readFile(imagePath);
    const stats = await fs.stat(imagePath);
    const metadata = await sharp(imageBuffer).metadata();
    
    return {
      width: metadata.width || 0,
      height: metadata.height || 0,
      format: metadata.format || 'unknown',
      size: stats.size,
      hasAlpha: metadata.hasAlpha || false
    };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Screenshot Analyzer MCP server running on stdio');
  }

  async cleanup() {
    await this.ocrEngine.terminate();
  }
}

const server = new ScreenshotAnalyzerServer();

process.on('SIGINT', async () => {
  console.error('Received SIGINT, shutting down gracefully...');
  await server.cleanup();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.error('Received SIGTERM, shutting down gracefully...');
  await server.cleanup();
  process.exit(0);
});

server.run().catch((error) => {
  console.error('Server failed to start:', error);
  process.exit(1);
});