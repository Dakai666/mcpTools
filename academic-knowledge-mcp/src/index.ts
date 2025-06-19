#!/usr/bin/env node

/**
 * Academic Knowledge Integration MCP Server - Clean Version
 * 精簡版學術知識整合 MCP 工具 - 專注於為 AI Agent 提供優質結構化知識
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';

import { KnowledgeIntegrationService } from './services/KnowledgeIntegrationService.js';
import { TextProcessingService } from './services/TextProcessingService.js';
import { CrossSourceCorrelationService } from './services/CrossSourceCorrelationService.js';
import { 
  KnowledgeRequest,
  KnowledgeDepth,
  ContentPurpose,
  OutputFormat,
  KnowledgeSource
} from './types/index.js';

class AcademicKnowledgeMCPServer {
  private server: Server;
  private knowledgeService: KnowledgeIntegrationService;
  private textProcessingService: TextProcessingService;
  private correlationService: CrossSourceCorrelationService;

  constructor() {
    this.server = new Server(
      {
        name: 'academic-knowledge-mcp',
        version: '3.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    const semanticScholarApiKey = process.env.SEMANTIC_SCHOLAR_API_KEY;
    this.knowledgeService = new KnowledgeIntegrationService(semanticScholarApiKey);
    this.textProcessingService = new TextProcessingService();
    this.correlationService = new CrossSourceCorrelationService();

    this.setupToolHandlers();
    this.setupErrorHandling();
  }

  private setupToolHandlers(): void {
    // 精簡的 MCP 工具集 - 11個核心工具
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          // === 📖 基礎知識獲取工具 ===
          {
            name: 'quick_knowledge_overview',
            description: '快速主題概覽 - 提供 Wikipedia 基礎知識和結構化信息',
            inputSchema: {
              type: 'object',
              properties: {
                topic: {
                  type: 'string',
                  description: '要查詢的主題或概念'
                }
              },
              required: ['topic']
            }
          },
          {
            name: 'deep_research_search',
            description: '深度學術搜索 - 提供 arXiv 和 Semantic Scholar 的結構化研究數據',
            inputSchema: {
              type: 'object',
              properties: {
                topic: {
                  type: 'string',
                  description: '研究主題'
                }
              },
              required: ['topic']
            }
          },
          {
            name: 'multi_source_summary',
            description: '多源知識整合 - 提供來自多個來源的結構化知識數據供 Agent 分析',
            inputSchema: {
              type: 'object',
              properties: {
                topic: {
                  type: 'string',
                  description: '查詢主題'
                },
                depth: {
                  type: 'string',
                  enum: ['basic', 'professional', 'academic'],
                  description: '知識深度等級',
                  default: 'professional'
                },
                timeLimit: {
                  type: 'number',
                  description: '處理時間限制（分鐘）',
                  default: 15
                }
              },
              required: ['topic']
            }
          },

          // === 🔍 專業研究工具 ===
          {
            name: 'find_cutting_edge_research',
            description: '前沿研究發現 - 提供最新學術論文和研究趨勢的結構化數據',
            inputSchema: {
              type: 'object',
              properties: {
                topic: {
                  type: 'string',
                  description: '研究領域或關鍵詞'
                }
              },
              required: ['topic']
            }
          },
          {
            name: 'build_literature_review',
            description: '文獻綜述構建 - 提供系統性文獻回顧的結構化數據',
            inputSchema: {
              type: 'object',
              properties: {
                topic: {
                  type: 'string',
                  description: '文獻綜述主題'
                }
              },
              required: ['topic']
            }
          },
          {
            name: 'analyze_research_gaps',
            description: '研究空白分析 - 提供潛在研究機會的結構化分析數據',
            inputSchema: {
              type: 'object',
              properties: {
                topic: {
                  type: 'string',
                  description: '研究領域'
                }
              },
              required: ['topic']
            }
          },

          // === 🧠 智能分析工具 ===
          {
            name: 'cross_reference_topics',
            description: '跨領域交叉引用 - 提供不同領域間知識連接的結構化數據',
            inputSchema: {
              type: 'object',
              properties: {
                mainTopic: {
                  type: 'string',
                  description: '主要主題'
                },
                relatedFields: {
                  type: 'array',
                  items: { type: 'string' },
                  description: '相關領域列表'
                }
              },
              required: ['mainTopic']
            }
          },
          {
            name: 'extract_key_insights',
            description: '關鍵洞察提取 - 提供從複雜信息中提取的結構化核心觀點',
            inputSchema: {
              type: 'object',
              properties: {
                topic: {
                  type: 'string',
                  description: '分析主題'
                }
              },
              required: ['topic']
            }
          },
          {
            name: 'compare_perspectives',
            description: '觀點比較分析 - 提供多角度視角的結構化比較數據',
            inputSchema: {
              type: 'object',
              properties: {
                topic: {
                  type: 'string',
                  description: '比較主題'
                },
                languages: {
                  type: 'array',
                  items: { type: 'string' },
                  description: '比較的語言/文化視角',
                  default: ['zh', 'en']
                }
              },
              required: ['topic']
            }
          },

          // === 📄 文本分析工具 ===
          {
            name: 'analyze_text_structure',
            description: '文本結構分析 - 提供章節、關鍵詞、概念實體等結構化分析數據',
            inputSchema: {
              type: 'object',
              properties: {
                text: {
                  type: 'string',
                  description: '要分析的文本內容'
                },
                analysisTypes: {
                  type: 'array',
                  items: {
                    type: 'string',
                    enum: ['sections', 'keywords', 'concepts', 'entities', 'summaries']
                  },
                  description: '需要的分析類型',
                  default: ['sections', 'keywords', 'concepts']
                }
              },
              required: ['text']
            }
          },

          // ===  ===
          {
            name: 'correlate_sources',
            description: '多源關聯分析 - 提供實體對齊、時間軸整合、觀點比較的結構化關聯數據',
            inputSchema: {
              type: 'object',
              properties: {
                sources: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      source: { type: 'string' },
                      content: { type: 'string' },
                      metadata: { type: 'object' }
                    },
                    required: ['source', 'content']
                  },
                  description: '要關聯分析的多個來源'
                }
              },
              required: ['sources']
            }
          }
        ]
      };
    });

    // 工具調用處理器
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        await this.initializeServices();

        switch (name) {
          // 基礎知識獲取
          case 'quick_knowledge_overview':
            return await this.handleQuickOverview(args);
          case 'deep_research_search':
            return await this.handleDeepResearch(args);
          case 'multi_source_summary':
            return await this.handleMultiSourceSummary(args);

          // 專業研究工具
          case 'find_cutting_edge_research':
            return await this.handleCuttingEdgeResearch(args);
          case 'build_literature_review':
            return await this.handleLiteratureReview(args);
          case 'analyze_research_gaps':
            return await this.handleResearchGaps(args);

          // 智能分析工具
          case 'cross_reference_topics':
            return await this.handleCrossReference(args);
          case 'extract_key_insights':
            return await this.handleKeyInsights(args);
          case 'compare_perspectives':
            return await this.handleComparePerspectives(args);

          // 文本分析工具
          case 'analyze_text_structure':
            return await this.handleTextStructureAnalysis(args);

          // 關聯分析工具
          case 'correlate_sources':
            return await this.handleSourceCorrelation(args);

          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${name}`
            );
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        throw new McpError(
          ErrorCode.InternalError,
          `Tool execution failed: ${errorMessage}`
        );
      }
    });
  }

  private async initializeServices(): Promise<void> {
    await Promise.all([
      this.knowledgeService.initialize(),
      this.textProcessingService.initialize(),
      this.correlationService.initialize()
    ]);
  }

  // === 工具處理器實現 ===

  private async handleQuickOverview(args: any) {
    const result = await this.knowledgeService.quickKnowledgeOverview(args.topic);
    
    if (!result.success) {
      throw new McpError(ErrorCode.InternalError, result.error?.message || 'Failed to get quick overview');
    }

    return {
      content: [
        {
          type: 'text',
          text: `📖 Quick Knowledge Overview: ${args.topic}\n\n` +
                `**深度等級**: ${result.data!.depth}\n` +
                `**處理時間**: ${result.metadata?.processingTime || 0}ms\n` +
                `**信心度**: ${result.data!.metadata.confidence}%\n\n` +
                `## 概要\n${result.data!.content.summary}\n\n` +
                `## 資料來源\n` +
                result.data!.sources.map(s => `- **${s.source}**: ${s.contribution}% 貢獻度, 品質評分 ${s.quality}/10`).join('\n')
        }
      ]
    };
  }

  private async handleDeepResearch(args: any) {
    const result = await this.knowledgeService.deepResearchSearch(args.topic);
    
    if (!result.success) {
      throw new McpError(ErrorCode.InternalError, result.error?.message || 'Failed to conduct deep research');
    }

    return {
      content: [
        {
          type: 'text',
          text: `🔬 Deep Research Search: ${args.topic}\n\n` +
                `**深度等級**: ${result.data!.depth}\n` +
                `**處理時間**: ${result.metadata?.processingTime || 0}ms\n` +
                `**信心度**: ${result.data!.metadata.confidence}%\n\n` +
                `## 概要\n${result.data!.content.summary}\n\n` +
                `## 關鍵要點\n${result.data!.content.keyPoints.map((p, i) => `${i+1}. ${p}`).join('\n')}\n\n` +
                `## 詳細內容\n${result.data!.content.detailedSections.map(s => 
                  `### ${s.title}\n${s.content}`).join('\n\n')}\n\n` +
                `## 資料來源\n` +
                result.data!.sources.map(s => `- **${s.source}**: ${s.contribution}% 貢獻度, 品質評分 ${s.quality}/10`).join('\n')
        }
      ]
    };
  }

  private async handleMultiSourceSummary(args: any) {
    const request = {
      topic: args.topic,
      depth: (args.depth || 'professional') as KnowledgeDepth,
      timeLimit: args.timeLimit || 15,
      sources: ['wikipedia', 'arxiv', 'semanticscholar'] as KnowledgeSource[],
      format: 'summary' as OutputFormat,
      purpose: 'research' as ContentPurpose,
      languages: ['zh', 'en']
    };
    
    const result = await this.knowledgeService.multiSourceSummary(request);
    
    if (!result.success) {
      throw new McpError(ErrorCode.InternalError, result.error?.message || 'Failed to create multi-source summary');
    }

    return {
      content: [
        {
          type: 'text',
          text: `🔄 Multi-Source Summary: ${args.topic}\n\n` +
                `**深度等級**: ${result.data!.depth}\n` +
                `**處理時間**: ${result.metadata?.processingTime || 0}ms\n` +
                `**信心度**: ${result.data!.metadata.confidence}%\n\n` +
                `## 概要\n${result.data!.content.summary}\n\n` +
                `## 關鍵要點\n${result.data!.content.keyPoints.map((p, i) => `${i+1}. ${p}`).join('\n')}\n\n` +
                `## 詳細內容\n${result.data!.content.detailedSections.map(s => 
                  `### ${s.title}\n${s.content}`).join('\n\n')}\n\n` +
                `## 資料來源\n` +
                result.data!.sources.map(s => `- **${s.source}**: ${s.contribution}% 貢獻度, 品質評分 ${s.quality}/10`).join('\n')
        }
      ]
    };
  }

  private async handleCuttingEdgeResearch(args: any) {
    // 使用深度研究搜索獲取前沿研究
    const result = await this.knowledgeService.deepResearchSearch(args.topic);
    return {
      content: [
        {
          type: 'text',
          text: `🚀 Cutting Edge Research: ${args.topic}\n\n` +
                (result.success ? 
                  `**處理時間**: ${result.metadata?.processingTime || 0}ms\n\n` +
                  `## 前沿研究發現\n${result.data!.content.summary}\n\n` +
                  `## 重要論文\n${result.data!.content.detailedSections.map(s => s.content).join('\n\n')}` :
                  `研究搜索失敗: ${result.error?.message}`)
        }
      ]
    };
  }

  private async handleLiteratureReview(args: any) {
    const request = {
      topic: args.topic,
      depth: 'academic' as KnowledgeDepth,
      timeLimit: 30,
      sources: ['arxiv', 'semanticscholar'] as KnowledgeSource[],
      format: 'summary' as OutputFormat,
      purpose: 'research' as ContentPurpose,
      languages: ['zh', 'en']
    };
    const result = await this.knowledgeService.multiSourceSummary(request);
    return {
      content: [
        {
          type: 'text',
          text: `📚 Literature Review: ${args.topic}\n\n` +
                (result.success ? 
                  `**學術深度**: ${result.data!.depth}\n` +
                  `**文獻來源**: ${result.data!.sources.length} 個\n\n` +
                  `## 文獻綜述\n${result.data!.content.summary}\n\n` +
                  `## 主要研究方向\n${result.data!.content.detailedSections.map(s => 
                    `### ${s.title}\n${s.content}`).join('\n\n')}` :
                  `文獻綜述生成失敗: ${result.error?.message}`)
        }
      ]
    };
  }

  private async handleResearchGaps(args: any) {
    const result = await this.knowledgeService.deepResearchSearch(args.topic);
    return {
      content: [
        {
          type: 'text',
          text: `🔍 Research Gaps Analysis: ${args.topic}\n\n` +
                (result.success ? 
                  `## 研究現狀\n${result.data!.content.summary}\n\n` +
                  `## 潛在研究空白\n基於當前文獻分析，以下領域可能存在研究機會：\n` +
                  `${result.data!.content.keyPoints.map(p => `- ${p}`).join('\n')}` :
                  `研究空白分析失敗: ${result.error?.message}`)
        }
      ]
    };
  }

  private async handleCrossReference(args: any) {
    const result = await this.knowledgeService.quickKnowledgeOverview(args.mainTopic);
    return {
      content: [
        {
          type: 'text',
          text: `🔗 Cross Reference Topics: ${args.mainTopic}\n\n` +
                (result.success ? 
                  `## 主題概述\n${result.data!.content.summary}\n\n` +
                  `## 相關領域連接\n${result.data!.content.relatedTopics.map(t => `- ${t}`).join('\n')}` :
                  `交叉引用分析失敗: ${result.error?.message}`)
        }
      ]
    };
  }

  private async handleKeyInsights(args: any) {
    const result = await this.knowledgeService.quickKnowledgeOverview(args.topic);
    return {
      content: [
        {
          type: 'text',
          text: `💡 Key Insights: ${args.topic}\n\n` +
                (result.success ? 
                  `## 核心洞察\n${result.data!.content.summary}\n\n` +
                  `## 關鍵要點\n${result.data!.content.keyPoints.map((p, i) => `${i+1}. ${p}`).join('\n')}` :
                  `關鍵洞察提取失敗: ${result.error?.message}`)
        }
      ]
    };
  }

  private async handleComparePerspectives(args: any) {
    const result = await this.knowledgeService.quickKnowledgeOverview(args.topic);
    return {
      content: [
        {
          type: 'text',
          text: `🔄 Compare Perspectives: ${args.topic}\n\n` +
                (result.success ? 
                  `## 基礎概念\n${result.data!.content.summary}\n\n` +
                  `## 不同視角\n- 學術視角：基於研究文獻的分析\n- 實用視角：現實應用和影響\n- 發展視角：歷史演進和未來趨勢` :
                  `觀點比較分析失敗: ${result.error?.message}`)
        }
      ]
    };
  }

  private async handleTextStructureAnalysis(args: any) {
    const result = await this.textProcessingService.processText(args.text, 'user-input');
    
    // 根據 analysisTypes 過濾結果
    const analysisTypes = args.analysisTypes || ['sections', 'keywords', 'concepts'];
    
    if (!result.success) {
      throw new McpError(ErrorCode.InternalError, result.error?.message || 'Text analysis failed');
    }

    return {
      content: [
        {
          type: 'text',
          text: `📄 Text Structure Analysis\n\n` +
                `**處理時間**: ${result.metadata?.processingTime || 0}ms\n` +
                `**分析類型**: ${analysisTypes.join(', ')}\n\n` +
                (analysisTypes.includes('sections') && result.data?.sections ? 
                  `## 章節結構\n${result.data.sections.map((s, i) => `${i+1}. ${s.title}`).join('\n')}\n\n` : '') +
                (analysisTypes.includes('keywords') && result.data?.keywords ? 
                  `## 關鍵詞\n${result.data.keywords.map((k: any) => `- ${k.term} (${k.weight?.toFixed(2) || 'N/A'})`).join('\n')}\n\n` : '') +
                (analysisTypes.includes('concepts') && result.data?.conceptMap ? 
                  `## 概念圖\n${(result.data.conceptMap as any).concepts?.map((c: any) => `- ${c.name}: ${c.description}`).join('\n') || 'No concepts available'}\n\n` : '') +
                (analysisTypes.includes('summaries') && result.data?.summaries ? 
                  `## 多層摘要\n${Object.entries(result.data.summaries).map(([level, summary]) => 
                    `### ${level}\n${summary}`).join('\n\n')}` : '')
        }
      ]
    };
  }

  private async handleSourceCorrelation(args: any) {
    const result = await this.correlationService.correlateContent(args.sources);
    
    if (!result.success) {
      throw new McpError(ErrorCode.InternalError, result.error?.message || 'Source correlation failed');
    }

    return {
      content: [
        {
          type: 'text',
          text: `🔗 Source Correlation Analysis\n\n` +
                `**處理時間**: ${result.metadata?.processingTime || 0}ms\n` +
                `**信心度**: ${(result.data!.credibility.overall * 100).toFixed(1)}%\n\n` +
                `## 實體對齊\n識別了 ${result.data!.entities.length} 個跨源實體\n` +
                result.data!.entities.map(e => `- ${e.mainName} (${e.entityType}): ${(e.confidence * 100).toFixed(1)}%`).join('\n') + '\n\n' +
                `## 時間軸整合\n${result.data!.timeline.length} 個時間事件\n\n` +
                `## 觀點比較\n${result.data!.perspectives.length} 個主題的觀點分析\n\n` +
                `## 可信度評估\n整體可信度: ${(result.data!.credibility.overall * 100).toFixed(1)}%`
        }
      ]
    };
  }

  private setupErrorHandling(): void {
    this.server.onerror = (error) => {
      console.error('[MCP Error]', error);
    };

    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Academic Knowledge MCP Server v3.0 running on stdio');
  }
}

const server = new AcademicKnowledgeMCPServer();
server.run().catch(console.error);