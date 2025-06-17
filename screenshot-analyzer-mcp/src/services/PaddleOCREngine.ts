import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs/promises';
import { 
  OCRResult, 
  ImageProcessOptions, 
  AnalysisOptions, 
  WordData,
  ParagraphData,
  BlockData,
  BoundingBox 
} from '../types/index.js';

export interface PaddleOCRResult {
  text: string;
  confidence: number;
  bbox: number[][];
}

export class PaddleOCREngine {
  private pythonPath: string;
  private scriptPath: string;
  private isInitialized = false;

  constructor() {
    this.pythonPath = 'python3';
    this.scriptPath = path.join(process.cwd(), 'python_scripts', 'paddle_ocr.py');
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // 檢查並創建 Python 腳本目錄
      const scriptsDir = path.dirname(this.scriptPath);
      await fs.mkdir(scriptsDir, { recursive: true });

      // 創建 PaddleOCR Python 腳本
      await this.createPaddleOCRScript();

      // 檢查 Python 環境和依賴
      await this.checkPythonEnvironment();

      this.isInitialized = true;
      console.log('PaddleOCR Engine initialized successfully');
    } catch (error) {
      console.error('Failed to initialize PaddleOCR Engine:', error);
      throw new Error('PaddleOCR initialization failed: ' + error);
    }
  }

  private async createPaddleOCRScript(): Promise<void> {
    const pythonScript = `#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
PaddleOCR 集成腳本
"""

import sys
import json
import os
import argparse
import traceback
from typing import List, Dict, Any, Tuple
import numpy as np

try:
    from paddleocr import PaddleOCR
    import cv2
    from PIL import Image
except ImportError as e:
    print(json.dumps({
        "error": f"Missing dependencies: {str(e)}",
        "install_command": "pip install paddlepaddle paddleocr opencv-python Pillow"
    }))
    sys.exit(1)

class PaddleOCRProcessor:
    def __init__(self, lang: str = 'ch', use_gpu: bool = False):
        try:
            self.ocr = PaddleOCR(
                use_angle_cls=True,
                lang=lang,
                use_gpu=use_gpu,
                show_log=False,
                det_db_thresh=0.3,
                det_db_box_thresh=0.5,
                det_db_unclip_ratio=1.6,
                rec_batch_num=6,
                max_text_length=25,
                drop_score=0.3,
            )
            print("PaddleOCR initialized successfully", file=sys.stderr)
        except Exception as e:
            raise RuntimeError(f"Failed to initialize PaddleOCR: {str(e)}")
    
    def preprocess_image(self, image_path: str) -> np.ndarray:
        try:
            image = cv2.imread(image_path)
            if image is None:
                raise ValueError(f"Cannot read image: {image_path}")
            
            image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            
            height, width = image_rgb.shape[:2]
            if width > 2000 or height > 2000:
                scale = min(2000 / width, 2000 / height)
                new_width = int(width * scale)
                new_height = int(height * scale)
                image_rgb = cv2.resize(image_rgb, (new_width, new_height), 
                                     interpolation=cv2.INTER_LANCZOS4)
                print(f"Resized image to {new_width}x{new_height}", file=sys.stderr)
            
            return image_rgb
        except Exception as e:
            raise RuntimeError(f"Image preprocessing failed: {str(e)}")
    
    def detect_and_recognize(self, image_path: str) -> List[Dict[str, Any]]:
        try:
            image = self.preprocess_image(image_path)
            
            print("Running PaddleOCR...", file=sys.stderr)
            result = self.ocr.ocr(image, cls=True)
            
            if not result or not result[0]:
                return []
            
            processed_results = []
            for line in result[0]:
                if line is None:
                    continue
                    
                bbox, (text, confidence) = line
                
                if text and text.strip() and confidence > 0.3:
                    processed_results.append({
                        'text': text.strip(),
                        'confidence': float(confidence),
                        'bbox': bbox,
                        'center': self._calculate_center(bbox)
                    })
            
            processed_results.sort(key=lambda x: (x['center'][1], x['center'][0]))
            
            print(f"Detected {len(processed_results)} text regions", file=sys.stderr)
            return processed_results
            
        except Exception as e:
            raise RuntimeError(f"OCR processing failed: {str(e)}")
    
    def _calculate_center(self, bbox: List[List[float]]) -> Tuple[float, float]:
        x_coords = [point[0] for point in bbox]
        y_coords = [point[1] for point in bbox]
        center_x = sum(x_coords) / len(x_coords)
        center_y = sum(y_coords) / len(y_coords)
        return (center_x, center_y)

def main():
    parser = argparse.ArgumentParser(description='PaddleOCR Processing')
    parser.add_argument('--image', required=True, help='Path to input image')
    parser.add_argument('--lang', default='ch', help='OCR language')
    parser.add_argument('--gpu', action='store_true', help='Use GPU acceleration')
    
    args = parser.parse_args()
    
    try:
        if not os.path.exists(args.image):
            raise FileNotFoundError(f"Image file not found: {args.image}")
        
        processor = PaddleOCRProcessor(lang=args.lang, use_gpu=args.gpu)
        ocr_results = processor.detect_and_recognize(args.image)
        
        output = {
            'success': True,
            'ocr_results': ocr_results,
            'total_text_regions': len(ocr_results)
        }
        
        print(json.dumps(output, ensure_ascii=False, indent=2))
        
    except Exception as e:
        error_output = {
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc()
        }
        print(json.dumps(error_output, ensure_ascii=False, indent=2))
        sys.exit(1)

if __name__ == '__main__':
    main()
`;

    await fs.writeFile(this.scriptPath, pythonScript, 'utf8');
    await fs.chmod(this.scriptPath, 0o755);
    console.log('PaddleOCR Python script created successfully');
  }

  private async checkPythonEnvironment(): Promise<void> {
    return new Promise((resolve, reject) => {
      const process = spawn(this.pythonPath, ['-c', 'import paddleocr, cv2; print("Dependencies OK")']);
      
      let output = '';
      let errorOutput = '';
      
      process.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      process.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });
      
      process.on('close', (code) => {
        if (code === 0) {
          console.log('Python dependencies check passed');
          resolve();
        } else {
          console.error('Python dependencies check failed:', errorOutput);
          reject(new Error('Missing Python dependencies. Please run: pip install -r requirements.txt'));
        }
      });
      
      process.on('error', (error) => {
        reject(new Error('Python execution failed: ' + error.message));
      });
    });
  }

  async recognizeText(
    imagePath: string,
    options: AnalysisOptions = {}
  ): Promise<OCRResult> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const args = [
        this.scriptPath,
        '--image', imagePath,
        '--lang', this.getLanguageCode(options.languages || ['chi_tra', 'eng'])
      ];

      const result = await this.executePythonScript(args);
      
      if (!result.success) {
        throw new Error('PaddleOCR failed: ' + result.error);
      }

      return this.convertToOCRResult(result.ocr_results, options);
    } catch (error) {
      console.error('PaddleOCR recognition failed:', error);
      throw new Error('PaddleOCR recognition failed: ' + error);
    }
  }

  private getLanguageCode(languages: string[]): string {
    if (languages.includes('chi_tra') || languages.includes('chinese_cht')) {
      return 'chinese_cht';
    } else if (languages.includes('chi_sim') || languages.includes('ch')) {
      return 'ch';
    } else if (languages.includes('eng') || languages.includes('en')) {
      return 'en';
    }
    return 'ch';
  }

  private async executePythonScript(args: string[]): Promise<any> {
    return new Promise((resolve, reject) => {
      console.log('Executing PaddleOCR script:', args.join(' '));
      
      const process = spawn(this.pythonPath, args);
      
      let output = '';
      let errorOutput = '';
      
      process.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      process.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });
      
      process.on('close', (code) => {
        if (code === 0) {
          try {
            const result = JSON.parse(output);
            resolve(result);
          } catch (parseError) {
            reject(new Error('Failed to parse PaddleOCR output: ' + parseError));
          }
        } else {
          reject(new Error('PaddleOCR script failed with code ' + code + ': ' + errorOutput));
        }
      });
      
      process.on('error', (error) => {
        reject(new Error('Failed to execute PaddleOCR script: ' + error.message));
      });
    });
  }

  private convertToOCRResult(ocrResults: any[], options: AnalysisOptions): OCRResult {
    const words: WordData[] = [];
    const paragraphs: ParagraphData[] = [];
    const blocks: BlockData[] = [];
    
    let allText = '';
    let totalConfidence = 0;
    let confidenceCount = 0;

    ocrResults.forEach((result) => {
      if (result.confidence >= (options.confidenceThreshold || 30) / 100) {
        const bbox = this.convertBbox(result.bbox);
        
        const word: WordData = {
          text: result.text,
          confidence: result.confidence * 100,
          bbox
        };
        
        words.push(word);
        allText += result.text + ' ';
        totalConfidence += result.confidence * 100;
        confidenceCount++;
      }
    });

    const groupedWords = this.groupWordsIntoParagraphs(words);
    groupedWords.forEach(group => {
      const paragraph: ParagraphData = {
        text: group.map(w => w.text).join(' '),
        confidence: group.reduce((sum, w) => sum + w.confidence, 0) / group.length,
        bbox: this.calculateGroupBbox(group.map(w => w.bbox)),
        words: group
      };
      paragraphs.push(paragraph);
    });

    if (paragraphs.length > 0) {
      const block: BlockData = {
        text: allText.trim(),
        confidence: confidenceCount > 0 ? totalConfidence / confidenceCount : 0,
        bbox: this.calculateGroupBbox(paragraphs.map(p => p.bbox)),
        paragraphs
      };
      blocks.push(block);
    }

    return {
      text: allText.trim(),
      confidence: confidenceCount > 0 ? totalConfidence / confidenceCount : 0,
      words,
      paragraphs,
      blocks
    };
  }

  private convertBbox(paddleBbox: number[][]): BoundingBox {
    const xCoords = paddleBbox.map(point => point[0]);
    const yCoords = paddleBbox.map(point => point[1]);
    
    return {
      x0: Math.min(...xCoords),
      y0: Math.min(...yCoords),
      x1: Math.max(...xCoords),
      y1: Math.max(...yCoords)
    };
  }

  private groupWordsIntoParagraphs(words: WordData[]): WordData[][] {
    if (words.length === 0) return [];
    
    const groups: WordData[][] = [];
    let currentGroup: WordData[] = [words[0]];
    
    for (let i = 1; i < words.length; i++) {
      const prev = words[i - 1];
      const curr = words[i];
      
      const prevHeight = prev.bbox.y1 - prev.bbox.y0;
      const yDiff = Math.abs(curr.bbox.y0 - prev.bbox.y0);
      
      if (yDiff < prevHeight * 0.5) {
        currentGroup.push(curr);
      } else {
        groups.push(currentGroup);
        currentGroup = [curr];
      }
    }
    
    groups.push(currentGroup);
    return groups;
  }

  private calculateGroupBbox(bboxes: BoundingBox[]): BoundingBox {
    if (bboxes.length === 0) {
      return { x0: 0, y0: 0, x1: 0, y1: 0 };
    }
    
    return {
      x0: Math.min(...bboxes.map(b => b.x0)),
      y0: Math.min(...bboxes.map(b => b.y0)),
      x1: Math.max(...bboxes.map(b => b.x1)),
      y1: Math.max(...bboxes.map(b => b.y1))
    };
  }

  async terminate(): Promise<void> {
    console.log('PaddleOCR Engine terminated');
  }
}