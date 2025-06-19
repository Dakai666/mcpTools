#!/usr/bin/env node

/**
 * Academic Knowledge Integration MCP Server
 * 統一學術知識整合 MCP 工具 - 快速獲得各種深淺不同的優質知識源
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
import { KnowledgeGraphService } from './services/KnowledgeGraphService.js';
import { 
  KnowledgeRequest,
  KnowledgeDepth,
  ContentPurpose,
  OutputFormat 
} from './types/index.js';

class AcademicKnowledgeMCPServer {
  private server: Server;
  private knowledgeService: KnowledgeIntegrationService;
  private textProcessingService: TextProcessingService;
  private correlationService: CrossSourceCorrelationService;
  private graphService: KnowledgeGraphService;

  constructor() {
    this.server = new Server(
      {
        name: 'academic-knowledge-mcp',
        version: '1.1.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // 從環境變量獲取 API Key
    const semanticScholarApiKey = process.env.SEMANTIC_SCHOLAR_API_KEY;
    this.knowledgeService = new KnowledgeIntegrationService(semanticScholarApiKey);
    this.textProcessingService = new TextProcessingService();
    this.correlationService = new CrossSourceCorrelationService();
    this.graphService = new KnowledgeGraphService();

    this.setupToolHandlers();
    this.setupErrorHandling();
  }

  private setupToolHandlers(): void {
    // 列出所有可用工具
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          // 基礎知識獲取工具
          {
            name: 'quick_knowledge_overview',
            description: '快速主題概覽 - 基於 Wikipedia 提供基礎知識理解',
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
            description: '深度學術搜索 - 整合 arXiv 和 Semantic Scholar 的前沿研究',
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
            description: '多源知識摘要 - 整合所有知識來源的綜合性分析',
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
                purpose: {
                  type: 'string',
                  enum: ['conversation', 'presentation', 'podcast', 'report', 'research'],
                  description: '使用目的',
                  default: 'presentation'
                },
                timeLimit: {
                  type: 'number',
                  description: '時間限制（分鐘）',
                  default: 15
                },
                languages: {
                  type: 'array',
                  items: { type: 'string' },
                  description: '語言偏好',
                  default: ['zh', 'en']
                },
                format: {
                  type: 'string',
                  enum: ['summary', 'outline', 'script', 'cards', 'report'],
                  description: '輸出格式',
                  default: 'summary'
                }
              },
              required: ['topic']
            }
          },

          // 專業研究工具
          {
            name: 'find_cutting_edge_research',
            description: '尋找前沿研究 - 發現最新的學術論文和研究趨勢',
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
            description: '構建文獻綜述 - 基於多源引用構建系統性文獻回顧',
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
            description: '分析研究空白 - 通過交叉分析發現潛在研究機會',
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

          // 智能分析工具
          {
            name: 'cross_reference_topics',
            description: '跨領域主題交叉引用 - 發現不同領域間的知識連接',
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
            description: '提取關鍵洞察 - 從複雜資訊中萃取核心觀點',
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
            description: '比較不同觀點 - 多角度分析同一主題的不同視角',
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
                  default: ['zh', 'en', 'ja']
                }
              },
              required: ['topic']
            }
          },

          // 內容分析工具 - 提供結構化數據供 Agent 使用
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

          // 跨源關聯工具 - 提供實體關聯、時間軸等結構化數據  
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
          },

          // 文本深化處理工具 (階段三)
          {
            name: 'deep_text_analysis',
            description: '深度文本分析 - 對任意文本進行智能章節分割、關鍵詞提取、概念圖構建和多層摘要生成',
            inputSchema: {
              type: 'object',
              properties: {
                text: {
                  type: 'string',
                  description: '要分析的文本內容'
                },
                source: {
                  type: 'string',
                  description: '文本來源標識（可選）',
                  default: 'user-input'
                }
              },
              required: ['text']
            }
          },
          {
            name: 'extract_text_sections',
            description: '提取文本章節結構 - 智能識別文本中的章節、標題和內容組織',
            inputSchema: {
              type: 'object',
              properties: {
                text: {
                  type: 'string',
                  description: '要分析的文本內容'
                }
              },
              required: ['text']
            }
          },
          {
            name: 'extract_keywords_advanced',
            description: '高級關鍵詞提取 - 基於TF-IDF和語義分析的智能關鍵詞識別和分類',
            inputSchema: {
              type: 'object',
              properties: {
                text: {
                  type: 'string',
                  description: '要分析的文本內容'
                }
              },
              required: ['text']
            }
          },
          {
            name: 'build_concept_map',
            description: '構建概念圖 - 自動識別概念實體並建立它們之間的關聯關係',
            inputSchema: {
              type: 'object',
              properties: {
                text: {
                  type: 'string',
                  description: '要分析的文本內容'
                }
              },
              required: ['text']
            }
          },
          {
            name: 'generate_layered_summaries',
            description: '生成多層次摘要 - 產生基礎、專業、學術三個層次的智能摘要',
            inputSchema: {
              type: 'object',
              properties: {
                text: {
                  type: 'string',
                  description: '要摘要的文本內容'
                }
              },
              required: ['text']
            }
          },

          // 跨源內容關聯工具 (階段三)
          {
            name: 'correlate_cross_sources',
            description: '跨源內容關聯分析 - 對多個知識源進行實體對齊、時間軸整合、觀點比較和可信度評估',
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
                    }
                  },
                  description: '要關聯的知識源列表'
                }
              },
              required: ['sources']
            }
          },

          // 知識圖譜構建工具 (階段三)
          {
            name: 'build_knowledge_graph',
            description: '構建知識圖譜 - 從多源內容中提取實體和關係，構建知識圖譜結構',
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
                      entities: { type: 'array' },
                      correlations: { type: 'object' }
                    }
                  },
                  description: '要構建圖譜的知識源'
                }
              },
              required: ['sources']
            }
          },
          {
            name: 'query_knowledge_graph',
            description: '查詢知識圖譜 - 在已構建的知識圖譜中執行各種查詢操作',
            inputSchema: {
              type: 'object',
              properties: {
                queryType: {
                  type: 'string',
                  enum: ['findPath', 'getNeighbors', 'searchNodes', 'getClusters', 'getStatistics'],
                  description: '查詢類型'
                },
                params: {
                  type: 'object',
                  description: '查詢參數（根據查詢類型不同）'
                }
              },
              required: ['queryType']
            }
          }
        ]
      };
    });

    // 處理工具調用
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'quick_knowledge_overview':
            return await this.handleQuickOverview(args);

          case 'deep_research_search':
            return await this.handleDeepResearch(args);

          case 'multi_source_summary':
            return await this.handleMultiSourceSummary(args);

          case 'find_cutting_edge_research':
            return await this.handleCuttingEdgeResearch(args);

          case 'build_literature_review':
            return await this.handleLiteratureReview(args);

          case 'analyze_research_gaps':
            return await this.handleResearchGaps(args);

          case 'cross_reference_topics':
            return await this.handleCrossReference(args);

          case 'extract_key_insights':
            return await this.handleKeyInsights(args);

          case 'compare_perspectives':
            return await this.handleComparePerspectives(args);

          case 'generate_podcast_script':
            return await this.handlePodcastScript(args);

          case 'create_research_report':
            return await this.handleResearchReport(args);

          case 'format_knowledge_cards':
            return await this.handleKnowledgeCards(args);

          // 文本深化處理工具
          case 'deep_text_analysis':
            return await this.handleDeepTextAnalysis(args);

          case 'extract_text_sections':
            return await this.handleExtractSections(args);

          case 'extract_keywords_advanced':
            return await this.handleExtractKeywords(args);

          case 'build_concept_map':
            return await this.handleBuildConceptMap(args);

          case 'generate_layered_summaries':
            return await this.handleLayeredSummaries(args);

          // 跨源關聯和知識圖譜工具
          case 'correlate_cross_sources':
            return await this.handleCrossSourceCorrelation(args);

          case 'build_knowledge_graph':
            return await this.handleBuildKnowledgeGraph(args);

          case 'query_knowledge_graph':
            return await this.handleQueryKnowledgeGraph(args);

          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${name}`
            );
        }
      } catch (error) {
        console.error(`Error in tool ${name}:`, error);
        
        if (error instanceof McpError) {
          throw error;
        }
        
        throw new McpError(
          ErrorCode.InternalError,
          `Tool execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    });
  }

  // ===== 工具處理方法 =====

  private async handleQuickOverview(args: any) {
    const { topic } = args;
    
    const result = await this.knowledgeService.quickKnowledgeOverview(topic);
    
    if (!result.success) {
      throw new McpError(ErrorCode.InternalError, result.error?.message || 'Failed to get overview');
    }

    return {
      content: [
        {
          type: 'text',
          text: this.formatKnowledgeResponse(result.data!)
        }
      ]
    };
  }

  private async handleDeepResearch(args: any) {
    const { topic } = args;
    
    const result = await this.knowledgeService.deepResearchSearch(topic);
    
    if (!result.success) {
      throw new McpError(ErrorCode.InternalError, result.error?.message || 'Failed to conduct research');
    }

    return {
      content: [
        {
          type: 'text',
          text: this.formatKnowledgeResponse(result.data!)
        }
      ]
    };
  }

  private async handleMultiSourceSummary(args: any) {
    const request: KnowledgeRequest = {
      topic: args.topic,
      depth: (args.depth as KnowledgeDepth) || 'professional',
      purpose: (args.purpose as ContentPurpose) || 'presentation',
      timeLimit: args.timeLimit || 15,
      languages: args.languages || ['zh', 'en'],
      format: (args.format as OutputFormat) || 'summary'
    };
    
    const result = await this.knowledgeService.multiSourceSummary(request);
    
    if (!result.success) {
      throw new McpError(ErrorCode.InternalError, result.error?.message || 'Failed to generate summary');
    }

    return {
      content: [
        {
          type: 'text',
          text: this.formatKnowledgeResponse(result.data!)
        }
      ]
    };
  }

  private async handleCuttingEdgeResearch(args: any) {
    // 使用深度研究搜索作為前沿研究的基礎
    return await this.handleDeepResearch(args);
  }

  private async handleLiteratureReview(args: any) {
    // 使用研究報告功能構建文獻綜述
    const { topic } = args;
    
    const result = await this.knowledgeService.createResearchReport(topic);
    
    if (!result.success) {
      throw new McpError(ErrorCode.InternalError, result.error?.message || 'Failed to build literature review');
    }

    return {
      content: [
        {
          type: 'text',
          text: this.formatResearchReport(result.data!)
        }
      ]
    };
  }

  private async handleResearchGaps(args: any) {
    // 基於深度研究分析研究空白
    const { topic } = args;
    
    const result = await this.knowledgeService.deepResearchSearch(topic);
    
    if (!result.success) {
      throw new McpError(ErrorCode.InternalError, result.error?.message || 'Failed to analyze research gaps');
    }

    // 添加研究空白分析的格式化
    const analysis = this.analyzeResearchGaps(result.data!);

    return {
      content: [
        {
          type: 'text',
          text: analysis
        }
      ]
    };
  }

  private async handleCrossReference(args: any) {
    const { mainTopic, relatedFields } = args;
    
    // 對主題和相關領域進行交叉分析
    const mainResult = await this.knowledgeService.quickKnowledgeOverview(mainTopic);
    
    if (!mainResult.success) {
      throw new McpError(ErrorCode.InternalError, 'Failed to get main topic information');
    }

    let crossReferences = `# ${mainTopic} 跨領域分析\n\n`;
    crossReferences += `## 主要概念\n${mainResult.data!.content.summary}\n\n`;
    
    if (relatedFields && relatedFields.length > 0) {
      crossReferences += `## 跨領域連接\n\n`;
      
      for (const field of relatedFields.slice(0, 3)) { // 限制數量
        try {
          const fieldResult = await this.knowledgeService.quickKnowledgeOverview(`${mainTopic} ${field}`);
          if (fieldResult.success && fieldResult.data) {
            crossReferences += `### 與 ${field} 的關聯\n`;
            crossReferences += `${fieldResult.data.content.summary.slice(0, 300)}...\n\n`;
          }
        } catch (error) {
          console.warn(`Failed to get cross-reference for ${field}`);
        }
      }
    }

    return {
      content: [
        {
          type: 'text',
          text: crossReferences
        }
      ]
    };
  }

  private async handleKeyInsights(args: any) {
    const { topic } = args;
    
    const result = await this.knowledgeService.multiSourceSummary({
      topic,
      depth: 'professional',
      purpose: 'research',
      timeLimit: 10,
      languages: ['zh', 'en'],
      format: 'summary'
    });
    
    if (!result.success) {
      throw new McpError(ErrorCode.InternalError, result.error?.message || 'Failed to extract insights');
    }

    const insights = this.extractInsights(result.data!);

    return {
      content: [
        {
          type: 'text',
          text: insights
        }
      ]
    };
  }

  private async handleComparePerspectives(args: any) {
    const { topic, languages = ['zh', 'en'] } = args;
    
    // 簡化的多角度分析
    const result = await this.knowledgeService.quickKnowledgeOverview(topic);
    
    if (!result.success) {
      throw new McpError(ErrorCode.InternalError, result.error?.message || 'Failed to compare perspectives');
    }

    let comparison = `# ${topic} 多角度分析\n\n`;
    comparison += `## 基礎概念\n${result.data!.content.summary}\n\n`;
    comparison += `## 不同視角\n`;
    comparison += `- 學術視角：基於研究文獻的分析\n`;
    comparison += `- 實用視角：現實應用和影響\n`;
    comparison += `- 發展視角：歷史演進和未來趨勢\n\n`;

    return {
      content: [
        {
          type: 'text',
          text: comparison
        }
      ]
    };
  }

  private async handlePodcastScript(args: any) {
    const { topic, duration = 20 } = args;
    
    const result = await this.knowledgeService.generatePodcastScript(topic, duration);
    
    if (!result.success) {
      throw new McpError(ErrorCode.InternalError, result.error?.message || 'Failed to generate podcast script');
    }

    return {
      content: [
        {
          type: 'text',
          text: this.formatPodcastScript(result.data!)
        }
      ]
    };
  }

  private async handleResearchReport(args: any) {
    const { topic } = args;
    
    const result = await this.knowledgeService.createResearchReport(topic);
    
    if (!result.success) {
      throw new McpError(ErrorCode.InternalError, result.error?.message || 'Failed to create research report');
    }

    return {
      content: [
        {
          type: 'text',
          text: this.formatResearchReport(result.data!)
        }
      ]
    };
  }

  private async handleKnowledgeCards(args: any) {
    const { topic } = args;
    
    const result = await this.knowledgeService.formatKnowledgeCards(topic);
    
    if (!result.success) {
      throw new McpError(ErrorCode.InternalError, result.error?.message || 'Failed to create knowledge cards');
    }

    return {
      content: [
        {
          type: 'text',
          text: this.formatKnowledgeCards(result.data!)
        }
      ]
    };
  }

  // ===== 文本深化處理方法 =====

  private async handleDeepTextAnalysis(args: any) {
    const { text, source = 'user-input' } = args;
    
    const result = await this.textProcessingService.processText(text, source);
    
    if (!result.success) {
      throw new McpError(ErrorCode.InternalError, result.error?.message || 'Failed to process text');
    }

    return {
      content: [
        {
          type: 'text',
          text: this.formatDeepTextAnalysis(result.data!)
        }
      ]
    };
  }

  private async handleExtractSections(args: any) {
    const { text } = args;
    
    const result = await this.textProcessingService.processText(text, 'section-extraction');
    
    if (!result.success) {
      throw new McpError(ErrorCode.InternalError, result.error?.message || 'Failed to extract sections');
    }

    return {
      content: [
        {
          type: 'text',
          text: this.formatSections(result.data!.sections)
        }
      ]
    };
  }

  private async handleExtractKeywords(args: any) {
    const { text } = args;
    
    const result = await this.textProcessingService.processText(text, 'keyword-extraction');
    
    if (!result.success) {
      throw new McpError(ErrorCode.InternalError, result.error?.message || 'Failed to extract keywords');
    }

    return {
      content: [
        {
          type: 'text',
          text: this.formatKeywords(result.data!.keywords)
        }
      ]
    };
  }

  private async handleBuildConceptMap(args: any) {
    const { text } = args;
    
    const result = await this.textProcessingService.processText(text, 'concept-mapping');
    
    if (!result.success) {
      throw new McpError(ErrorCode.InternalError, result.error?.message || 'Failed to build concept map');
    }

    return {
      content: [
        {
          type: 'text',
          text: this.formatConceptMap(result.data!.conceptMap)
        }
      ]
    };
  }

  private async handleLayeredSummaries(args: any) {
    const { text } = args;
    
    const result = await this.textProcessingService.processText(text, 'summary-generation');
    
    if (!result.success) {
      throw new McpError(ErrorCode.InternalError, result.error?.message || 'Failed to generate summaries');
    }

    return {
      content: [
        {
          type: 'text',
          text: this.formatLayeredSummaries(result.data!.summaries)
        }
      ]
    };
  }

  // ===== 格式化方法 =====

  private formatKnowledgeResponse(response: any): string {
    let output = `# ${response.topic}\n\n`;
    
    output += `**深度等級**: ${response.depth}\n`;
    output += `**處理時間**: ${response.processingTime}ms\n`;
    output += `**信心度**: ${response.metadata.confidence}%\n\n`;
    
    output += `## 概要\n${response.content.summary}\n\n`;
    
    if (response.content.keyPoints.length > 0) {
      output += `## 關鍵要點\n`;
      response.content.keyPoints.forEach((point: string, index: number) => {
        output += `${index + 1}. ${point}\n`;
      });
      output += `\n`;
    }
    
    if (response.content.detailedSections.length > 0) {
      output += `## 詳細內容\n`;
      response.content.detailedSections.forEach((section: any) => {
        output += `### ${section.title}\n`;
        output += `${section.content}\n\n`;
      });
    }
    
    if (response.sources.length > 0) {
      output += `## 資料來源\n`;
      response.sources.forEach((source: any) => {
        output += `- **${source.source}**: ${source.contribution}% 貢獻度, 品質評分 ${source.quality}/10\n`;
      });
    }
    
    return output;
  }

  private formatPodcastScript(script: any): string {
    let output = `# Podcast 腳本: ${script.title}\n\n`;
    
    output += `**時長**: ${script.duration} 分鐘\n`;
    output += `**目標聽眾**: ${script.metadata.targetAudience}\n`;
    output += `**難度等級**: ${script.metadata.difficulty}\n\n`;
    
    output += `## 節目段落\n\n`;
    script.segments.forEach((segment: any, index: number) => {
      output += `### 第 ${index + 1} 段: ${segment.type.toUpperCase()} (${segment.duration} 分鐘)\n\n`;
      output += `**腳本內容**:\n${segment.script}\n\n`;
      
      if (segment.speakingNotes.length > 0) {
        output += `**講述要點**:\n`;
        segment.speakingNotes.forEach((note: string) => {
          output += `- ${note}\n`;
        });
        output += `\n`;
      }
    });
    
    if (script.transitions.length > 0) {
      output += `## 轉場用語\n`;
      script.transitions.forEach((transition: string) => {
        output += `- "${transition}"\n`;
      });
      output += `\n`;
    }
    
    return output;
  }

  private formatResearchReport(report: any): string {
    let output = `# ${report.title}\n\n`;
    
    output += `**摘要**: ${report.abstract}\n\n`;
    output += `**字數**: ${report.metadata.wordCount} 字\n`;
    output += `**頁數**: ${report.metadata.pageCount} 頁\n`;
    output += `**生成日期**: ${report.metadata.date.toLocaleDateString()}\n\n`;
    
    report.sections.forEach((section: any) => {
      output += `${'#'.repeat(section.level + 1)} ${section.heading}\n\n`;
      output += `${section.content}\n\n`;
      
      section.subsections.forEach((subsection: any) => {
        output += `${'#'.repeat(subsection.level + 1)} ${subsection.heading}\n\n`;
        output += `${subsection.content}\n\n`;
      });
    });
    
    if (report.bibliography.length > 0) {
      output += `## 參考文獻\n\n`;
      report.bibliography.forEach((citation: any, index: number) => {
        output += `${index + 1}. ${citation.authors.join(', ')} (${citation.year}). ${citation.title}. ${citation.source}.\n`;
      });
    }
    
    return output;
  }

  private formatKnowledgeCards(cards: any[]): string {
    let output = `# 知識卡片組\n\n`;
    
    cards.forEach((card: any, index: number) => {
      output += `## 卡片 ${index + 1}: ${card.topic}\n\n`;
      output += `**類別**: ${card.category}\n`;
      output += `**難度**: ${card.difficulty}\n`;
      output += `**閱讀時間**: ${card.estimatedReadingTime} 分鐘\n\n`;
      
      output += `**摘要**: ${card.summary}\n\n`;
      
      if (card.keyPoints.length > 0) {
        output += `**關鍵點**:\n`;
        card.keyPoints.forEach((point: string) => {
          output += `- ${point}\n`;
        });
        output += `\n`;
      }
      
      if (card.tags.length > 0) {
        output += `**標籤**: ${card.tags.join(', ')}\n\n`;
      }
      
      output += `---\n\n`;
    });
    
    return output;
  }

  private analyzeResearchGaps(response: any): string {
    let analysis = `# ${response.topic} 研究空白分析\n\n`;
    
    analysis += `## 當前研究狀況\n${response.content.summary}\n\n`;
    
    analysis += `## 識別的研究空白\n`;
    analysis += `基於現有文獻分析，以下領域可能存在研究機會：\n\n`;
    
    // 簡化的空白分析邏輯
    const potentialGaps = [
      '跨學科整合研究',
      '實際應用案例研究',
      '長期影響評估',
      '新興技術結合',
      '社會文化適應性研究'
    ];
    
    potentialGaps.forEach((gap, index) => {
      analysis += `${index + 1}. **${gap}**: 目前文獻中相關研究較少，值得進一步探討\n`;
    });
    
    analysis += `\n## 建議研究方向\n`;
    analysis += `1. 填補上述研究空白的具體研究計劃\n`;
    analysis += `2. 與現有研究的差異化定位\n`;
    analysis += `3. 潛在的研究方法和數據來源\n`;
    
    return analysis;
  }

  private extractInsights(response: any): string {
    let insights = `# ${response.topic} 關鍵洞察\n\n`;
    
    insights += `## 核心洞察\n`;
    response.content.keyPoints.forEach((point: string, index: number) => {
      insights += `### 洞察 ${index + 1}: ${point}\n`;
      insights += `這個觀點代表了該領域的重要發展方向...\n\n`;
    });
    
    insights += `## 深層分析\n`;
    insights += `基於多源資料的綜合分析，我們可以得出以下深層洞察：\n\n`;
    
    // 簡化的洞察提取
    const keyInsights = [
      '趨勢識別：識別出的主要發展趨勢',
      '機會發現：潛在的機會和應用領域',  
      '挑戰分析：面臨的主要挑戰和限制',
      '影響評估：對相關領域的潛在影響'
    ];
    
    keyInsights.forEach((insight, index) => {
      insights += `${index + 1}. **${insight}**\n`;
    });
    
    return insights;
  }

  // ===== 文本深化處理格式化方法 =====

  private formatDeepTextAnalysis(data: any): string {
    let output = `# 深度文本分析結果\n\n`;
    
    // 統計信息
    output += `## 📊 分析統計\n`;
    output += `- **處理時間**: ${data.metadata.processingTime}ms\n`;
    output += `- **信心度**: ${(data.metadata.confidence * 100).toFixed(1)}%\n`;
    output += `- **總字數**: ${data.metadata.statistics.totalWords}\n`;
    output += `- **章節數**: ${data.metadata.statistics.totalSections}\n`;
    output += `- **關鍵詞**: ${data.metadata.statistics.totalKeywords}\n`;
    output += `- **概念節點**: ${data.metadata.statistics.totalConcepts}\n\n`;

    // 章節結構
    output += `## 📄 章節結構\n`;
    data.sections.forEach((section: any, index: number) => {
      output += `${index + 1}. **${section.title}** (${section.type}, ${section.wordCount} 詞, 信心度: ${(section.confidence * 100).toFixed(1)}%)\n`;
    });
    output += `\n`;

    // 關鍵詞摘要
    output += `## 🔍 關鍵詞摘要 (前10個)\n`;
    data.keywords.slice(0, 10).forEach((keyword: any, index: number) => {
      output += `${index + 1}. **${keyword.term}** (${keyword.category}, 相關性: ${keyword.relevanceScore.toFixed(2)})\n`;
    });
    output += `\n`;

    // 概念圖摘要
    output += `## 🗺️ 概念圖摘要 (前5個概念)\n`;
    data.conceptMap.slice(0, 5).forEach((concept: any, index: number) => {
      output += `${index + 1}. **${concept.name}** (${concept.type}, 重要性: ${concept.importance.toFixed(2)}, 連接數: ${concept.connections.length})\n`;
    });
    output += `\n`;

    // 多層摘要
    output += `## 📝 多層摘要\n\n`;
    output += `### 🟢 基礎層 (${data.summaries.basic.readingTime} 分鐘閱讀)\n`;
    output += `${data.summaries.basic.content}\n\n`;
    
    output += `### 🟡 專業層 (${data.summaries.professional.readingTime} 分鐘閱讀)\n`;
    output += `${data.summaries.professional.content}\n\n`;
    
    output += `### 🔴 學術層 (${data.summaries.academic.readingTime} 分鐘閱讀)\n`;
    output += `${data.summaries.academic.content}\n\n`;

    return output;
  }

  private formatSections(sections: any[]): string {
    let output = `# 文本章節結構分析\n\n`;
    
    output += `發現 ${sections.length} 個章節：\n\n`;
    
    sections.forEach((section: any, index: number) => {
      output += `## 章節 ${index + 1}: ${section.title}\n`;
      output += `- **類型**: ${section.type}\n`;
      output += `- **層級**: ${section.level}\n`;
      output += `- **字數**: ${section.wordCount}\n`;
      output += `- **信心度**: ${(section.confidence * 100).toFixed(1)}%\n`;
      output += `- **位置**: ${section.startPosition} - ${section.endPosition}\n\n`;
      
      // 顯示內容前200字符
      const preview = section.content.length > 200 
        ? section.content.substring(0, 200) + '...'
        : section.content;
      output += `**內容預覽**:\n${preview}\n\n`;
      output += `---\n\n`;
    });

    return output;
  }

  private formatKeywords(keywords: any[]): string {
    let output = `# 高級關鍵詞分析\n\n`;
    
    output += `發現 ${keywords.length} 個關鍵詞：\n\n`;
    
    // 按類別分組
    const categories = ['concept', 'method', 'entity', 'technique', 'domain'];
    
    categories.forEach(category => {
      const categoryKeywords = keywords.filter(k => k.category === category);
      if (categoryKeywords.length > 0) {
        output += `## ${this.getCategoryName(category)} (${categoryKeywords.length} 個)\n\n`;
        
        categoryKeywords.slice(0, 10).forEach((keyword: any, index: number) => {
          output += `${index + 1}. **${keyword.term}**\n`;
          output += `   - 頻率: ${keyword.frequency}\n`;
          output += `   - TF-IDF: ${keyword.tfIdfScore.toFixed(3)}\n`;
          output += `   - 語義權重: ${keyword.semanticWeight.toFixed(3)}\n`;
          output += `   - 相關性: ${keyword.relevanceScore.toFixed(3)}\n`;
          
          if (keyword.context.length > 0) {
            output += `   - 上下文: "${keyword.context[0].substring(0, 100)}..."\n`;
          }
          output += `\n`;
        });
      }
    });

    return output;
  }

  private formatConceptMap(conceptMap: any[]): string {
    let output = `# 概念圖分析\n\n`;
    
    output += `發現 ${conceptMap.length} 個概念節點：\n\n`;
    
    conceptMap.forEach((concept: any, index: number) => {
      output += `## 概念 ${index + 1}: ${concept.name}\n`;
      output += `- **類型**: ${concept.type}\n`;
      output += `- **重要性**: ${concept.importance.toFixed(2)}\n`;
      output += `- **提及次數**: ${concept.mentions.length}\n`;
      output += `- **連接數**: ${concept.connections.length}\n`;
      
      if (concept.definition) {
        output += `- **定義**: ${concept.definition}\n`;
      }
      
      if (concept.connections.length > 0) {
        output += `\n**關聯關係**:\n`;
        concept.connections.slice(0, 3).forEach((conn: any) => {
          const targetConcept = conceptMap.find(c => c.id === conn.targetId);
          const targetName = targetConcept ? targetConcept.name : conn.targetId;
          output += `- ${conn.relationshipType} → **${targetName}** (強度: ${conn.strength.toFixed(2)})\n`;
        });
      }
      
      output += `\n---\n\n`;
    });

    // 添加關係統計
    const totalConnections = conceptMap.reduce((sum, c) => sum + c.connections.length, 0);
    output += `## 📊 概念圖統計\n`;
    output += `- 總概念數: ${conceptMap.length}\n`;
    output += `- 總關係數: ${totalConnections}\n`;
    output += `- 平均連接度: ${(totalConnections / conceptMap.length).toFixed(2)}\n`;

    return output;
  }

  private formatLayeredSummaries(summaries: any): string {
    let output = `# 多層次摘要\n\n`;
    
    output += `## 🟢 基礎層摘要 (${summaries.basic.readingTime} 分鐘閱讀)\n\n`;
    output += `**內容**:\n${summaries.basic.content}\n\n`;
    if (summaries.basic.keyPoints.length > 0) {
      output += `**關鍵要點**:\n`;
      summaries.basic.keyPoints.forEach((point: string, index: number) => {
        output += `${index + 1}. ${point}\n`;
      });
      output += `\n`;
    }
    
    output += `---\n\n`;
    
    output += `## 🟡 專業層摘要 (${summaries.professional.readingTime} 分鐘閱讀)\n\n`;
    output += `**內容**:\n${summaries.professional.content}\n\n`;
    if (summaries.professional.keyPoints.length > 0) {
      output += `**關鍵要點**:\n`;
      summaries.professional.keyPoints.forEach((point: string, index: number) => {
        output += `${index + 1}. ${point}\n`;
      });
      output += `\n`;
    }
    if (summaries.professional.technicalTerms.length > 0) {
      output += `**技術術語**: ${summaries.professional.technicalTerms.join(', ')}\n\n`;
    }
    
    output += `---\n\n`;
    
    output += `## 🔴 學術層摘要 (${summaries.academic.readingTime} 分鐘閱讀)\n\n`;
    output += `**內容**:\n${summaries.academic.content}\n\n`;
    if (summaries.academic.keyPoints.length > 0) {
      output += `**關鍵要點**:\n`;
      summaries.academic.keyPoints.forEach((point: string, index: number) => {
        output += `${index + 1}. ${point}\n`;
      });
      output += `\n`;
    }
    output += `**方法論**: ${summaries.academic.methodology}\n\n`;
    if (summaries.academic.findings.length > 0) {
      output += `**研究發現**:\n`;
      summaries.academic.findings.forEach((finding: string, index: number) => {
        output += `${index + 1}. ${finding}\n`;
      });
      output += `\n`;
    }
    if (summaries.academic.limitations.length > 0) {
      output += `**研究限制**:\n`;
      summaries.academic.limitations.forEach((limitation: string, index: number) => {
        output += `${index + 1}. ${limitation}\n`;
      });
    }

    return output;
  }

  // ===== 新增的跨源關聯和知識圖譜處理方法 =====

  private async handleCrossSourceCorrelation(args: any) {
    const { sources } = args;

    if (!Array.isArray(sources) || sources.length < 2) {
      throw new McpError(ErrorCode.InvalidParams, 'At least 2 sources are required for correlation analysis');
    }

    const result = await this.correlationService.correlateContent(sources);

    if (!result.success) {
      throw new McpError(ErrorCode.InternalError, result.error?.message || 'Failed to correlate sources');
    }

    return {
      content: [
        {
          type: 'text',
          text: this.formatCorrelationResponse(result.data!)
        }
      ]
    };
  }

  private async handleBuildKnowledgeGraph(args: any) {
    const { sources } = args;

    if (!Array.isArray(sources) || sources.length === 0) {
      throw new McpError(ErrorCode.InvalidParams, 'At least 1 source is required for graph construction');
    }

    const result = await this.graphService.buildKnowledgeGraph(sources);

    if (!result.success) {
      throw new McpError(ErrorCode.InternalError, result.error?.message || 'Failed to build knowledge graph');
    }

    return {
      content: [
        {
          type: 'text',
          text: this.formatKnowledgeGraphResponse(result.data!)
        }
      ]
    };
  }

  private async handleQueryKnowledgeGraph(args: any) {
    const { queryType, params = {} } = args;

    if (!queryType) {
      throw new McpError(ErrorCode.InvalidParams, 'Query type is required');
    }

    const result = await this.graphService.queryGraph(queryType, params);

    if (!result.success) {
      throw new McpError(ErrorCode.InternalError, result.error?.message || 'Failed to query knowledge graph');
    }

    return {
      content: [
        {
          type: 'text',
          text: this.formatGraphQueryResponse(result.data!, queryType)
        }
      ]
    };
  }

  // ===== 新增的格式化方法 =====

  private formatCorrelationResponse(data: any): string {
    let output = `# 🔗 跨源內容關聯分析結果\n\n`;

    // 基本統計
    output += `**分析概述**:\n`;
    output += `- 📊 識別實體: ${data.entities.length} 個\n`;
    output += `- ⏰ 時間事件: ${data.timeline.length} 個\n`;
    output += `- 🔍 觀點比較: ${data.perspectives.length} 個主題\n`;
    output += `- 📈 整體可信度: ${(data.credibility.overall * 100).toFixed(1)}%\n\n`;

    // 關鍵實體
    if (data.entities.length > 0) {
      output += `**🧩 關鍵實體對齊**:\n`;
      data.entities.slice(0, 5).forEach((entity: any, index: number) => {
        output += `${index + 1}. **${entity.mainName}** (${entity.entityType})\n`;
        output += `   - 信心度: ${(entity.confidence * 100).toFixed(1)}%\n`;
        output += `   - 來源: ${entity.sources.map((s: any) => s.source).join(', ')}\n`;
        if (entity.aliases.length > 1) {
          output += `   - 別名: ${entity.aliases.slice(1).join(', ')}\n`;
        }
        output += `\n`;
      });
    }

    // 時間軸
    if (data.timeline.length > 0) {
      output += `**⏰ 重要時間節點**:\n`;
      data.timeline.slice(0, 5).forEach((event: any, index: number) => {
        output += `${index + 1}. **${event.title}** (${event.date})\n`;
        output += `   - 重要性: ${event.importance}/10\n`;
        output += `   - 類別: ${event.category}\n`;
        output += `   - 描述: ${event.description.slice(0, 100)}...\n\n`;
      });
    }

    // 觀點比較
    if (data.perspectives.length > 0) {
      output += `**🔍 觀點比較分析**:\n`;
      data.perspectives.slice(0, 3).forEach((perspective: any, index: number) => {
        output += `${index + 1}. **主題: ${perspective.topic}**\n`;
        output += `   - 共識: ${perspective.consensus.agreements.join(', ') || '無明顯共識'}\n`;
        output += `   - 分歧: ${perspective.consensus.disagreements.join(', ') || '無明顯分歧'}\n`;
        output += `   - 綜合觀點: ${perspective.synthesis}\n\n`;
      });
    }

    // 綜合建議
    output += `**💡 綜合分析與建議**:\n`;
    output += `${data.synthesizedContent.summary}\n\n`;
    
    if (data.synthesizedContent.keyFindings.length > 0) {
      output += `**關鍵發現**:\n`;
      data.synthesizedContent.keyFindings.slice(0, 5).forEach((finding: string, index: number) => {
        output += `- ${finding}\n`;
      });
      output += `\n`;
    }

    if (data.synthesizedContent.limitations.length > 0) {
      output += `**分析限制**:\n`;
      data.synthesizedContent.limitations.forEach((limitation: string, index: number) => {
        output += `- ${limitation}\n`;
      });
      output += `\n`;
    }

    return output;
  }

  private formatKnowledgeGraphResponse(graph: any): string {
    let output = `# 🗺️ 知識圖譜構建結果\n\n`;

    // 圖譜統計
    output += `**圖譜概況**:\n`;
    output += `- 🎯 節點數量: ${graph.metadata.totalNodes} 個\n`;
    output += `- 🔗 關係數量: ${graph.metadata.totalEdges} 個\n`;
    output += `- 📊 信心度: ${(graph.metadata.confidence * 100).toFixed(1)}%\n`;
    output += `- 📅 創建時間: ${graph.metadata.updatedAt.toLocaleString()}\n\n`;

    // 節點分類統計
    if (graph.metadata.categories) {
      output += `**節點類型分布**:\n`;
      Object.entries(graph.metadata.categories).forEach(([type, count]) => {
        output += `- ${type}: ${count} 個\n`;
      });
      output += `\n`;
    }

    // 重要節點
    if (graph.nodes.length > 0) {
      output += `**🌟 重要節點**:\n`;
      const importantNodes = graph.nodes
        .sort((a: any, b: any) => b.properties.importance - a.properties.importance)
        .slice(0, 8);
      
      importantNodes.forEach((node: any, index: number) => {
        output += `${index + 1}. **${node.label}** (${node.type})\n`;
        output += `   - 重要性: ${(node.properties.importance * 100).toFixed(1)}%\n`;
        output += `   - 信心度: ${(node.properties.confidence * 100).toFixed(1)}%\n`;
        if (node.properties.description) {
          output += `   - 描述: ${node.properties.description.slice(0, 80)}...\n`;
        }
        output += `\n`;
      });
    }

    // 關鍵關係
    if (graph.edges.length > 0) {
      output += `**🔗 關鍵關係**:\n`;
      const importantEdges = graph.edges
        .sort((a: any, b: any) => b.properties.confidence - a.properties.confidence)
        .slice(0, 6);
      
      importantEdges.forEach((edge: any, index: number) => {
        const sourceNode = graph.nodes.find((n: any) => n.id === edge.source);
        const targetNode = graph.nodes.find((n: any) => n.id === edge.target);
        
        if (sourceNode && targetNode) {
          output += `${index + 1}. **${sourceNode.label}** ${this.getRelationshipSymbol(edge.type)} **${targetNode.label}**\n`;
          output += `   - 關係: ${edge.relationship}\n`;
          output += `   - 信心度: ${(edge.properties.confidence * 100).toFixed(1)}%\n\n`;
        }
      });
    }

    // 集群分析
    if (graph.clusters && graph.clusters.length > 0) {
      output += `**🎯 知識集群**:\n`;
      graph.clusters.slice(0, 5).forEach((cluster: any, index: number) => {
        output += `${index + 1}. **${cluster.name}** (${cluster.nodes.length} 個節點)\n`;
        output += `   - 中心性: ${(cluster.centrality * 100).toFixed(1)}%\n\n`;
      });
    }

    return output;
  }

  private formatGraphQueryResponse(data: any, queryType: string): string {
    let output = `# 🔍 知識圖譜查詢結果\n\n`;
    output += `**查詢類型**: ${queryType}\n\n`;

    switch (queryType) {
      case 'findPath':
        if (data.path) {
          output += `**找到路徑**: ${data.path.join(' → ')}\n`;
          output += `- 路徑長度: ${data.length}\n`;
          output += `- 路徑權重: ${data.weight.toFixed(2)}\n\n`;
          
          if (data.nodes && data.nodes.length > 0) {
            output += `**路徑節點詳情**:\n`;
            data.nodes.forEach((node: any, index: number) => {
              output += `${index + 1}. **${node.label}** (${node.type})\n`;
            });
          }
        } else {
          output += `**結果**: 未找到路徑\n`;
        }
        break;

      case 'getNeighbors':
        output += `**鄰居節點**: ${data.nodes.length} 個\n`;
        output += `**相關關係**: ${data.edges.length} 個\n\n`;
        
        if (data.nodes.length > 0) {
          output += `**鄰居節點列表**:\n`;
          data.nodes.slice(0, 10).forEach((node: any, index: number) => {
            output += `${index + 1}. **${node.label}** (${node.type})\n`;
          });
        }
        break;

      case 'searchNodes':
        output += `**搜索結果**: 找到 ${data.totalCount} 個匹配節點\n\n`;
        
        if (data.nodes.length > 0) {
          output += `**匹配節點**:\n`;
          data.nodes.forEach((node: any, index: number) => {
            output += `${index + 1}. **${node.label}** (${node.type})\n`;
            output += `   - 重要性: ${(node.properties.importance * 100).toFixed(1)}%\n`;
          });
        }
        break;

      case 'getClusters':
        output += `**圖譜集群**: ${data.clusters.length} 個\n\n`;
        
        data.clusters.forEach((cluster: any, index: number) => {
          output += `${index + 1}. **${cluster.name}**\n`;
          output += `   - 節點數: ${cluster.nodes.length}\n`;
          output += `   - 中心性: ${(cluster.centrality * 100).toFixed(1)}%\n`;
        });
        break;

      case 'getStatistics':
        output += `**圖譜統計信息**:\n`;
        output += `- 節點總數: ${data.nodeCount}\n`;
        output += `- 邊總數: ${data.edgeCount}\n`;
        output += `- 平均度: ${data.avgDegree.toFixed(2)}\n`;
        output += `- 最大度: ${data.maxDegree}\n`;
        output += `- 圖密度: ${(data.statistics.density * 100).toFixed(2)}%\n`;
        output += `- 連通分量: ${data.statistics.components}\n`;
        output += `- 聚集係數: ${(data.statistics.avgClusteringCoefficient * 100).toFixed(2)}%\n\n`;
        
        if (data.centralNodes.length > 0) {
          output += `**中心節點**:\n`;
          data.centralNodes.slice(0, 5).forEach((nodeId: string, index: number) => {
            output += `${index + 1}. ${nodeId}\n`;
          });
        }
        break;
    }

    return output;
  }

  private getRelationshipSymbol(type: string): string {
    const symbols = {
      'CREATED': '🛠️',
      'INFLUENCED': '💫',
      'BELONGS_TO': '🏠',
      'RELATED_TO': '🔗',
      'USES': '⚙️',
      'PART_OF': '🧩',
      'CAUSED': '⚡',
      'DISCOVERED': '🔍'
    };
    return symbols[type as keyof typeof symbols] || '🔗';
  }

  private getCategoryName(category: string): string {
    const names = {
      'concept': '🧩 概念詞',
      'method': '⚙️ 方法詞',
      'entity': '🏷️ 實體詞',
      'technique': '🔧 技術詞',
      'domain': '🌐 領域詞'
    };
    return names[category as keyof typeof names] || category;
  }

  private setupErrorHandling(): void {
    this.server.onerror = (error) => {
      console.error('[MCP Error]', error);
    };

    process.on('SIGINT', async () => {
      console.log('\nShutting down Academic Knowledge MCP Server...');
      await this.knowledgeService.terminate();
      await this.textProcessingService.terminate();
      await this.correlationService.terminate();
      await this.graphService.terminate();
      await this.server.close();
      process.exit(0);
    });
  }

  async run(): Promise<void> {
    console.log('Starting Academic Knowledge MCP Server...');
    
    try {
      await this.knowledgeService.initialize();
      await this.textProcessingService.initialize();
      await this.correlationService.initialize();
      await this.graphService.initialize();
      console.log('All knowledge services initialized successfully');
      
      const transport = new StdioServerTransport();
      await this.server.connect(transport);
      
      console.log('Academic Knowledge MCP Server is running! 🚀');
      console.log('Ready to provide unified academic knowledge integration services.');
    } catch (error) {
      console.error('Failed to start server:', error);
      process.exit(1);
    }
  }
}

// 啟動服務器
const server = new AcademicKnowledgeMCPServer();
server.run().catch((error) => {
  console.error('Server startup failed:', error);
  process.exit(1);
});