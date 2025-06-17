#!/bin/bash

echo "Installing enhanced OCR dependencies..."

# 檢查Python是否安裝
if ! command -v python3 &> /dev/null; then
    echo "Python3 is not installed. Please install Python3 first."
    exit 1
fi

# 創建虛擬環境（如果不存在）
if [ ! -d "venv" ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv venv
fi

# 激活虛擬環境
source venv/bin/activate

# 升級pip
echo "Upgrading pip..."
pip install --upgrade pip

# 安裝PaddleOCR相關依賴
echo "Installing PaddleOCR..."
pip install paddlepaddle-cpu paddleocr

# 安裝其他OCR相關依賴
echo "Installing additional OCR dependencies..."
pip install opencv-python pillow numpy

echo "Enhanced OCR dependencies installed successfully!"
echo "Note: PaddleOCR will download models on first use."
echo ""
echo "To test if PaddleOCR is working:"
echo "source venv/bin/activate"
echo "python3 -c \"import paddleocr; print('PaddleOCR is available')\""