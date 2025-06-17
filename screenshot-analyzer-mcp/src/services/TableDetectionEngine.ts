import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs/promises';

export interface TableCell {
  text: string;
  confidence: number;
  row: number;
  col: number;
  rowspan: number;
  colspan: number;
  bbox: {
    x0: number;
    y0: number;
    x1: number;
    y1: number;
  };
}

export interface TableStructure {
  rows: number;
  cols: number;
  cells: TableCell[];
  bbox: {
    x0: number;
    y0: number;
    x1: number;
    y1: number;
  };
  confidence: number;
}

export interface TableDetectionResult {
  tables: TableStructure[];
  totalTables: number;
}

export class TableDetectionEngine {
  private pythonPath: string;
  private scriptPath: string;
  private isInitialized = false;

  constructor() {
    this.pythonPath = 'python3';
    this.scriptPath = path.join(process.cwd(), 'python_scripts', 'table_detection.py');
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      const scriptsDir = path.dirname(this.scriptPath);
      await fs.mkdir(scriptsDir, { recursive: true });

      await this.createTableDetectionScript();
      await this.checkDependencies();

      this.isInitialized = true;
      console.log('Table Detection Engine initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Table Detection Engine:', error);
      throw new Error('Table Detection initialization failed: ' + error);
    }
  }

  private async createTableDetectionScript(): Promise<void> {
    const pythonScript = `#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import sys
import json
import os
import argparse
import traceback
import numpy as np

try:
    import cv2
    from PIL import Image
except ImportError as e:
    print(json.dumps({
        "error": "Missing dependencies: " + str(e),
        "install_command": "pip install opencv-python Pillow numpy"
    }))
    sys.exit(1)

class SimpleTableDetector:
    def __init__(self):
        self.min_table_area = 5000
        
    def detect_tables(self, image_path):
        try:
            image = cv2.imread(image_path)
            if image is None:
                raise ValueError("Cannot read image: " + image_path)
            
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            
            # 簡化的表格檢測
            tables = self._detect_tables_morphology(gray)
            
            structured_tables = []
            for i, table in enumerate(tables):
                structure = self._analyze_table_structure(gray, table, i)
                if structure:
                    structured_tables.append(structure)
            
            return structured_tables
            
        except Exception as e:
            raise RuntimeError("Table detection failed: " + str(e))
    
    def _detect_tables_morphology(self, gray):
        tables = []
        
        try:
            # 檢測水平和垂直線
            horizontal_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (40, 1))
            vertical_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (1, 40))
            
            horizontal = cv2.morphologyEx(gray, cv2.MORPH_OPEN, horizontal_kernel)
            vertical = cv2.morphologyEx(gray, cv2.MORPH_OPEN, vertical_kernel)
            
            mask = cv2.addWeighted(horizontal, 0.5, vertical, 0.5, 0.0)
            
            contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            
            for contour in contours:
                area = cv2.contourArea(contour)
                if area > self.min_table_area:
                    x, y, w, h = cv2.boundingRect(contour)
                    aspect_ratio = max(w, h) / min(w, h)
                    if aspect_ratio < 10:
                        tables.append({
                            'bbox': [x, y, x+w, y+h],
                            'area': area,
                            'method': 'morphology',
                            'confidence': min(0.9, area / 50000)
                        })
        
        except Exception as e:
            print("Morphology detection failed: " + str(e), file=sys.stderr)
        
        return tables
    
    def _analyze_table_structure(self, gray, table, table_id):
        try:
            x1, y1, x2, y2 = table['bbox']
            
            # 簡化的結構分析
            rows = 3  # 估計行數
            cols = 3  # 估計列數
            
            cells = []
            cell_height = (y2 - y1) // rows
            cell_width = (x2 - x1) // cols
            
            for i in range(rows):
                for j in range(cols):
                    cell_x1 = x1 + j * cell_width
                    cell_y1 = y1 + i * cell_height
                    cell_x2 = cell_x1 + cell_width
                    cell_y2 = cell_y1 + cell_height
                    
                    cells.append({
                        'row': i,
                        'col': j,
                        'rowspan': 1,
                        'colspan': 1,
                        'text': "",
                        'confidence': 0.8,
                        'bbox': {
                            'x0': cell_x1,
                            'y0': cell_y1,
                            'x1': cell_x2,
                            'y1': cell_y2
                        }
                    })
            
            return {
                'id': table_id,
                'bbox': {'x0': x1, 'y0': y1, 'x1': x2, 'y1': y2},
                'rows': rows,
                'cols': cols,
                'cells': cells,
                'confidence': table['confidence'],
                'method': table['method'],
                'area': table['area']
            }
            
        except Exception as e:
            print("Table structure analysis failed: " + str(e), file=sys.stderr)
            return None

def main():
    parser = argparse.ArgumentParser(description='Simple Table Detection')
    parser.add_argument('--image', required=True, help='Path to input image')
    parser.add_argument('--min-area', type=int, default=5000, help='Minimum table area')
    
    args = parser.parse_args()
    
    try:
        if not os.path.exists(args.image):
            raise FileNotFoundError("Image file not found: " + args.image)
        
        detector = SimpleTableDetector()
        detector.min_table_area = args.min_area
        
        tables = detector.detect_tables(args.image)
        
        output = {
            'success': True,
            'tables': tables,
            'total_tables': len(tables)
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
    console.log('Table Detection Python script created successfully');
  }

  private async checkDependencies(): Promise<void> {
    return new Promise((resolve, reject) => {
      const process = spawn(this.pythonPath, ['-c', 'import cv2, numpy; print("Dependencies OK")']);
      
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
          console.log('Table detection dependencies check passed');
          resolve();
        } else {
          console.error('Table detection dependencies check failed:', errorOutput);
          reject(new Error('Missing dependencies. Please run: pip install -r requirements.txt'));
        }
      });
      
      process.on('error', (error) => {
        reject(new Error('Python execution failed: ' + error.message));
      });
    });
  }

  async detectTables(imagePath: string, minArea: number = 5000): Promise<TableDetectionResult> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const args = [
        this.scriptPath,
        '--image', imagePath,
        '--min-area', minArea.toString()
      ];

      const result = await this.executePythonScript(args);
      
      if (!result.success) {
        throw new Error('Table detection failed: ' + result.error);
      }

      return {
        tables: result.tables,
        totalTables: result.total_tables
      };
    } catch (error) {
      console.error('Table detection failed:', error);
      throw new Error('Table detection failed: ' + error);
    }
  }

  private async executePythonScript(args: string[]): Promise<any> {
    return new Promise((resolve, reject) => {
      console.log('Executing table detection script:', args.join(' '));
      
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
            reject(new Error('Failed to parse table detection output: ' + parseError));
          }
        } else {
          reject(new Error('Table detection script failed with code ' + code + ': ' + errorOutput));
        }
      });
      
      process.on('error', (error) => {
        reject(new Error('Failed to execute table detection script: ' + error.message));
      });
    });
  }

  async terminate(): Promise<void> {
    console.log('Table Detection Engine terminated');
  }
}