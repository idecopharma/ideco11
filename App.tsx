
import React, { useState, useCallback, useEffect } from 'react';
import { GoogleGenAI, Modality } from '@google/genai';
import type { UploadedFile, PromptTemplate, CanvasElement } from './types';
import { INITIAL_PROMPTS } from './constants';
import Header from './components/Header';
import ImageUploader from './components/ImageUploader';
import PromptManager from './components/PromptManager';
import GeneratedImageDisplay from './components/GeneratedImageDisplay';
import Spinner from './components/Spinner';
import useLocalStorage from './hooks/useLocalStorage';
import AspectRatioSelector from './components/AspectRatioSelector';
import TextEditorModal from './components/TextEditorModal';
import ImageEditorModal from './components/ImageEditorModal';
import ShareModal from './components/ShareModal';
import VideoGenerationModal from './components/VideoGenerationModal';
import VideoPromptModal from './components/VideoPromptModal';
import IframeModal from './components/IframeModal';
import CanvasEditorModal from './components/CanvasEditorModal';

// FIX: Moved the `AIStudio` interface into the `declare global` block to resolve a TypeScript error regarding subsequent property declarations and ensure type consistency for `window.aistudio`.
// Add this global declaration for window.aistudio
declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }
  interface Window {
    aistudio?: AIStudio;
  }
}

// Base64 string might have a prefix "data:image/png;base64,". This function removes it.
const stripBase64Prefix = (base64: string) => {
    const parts = base64.split(',');
    return parts.length > 1 ? parts[1] : parts[0];
};

const b64_to_utf8 = (str: string) => {
    try {
        return decodeURIComponent(escape(window.atob(str)));
    } catch (e) {
        console.error('Base64 decoding failed:', e);
        return ''; // Return empty string on failure
    }
}

const QUOTE_TOOL_PAGE_HTML = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Báo Giá Thuốc - Tạo Bảng Ảnh</title>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
    <style>
        body {
            font-family: Arial, sans-serif;
            padding: 20px;
            background: #f5f5f5;
        }
        h1 {
            text-align: center;
            color: #333;
            margin-bottom: 10px;
        }
        .mode-selector, .ratio-selector {
            display: flex;
            justify-content: center;
            gap: 15px;
            margin: 20px auto 30px;
            max-width: 600px;
        }
        .mode-btn, .ratio-btn {
            padding: 14px 28px;
            font-size: 16px;
            border: 2px solid #007bff;
            background: white;
            color: #007bff;
            border-radius: 30px;
            cursor: pointer;
            transition: all 0.25s ease;
            font-weight: 600;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        }
        .mode-btn:hover, .ratio-btn:hover {
            background: #f0f7ff;
            transform: translateY(-2px);
            box-shadow: 0 4px 8px rgba(0,0,0,0.15);
        }
        .mode-btn.active, .ratio-btn.active {
            background: #007bff;
            color: white;
            transform: translateY(-2px);
            box-shadow: 0 4px 8px rgba(0,0,0,0.2);
        }
        .preview-grid {
            display: grid;
            gap: 15px;
            margin: 30px auto;
            max-width: 800px;
            padding: 20px;
            background: white;
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
            border-radius: 8px;
        }
        .preview-grid-6 { grid-template-columns: 1fr 1fr 1fr; }
        .preview-grid-4 { grid-template-columns: 1fr 1fr; }
        .preview-grid-2 { grid-template-columns: 1fr 1fr; }
        .preview-grid-1 { grid-template-columns: 1fr; }
        /* ———————— KHUNG ẢNH ———————— */
        .preview-item {
            width: 100%;
            /* aspect-ratio sẽ được set bởi JS dựa trên lựa chọn */
            background: #f9f9f9;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
            border-radius: 8px;
            position: relative;
            cursor: pointer;
            border: 2px dashed #aaa;
            transition: all 0.2s;
        }
        .preview-item:hover {
            border-color: #007bff;
            background: #e7f3ff;
        }
        .preview-item img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            object-position: center;
        }
        .preview-item input {
            display: none;
        }
        .preview-item .remove-btn {
            position: absolute;
            top: 5px;
            right: 5px;
            width: 24px;
            height: 24px;
            background: rgba(0,0,0,0.6);
            color: white;
            border: none;
            border-radius: 50%;
            cursor: pointer;
            font-size: 16px;
            line-height: 24px;
            text-align: center;
            opacity: 0;
            transition: opacity 0.2s ease-in-out;
            z-index: 10;
        }
        .preview-item:hover .remove-btn {
            opacity: 1;
        }
        button {
            padding: 10px 20px;
            margin: 10px;
            font-size: 16px;
            cursor: pointer;
            border: none;
            border-radius: 5px;
        }
        #exportPng, #exportPdf {
            background: #007bff;
            color: white;
        }
        #previewBtn {
            background: #28a745;
            color: white;
        }
        button:disabled {
            background: #ccc;
            cursor: not-allowed;
        }
        .actions {
            text-align: center;
            margin-top: 20px;
        }
        /* Modal Preview */
        #previewModal {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.7);
            z-index: 1000;
            justify-content: center;
            align-items: center;
        }
        #previewContent {
            background: white;
            padding: 20px;
            border-radius: 10px;
            max-width: 90%;
            max-height: 90%;
            overflow: auto;
            position: relative;
        }
        #closePreview {
            position: absolute;
            top: 10px;
            right: 15px;
            font-size: 24px;
            cursor: pointer;
            color: #ff0000;
        }
        /* ———————— BẢNG XUẤT FILE (ẨN) ———————— */
        #hiddenExportBoard {
            position: fixed;
            left: -9999px;
            top: -9999px;
            width: 800px;
            background: white;
            padding: 30px;
            border: 4px solid red;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        #hiddenExportHeader {
            display: flex;
            align-items: flex-start;
            gap: 20px;
            margin-bottom: 20px;
        }
        #hiddenExportHeader img {
            height: 60px;
        }
        #hiddenExportHeader .header-text {
            flex: 1;
        }
        #hiddenExportTitle {
            font-size: 26px;
            font-weight: bold;
            color: #d90000;
            margin: 0;
        }
        #hiddenExportSubtitle {
            font-size: 16px;
            font-style: italic;
            color: #555;
            margin: 10px 0 0 0;
        }
        #hiddenExportGrid {
            display: grid;
            gap: 15px;
        }
        #hiddenExportGrid.preview-grid-6 { grid-template-columns: 1fr 1fr 1fr; }
        #hiddenExportGrid.preview-grid-4 { grid-template-columns: 1fr 1fr; }
        #hiddenExportGrid.preview-grid-2 { grid-template-columns: 1fr 1fr; }
        #hiddenExportGrid.preview-grid-1 { grid-template-columns: 1fr; }
        .hidden-export-item {
            width: 100%;
            /* aspect-ratio sẽ được set bởi JS dựa trên lựa chọn */
            background: #f9f9f9;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
            border-radius: 8px;
        }
        .hidden-export-item img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            object-position: center;
        }
        #hiddenExportFooter {
            text-align: center;
            margin-top: 30px;
            font-weight: bold;
            font-size: 18px;
            color: #333;
        }
        #hiddenExportAddress {
            text-align: center;
            margin-top: 5px;
            font-size: 14px;
            color: #555;
            line-height: 1.5;
        }
        .preview-grid {
            display: none;
        }
        .preview-grid.active {
            display: grid;
        }
    </style>
</head>
<body>
    <h1>📸 Tạo Bảng Báo Giá Thuốc</h1>
    
    <div class="mode-selector">
        <button class="mode-btn active" data-mode="6">Báo Giá 6 Ảnh</button>
        <button class="mode-btn" data-mode="4">Báo Giá 4 Ảnh</button>
        <button class="mode-btn" data-mode="2">Báo Giá 2 Ảnh</button>
        <button class="mode-btn" data-mode="1">Báo Giá 1 Ảnh</button>
    </div>

    <!-- ✅ THÊM BỘ CHỌN TỶ LỆ KHUNG HÌNH -->
    <div class="ratio-selector">
        <button class="ratio-btn active" data-ratio="3/4">Tỷ lệ 3:4</button>
        <button class="ratio-btn" data-ratio="1/1">Tỷ lệ 1:1</button>
    </div>

    <!-- ✅ THÊM KHUNG 6 ẢNH -->
    <div class="preview-grid preview-grid-6 active" id="grid6">
        <div class="preview-item" id="item6-1">
            <span>Click hoặc kéo thả ảnh 1</span>
            <input type="file" accept="image/*">
        </div>
        <div class="preview-item" id="item6-2">
            <span>Click hoặc kéo thả ảnh 2</span>
            <input type="file" accept="image/*">
        </div>
        <div class="preview-item" id="item6-3">
            <span>Click hoặc kéo thả ảnh 3</span>
            <input type="file" accept="image/*">
        </div>
        <div class="preview-item" id="item6-4">
            <span>Click hoặc kéo thả ảnh 4</span>
            <input type="file" accept="image/*">
        </div>
        <div class="preview-item" id="item6-5">
            <span>Click hoặc kéo thả ảnh 5</span>
            <input type="file" accept="image/*">
        </div>
        <div class="preview-item" id="item6-6">
            <span>Click hoặc kéo thả ảnh 6</span>
            <input type="file" accept="image/*">
        </div>
    </div>

    <div class="preview-grid preview-grid-4" id="grid4">
        <div class="preview-item" id="item4-1">
            <span>Click hoặc kéo thả ảnh 1</span>
            <input type="file" accept="image/*">
        </div>
        <div class="preview-item" id="item4-2">
            <span>Click hoặc kéo thả ảnh 2</span>
            <input type="file" accept="image/*">
        </div>
        <div class="preview-item" id="item4-3">
            <span>Click hoặc kéo thả ảnh 3</span>
            <input type="file" accept="image/*">
        </div>
        <div class="preview-item" id="item4-4">
            <span>Click hoặc kéo thả ảnh 4</span>
            <input type="file" accept="image/*">
        </div>
    </div>
    <div class="preview-grid preview-grid-2" id="grid2">
        <div class="preview-item" id="item2-1">
            <span>Click hoặc kéo thả ảnh 1</span>
            <input type="file" accept="image/*">
        </div>
        <div class="preview-item" id="item2-2">
            <span>Click hoặc kéo thả ảnh 2</span>
            <input type="file" accept="image/*">
        </div>
    </div>
    <div class="preview-grid preview-grid-1" id="grid1">
        <div class="preview-item" id="item1-1">
            <span>Click hoặc kéo thả ảnh</span>
            <input type="file" accept="image/*">
        </div>
    </div>
    <div class="actions">
        <button id="previewBtn" disabled>Xem trước</button>
        <button id="exportPng" disabled>Xuất PNG</button>
        <button id="exportPdf" disabled>Xuất PDF</button>
    </div>
    <!-- Modal Xem trước -->
    <div id="previewModal">
        <div id="previewContent">
            <span id="closePreview">&times;</span>
            <div id="modalExportBoard">
                <!-- Sẽ được clone từ hiddenExportBoard -->
            </div>
        </div>
    </div>
    <!-- 🚫 BẢNG XUẤT FILE ẨN — CHỈ DÙNG ĐỂ CHỤP ẢNH — KHÔNG HIỂN THỊ TRÊN MÀN HÌNH -->
    <div id="hiddenExportBoard">
        <div id="hiddenExportHeader">
            <img id="companyLogo" src="" alt="Logo Công Ty">
            <div class="header-text">
                <div id="hiddenExportTitle">BÁO GIÁ THUỐC</div>
                <div id="hiddenExportSubtitle">Kính gởi: Quý Khách hàng - Đại lý</div>
            </div>
        </div>
        <div id="hiddenExportGrid" class="preview-grid-6">
            <!-- Sẽ được tạo động -->
        </div>
        <div id="hiddenExportFooter">CÔNG TY IDECO TRÂN TRỌNG</div>
        <div id="hiddenExportAddress">003 Carlion 5 - 262/3 Lũy Bán Bích - P. Tân Phú - Tp. HCM - Hotline: 0385400436</div>
    </div>
    <script>
        const grids = {
            '6': document.getElementById('grid6'),
            '4': document.getElementById('grid4'),
            '2': document.getElementById('grid2'),
            '1': document.getElementById('grid1')
        };
        const items = {
            '6': Array.from(document.getElementById('grid6').querySelectorAll('.preview-item')),
            '4': Array.from(document.getElementById('grid4').querySelectorAll('.preview-item')),
            '2': Array.from(document.getElementById('grid2').querySelectorAll('.preview-item')),
            '1': Array.from(document.getElementById('grid1').querySelectorAll('.preview-item'))
        };
        const previewModal = document.getElementById('previewModal');
        const previewBtn = document.getElementById('previewBtn');
        const exportPngBtn = document.getElementById('exportPng');
        const exportPdfBtn = document.getElementById('exportPdf');
        const closePreview = document.getElementById('closePreview');
        const companyLogo = document.getElementById('companyLogo');
        const modeButtons = document.querySelectorAll('.mode-btn');
        const ratioButtons = document.querySelectorAll('.ratio-btn');
        const hiddenExportBoard = document.getElementById('hiddenExportBoard');
        const hiddenExportGrid = document.getElementById('hiddenExportGrid');
        const modalExportBoard = document.getElementById('modalExportBoard');
        
        let currentMode = sessionStorage.getItem('quoteToolMode') || '6';
        let currentRatio = '3/4';

        // Initialize fresh image sources every time
        let imageSources = {
            '6': [null, null, null, null, null, null],
            '4': [null, null, null, null],
            '2': [null, null],
            '1': [null]
        };
        
        // A queue for images sent from the main application
        let imageQueue = [];

        function addRemoveButton(container, mode, index) {
            let removeBtn = container.querySelector('.remove-btn');
            if (!removeBtn) {
                removeBtn = document.createElement('button');
                removeBtn.innerHTML = '&times;';
                removeBtn.className = 'remove-btn';
                removeBtn.title = 'Xóa ảnh';
                container.appendChild(removeBtn);
                removeBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    clearImage(container, mode, index);
                });
            }
        }

        function clearImage(container, mode, index) {
            imageSources[mode][index] = null;

            const img = container.querySelector('img');
            if (img) img.remove();
            
            const removeBtn = container.querySelector('.remove-btn');
            if (removeBtn) removeBtn.remove();
            
            if (!container.querySelector('span')) {
                const span = document.createElement('span');
                // FIX: A nested template literal here would cause a syntax error. Changed to string concatenation.
                const placeholderText = mode === '1' ? 'Click hoặc kéo thả ảnh' : 'Click hoặc kéo thả ảnh ' + (index + 1);
                span.textContent = placeholderText;
                container.prepend(span);
            }
            
            checkEnableExport();
        }

        function updateImageInSlot(container, base64, mode, index) {
            const span = container.querySelector('span');
            if (span) span.remove();

            let img = container.querySelector('img');
            if (img) {
                img.src = base64;
            } else {
                img = document.createElement('img');
                img.src = base64;
                container.prepend(img);
            }
            
            addRemoveButton(container, mode, index);
        }
        
        function populateImagesFromSources() {
            for (const mode in items) {
                items[mode].forEach((item, index) => {
                    const src = imageSources[mode][index];
                    if (src) {
                        updateImageInSlot(item, src, mode, index);
                    }
                });
            }
        }
        
        function updateAllAspectRatios(ratio) {
            document.querySelectorAll('.preview-item, .hidden-export-item').forEach(item => {
                item.style.aspectRatio = ratio;
            });
        }

        let logoBase64 = null;
        function loadLogo() {
            const logoUrl = "https://cdn.imgpile.com/f/5cLRy50_xl.jpg";
            fetch(logoUrl)
                .then(response => response.blob())
                .then(blob => {
                    const reader = new FileReader();
                    reader.onload = () => { logoBase64 = reader.result; companyLogo.src = logoBase64; };
                    reader.readAsDataURL(blob);
                })
                .catch(err => {
                    console.warn("Không tải được logo, dùng placeholder.", err);
                    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="60" viewBox="0 0 200 60"><rect width="200" height="60" fill="#eee"/><text x="10" y="35" font-family="Arial" font-size="14" fill="#999">[LOGO]</text></svg>';
                    const b64 = btoa(unescape(encodeURIComponent(svg)));
                    logoBase64 = 'data:image/svg+xml;base64,' + b64;
                    companyLogo.src = logoBase64;
                });
        }
        loadLogo();

        function setupItemEvents(item, input, index, mode) {
            item.addEventListener('click', (e) => { if (e.target !== input) input.click(); });
            ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(event => {
                item.addEventListener(event, e => { e.preventDefault(); e.stopPropagation(); });
            });
            ['dragenter', 'dragover'].forEach(event => {
                item.addEventListener(event, () => { item.style.borderColor = '#007bff'; item.style.backgroundColor = '#e7f3ff'; });
            });
            ['dragleave', 'drop'].forEach(event => {
                item.addEventListener(event, () => { item.style.borderColor = '#aaa'; item.style.backgroundColor = '#f9f9f9'; });
            });
            item.addEventListener('drop', (e) => {
                const files = e.dataTransfer.files;
                if (files.length && files[0].type.startsWith('image/')) {
                    handleImage(files[0], item, index, mode);
                }
            });
            input.addEventListener('change', (e) => {
                if (e.target.files.length) {
                    handleImage(e.target.files[0], item, index, mode);
                }
            });
        }

        function handleImage(file, container, index, mode) {
            const reader = new FileReader();
            reader.onload = function(e) {
                const base64 = e.target.result;
                imageSources[mode][index] = base64;
                updateImageInSlot(container, base64, mode, index);
                if (mode === currentMode) {
                    checkEnableExport();
                }
            };
            reader.readAsDataURL(file);
        }

        for (let mode in items) {
            items[mode].forEach((item, index) => {
                const input = item.querySelector('input');
                setupItemEvents(item, input, index, mode);
            });
        }

        function checkEnableExport() {
            const count = imageSources[currentMode].filter(src => src !== null).length;
            const hasAnyImage = count > 0;
            previewBtn.disabled = !hasAnyImage;
            exportPngBtn.disabled = !hasAnyImage;
            exportPdfBtn.disabled = !hasAnyImage;
        }
        
        function processQueuedImages() {
            let placedImage = false;
            while (imageQueue.length > 0) {
                const emptyIndex = imageSources[currentMode].findIndex(src => src === null);
                if (emptyIndex === -1) {
                    break;
                }
                const imageBase64 = imageQueue.shift();
                const itemContainer = items[currentMode][emptyIndex];
                imageSources[currentMode][emptyIndex] = imageBase64;
                updateImageInSlot(itemContainer, imageBase64, currentMode, emptyIndex);
                placedImage = true;
            }
            if (placedImage) {
                checkEnableExport();
            }
        }

        function switchMode(mode) {
            sessionStorage.setItem('quoteToolMode', mode);
            for (let key in grids) grids[key].classList.remove('active');
            grids[mode].classList.add('active');
            currentMode = mode;
            modeButtons.forEach(btn => btn.classList.toggle('active', btn.dataset.mode === mode));
            processQueuedImages();
            checkEnableExport();
        }

        function switchRatio(ratio) {
            currentRatio = ratio;
            ratioButtons.forEach(btn => btn.classList.toggle('active', btn.dataset.ratio === ratio));
            updateAllAspectRatios(ratio);
        }

        modeButtons.forEach(btn => btn.addEventListener('click', () => switchMode(btn.dataset.mode)));
        ratioButtons.forEach(btn => btn.addEventListener('click', () => switchRatio(btn.dataset.ratio)));

        function prepareExportBoard() {
            if (logoBase64) companyLogo.src = logoBase64;
            hiddenExportGrid.className = 'preview-grid preview-grid-' + currentMode;
            hiddenExportGrid.innerHTML = '';
            const currentSources = imageSources[currentMode];
            for (let i = 0; i < currentSources.length; i++) {
                const item = document.createElement('div');
                item.className = 'hidden-export-item';
                item.style.aspectRatio = currentRatio;
                if (currentSources[i]) {
                    const img = document.createElement('img');
                    img.src = currentSources[i];
                    item.appendChild(img);
                } else {
                    const span = document.createElement('span');
                    span.textContent = "—";
                    span.style.color = "#ccc";
                    span.style.fontSize = "16px";
                    span.style.fontWeight = "bold";
                    item.appendChild(span);
                }
                hiddenExportGrid.appendChild(item);
            }
        }

        previewBtn.addEventListener('click', () => {
            prepareExportBoard();
            modalExportBoard.innerHTML = '';
            const clone = hiddenExportBoard.cloneNode(true);
            clone.id = '';
            modalExportBoard.appendChild(clone);
            previewModal.style.display = 'flex';
        });

        closePreview.addEventListener('click', () => previewModal.style.display = 'none');
        window.addEventListener('click', (e) => {
            if (e.target === previewModal) previewModal.style.display = 'none';
        });

        exportPngBtn.addEventListener('click', () => {
            prepareExportBoard();
            html2canvas(hiddenExportBoard, { scale: 2, useCORS: true, allowTaint: true })
                .then(canvas => {
                    const link = document.createElement('a');
                    link.download = 'bao-gia-thuoc-' + currentMode + '-anh.png';
                    link.href = canvas.toDataURL('image/png');
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                }).catch(err => {
                    alert("Lỗi khi tạo PNG: " + err.message);
                    console.error(err);
                });
        });

        exportPdfBtn.addEventListener('click', () => {
            prepareExportBoard();
            html2canvas(hiddenExportBoard, { scale: 2, useCORS: true, allowTaint: true })
                .then(canvas => {
                    const { jsPDF } = window.jspdf;
                    const pdf = new jsPDF('p', 'mm', 'a4');
                    const pdfWidth = 210, pdfHeight = 297;
                    const imgWidth = pdfWidth - 20;
                    const ratio = canvas.width / canvas.height;
                    const imgHeight = imgWidth / ratio;
                    const x = 10, y = Math.max(10, (pdfHeight - imgHeight) / 2);
                    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', x, y, imgWidth, imgHeight);
                    pdf.save('bao-gia-thuoc-' + currentMode + '-anh.pdf');
                }).catch(err => {
                    alert("Lỗi khi tạo PDF: " + err.message);
                    console.error(err);
                });
        });
        
        // Initial setup on load
        populateImagesFromSources(); // This will now always populate from a fresh state
        updateAllAspectRatios(currentRatio);
        switchMode(currentMode);
        
        // Listen for messages from the parent window
        window.addEventListener('message', (event) => {
            const { type, payload } = event.data;
            if (type === 'addImageToQuote' && payload && payload.base64) {
                imageQueue.push(payload.base64);
                // The image will be placed when the user clicks a mode button via switchMode.
                processQueuedImages(); // Immediately try to place the image
            }
        });
    </script>
</body>
</html>
`;


const TOOL_PAGE_HTML = `
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Image Resizer & Background Remover</title>
    <style>
        /* General Styles */
        body {
            font-family: 'Arial', sans-serif;
            margin: 0;
            padding: 0;
            background-color: #f4f4f9;
            color: #333;
        }
        .container {
            max-width: 1200px;
            margin: 50px auto;
            padding: 20px;
            background: #fff;
            border-radius: 10px;
            box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
        }
        h1 {
            text-align: center;
            color: #4a90e2;
            margin-bottom: 20px;
        }
        h3 {
           margin-top: 0;
        }
        .upload-section {
            text-align: center;
            margin-bottom: 20px;
            padding: 20px;
            background: #f8f9fa;
            border-radius: 10px;
            border: 2px dashed #4a90e2;
        }
        .upload-section input[type="file"] {
            display: none;
        }
        .upload-section label {
            display: inline-block;
            padding: 12px 25px;
            background-color: #4a90e2;
            color: #fff;
            border-radius: 5px;
            cursor: pointer;
            transition: background-color 0.3s ease;
            font-size: 16px;
        }
        .upload-section label:hover {
            background-color: #357ab8;
        }
        .instructions {
            text-align: center;
            color: #666;
            margin: 10px 0;
            font-style: italic;
        }
        .buttons {
            display: flex;
            justify-content: space-around;
            margin-bottom: 20px;
            flex-wrap: wrap;
            gap: 10px;
        }
        .buttons button {
            padding: 12px 20px;
            background-color: #4a90e2;
            color: #fff;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            transition: background-color 0.3s ease;
            min-width: 120px;
        }
        .buttons button:hover {
            background-color: #357ab8;
        }
        .preview-container {
            display: flex;
            justify-content: space-between;
            margin-top: 20px;
            gap: 20px;
        }
        .preview {
            width: 48%;
            text-align: center;
            padding: 15px;
            background: #f8f9fa;
            border-radius: 10px;
        }
        .preview img {
            max-width: 100%;
            max-height: 400px;
            border: 2px solid #ddd;
            border-radius: 10px;
            margin-top: 10px;
        }
        canvas {
            max-width: 100%;
            border: 2px solid #ddd;
            border-radius: 10px;
        }
        .hidden {
            display: none;
        }
        .remove-bg-btn {
            margin-top: 10px;
            padding: 12px 25px;
            background-color: #ff5722;
            color: #fff;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            transition: background-color 0.3s ease;
            font-size: 16px;
        }
        .remove-bg-btn:hover {
            background-color: #e64a19;
        }
        #downloadButton {
            display: block;
            width: 100%;
            padding: 15px;
            background-color: #28a745;
            color: #fff;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            margin-top: 20px;
            transition: background-color 0.3s ease;
            font-size: 16px;
        }
        #downloadButton:hover {
            background-color: #218838;
        }
        .image-info {
            text-align: center;
            color: #666;
            margin: 5px 0;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🖼️ Công cụ Chỉnh sửa Ảnh Thuốc</h1>
        
        <div class="upload-section">
            <h3>📁 Bước 1a: Upload ảnh thuốc từ máy tính</h3>
            <p class="instructions">Tìm ảnh thuốc trên internet → Lưu về máy → Upload tại đây</p>
            <label for="fileInput">Chọn ảnh từ máy tính</label>
            <input type="file" id="fileInput" accept="image/*">
            <div id="fileInfo" class="image-info"></div>
        </div>

        <div class="upload-section" style="margin-top: 20px; border-color: #28a745;">
            <h3>🔎 Bước 1b: Hoặc tìm & tải ảnh từ Google</h3>
            <div style="display: flex; justify-content: center; gap: 10px; margin-bottom: 10px; align-items: center;">
                <input type="text" id="searchInput" placeholder="Nhập từ khóa tìm kiếm..." style="width: 50%; padding: 10px; border-radius: 5px; border: 1px solid #ccc; font-size: 14px;">
                <button id="searchGoogleBtn" style="padding: 11px 20px; background-color: #4a90e2; color: #fff; border: none; border-radius: 5px; cursor: pointer; font-size: 14px;">Tìm trên Google</button>
            </div>
            <p class="instructions">Sau khi tìm thấy ảnh, nhấp chuột phải vào ảnh và chọn "Copy Image Address".</p>
            <div style="display: flex; justify-content: center; gap: 10px; margin-top: 10px; align-items: center;">
                <input type="text" id="urlInput" placeholder="Dán liên kết hình ảnh vào đây..." style="width: 50%; padding: 10px; border-radius: 5px; border: 1px solid #ccc; font-size: 14px;">
                <button id="loadUrlBtn" style="padding: 11px 20px; background-color: #28a745; color: #fff; border: none; border-radius: 5px; cursor: pointer; font-size: 14px;">Tải từ liên kết</button>
            </div>
        </div>

        <h3 style="text-align: center; color: #4a90e2; margin: 30px 0 20px 0;">📏 Bước 2: Chọn tỉ lệ khung ảnh</h3>
        <div class="buttons">
            <button onclick="resizeAndFitImage(9, 16)">Tỉ lệ 9:16 (Điện thoại)</button>
            <button onclick="resizeAndFitImage(3, 4)">Tỉ lệ 3:4 (Chân dung)</button>
            <button onclick="resizeAndFitImage(1, 1)">Tỉ lệ 1:1 (Vuông)</button>
            <button onclick="resizeAndFitImage(4, 3)">Tỉ lệ 4:3 (Màn hình)</button>
        </div>

        <div class="preview-container">
            <div class="preview">
                <h3>🖼️ Ảnh gốc</h3>
                <img id="originalImage" src="" alt="Original Image" class="hidden">
                <div id="originalInfo" class="image-info"></div>
            </div>
            <div class="preview">
                <h3>✨ Ảnh đã xử lý</h3>
                <canvas id="previewCanvas" class="hidden"></canvas>
                <img id="processedImage" src="" alt="Processed Image" class="hidden">
                <p class="instructions">Ảnh được đặt trong khung với nền trắng, không bị cắt hay bóp méo. <b>Nhấp đúp chuột vào ảnh để gửi qua ứng dụng chính.</b></p>
            </div>
        </div>

        <div style="text-align: center; margin: 20px 0;">
            <button id="removeBgButton" class="remove-bg-btn hidden" onclick="removeBackground()">
                🎯 Xóa nền ảnh
            </button>
        </div>

        <button id="downloadButton" class="hidden" onclick="downloadImage()">
            💾 Tải ảnh xuống
        </button>
    </div>

    <script>
        const fileInput = document.getElementById('fileInput');
        const originalImageEl = document.getElementById('originalImage');
        const previewCanvas = document.getElementById('previewCanvas');
        const processedImageEl = document.getElementById('processedImage');
        const removeBgButton = document.getElementById('removeBgButton');
        const downloadButton = document.getElementById('downloadButton');
        const fileInfo = document.getElementById('fileInfo');
        const originalInfo = document.getElementById('originalInfo');
        const searchInput = document.getElementById('searchInput');
        const searchGoogleBtn = document.getElementById('searchGoogleBtn');
        const urlInput = document.getElementById('urlInput');
        const loadUrlBtn = document.getElementById('loadUrlBtn');

        let originalImage = new Image();
        let resizedCanvas = null;
        let processedImageData = null;

        fileInput.addEventListener('change', handleFileUpload);
        
        processedImageEl.addEventListener('dblclick', function() {
            const imgSrc = this.src;
            if (!imgSrc || this.classList.contains('hidden')) return;

            const sendImageToParent = (base64Data) => {
                if (typeof base64Data !== 'string' || !base64Data.includes(',')) return;
                const base64 = base64Data.split(',')[1];
                if (!base64) return;
                
                window.parent.postMessage({
                    type: 'toolImageUpload',
                    payload: {
                        // FIX: A nested template literal here would cause a syntax error. Changed to string concatenation.
                        name: 'edited_image_' + new Date().getTime() + '.png',
                        type: 'image/png',
                        size: 0,
                        base64: base64
                    }
                }, '*');
                
                const instructionsEl = document.querySelector('#processedImage + .instructions');
                if (instructionsEl) {
                    const feedback = document.createElement('p');
                    feedback.textContent = '✅ Đã gửi ảnh qua ứng dụng chính!';
                    feedback.style.color = 'green';
                    feedback.style.fontWeight = 'bold';
                    feedback.style.marginTop = '10px';
                    instructionsEl.parentNode.insertBefore(feedback, instructionsEl.nextSibling);
                }
            };

            if (imgSrc.startsWith('data:')) {
                sendImageToParent(imgSrc);
            } else if (imgSrc.startsWith('blob:')) {
                fetch(imgSrc)
                    .then(res => res.blob())
                    .then(blob => {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                            sendImageToParent(reader.result);
                        };
                        reader.readAsDataURL(blob);
                    });
            }
        });

        searchGoogleBtn.addEventListener('click', () => {
            const query = searchInput.value.trim();
            if (query) {
                const searchUrl = 'https://www.google.com/search?tbm=isch&q=' + encodeURIComponent(query);
                window.open(searchUrl, '_blank');
            }
        });

        loadUrlBtn.addEventListener('click', () => {
            const url = urlInput.value.trim();
            loadImageFromUrl(url);
        });

        function loadImageFromUrl(url) {
            const urlTrimmed = url.trim();
            if (!urlTrimmed) {
                alert('Vui lòng nhập một liên kết hoặc dữ liệu hình ảnh.');
                return;
            }
            
            const handleDataUrl = (dataUrl) => {
                // Set the src for the in-memory processing image, and wait for it to load.
                originalImage.onload = function() {
                    // Once the in-memory image is loaded, update the display image and UI text.
                    originalImageEl.src = dataUrl;
                    originalImageEl.classList.remove('hidden');
                    originalInfo.textContent = 'Kích thước: ' + this.width + ' × ' + this.height + ' pixels';
                    fileInfo.textContent = 'Tải thành công!';
                    urlInput.value = '';
                };
                originalImage.onerror = () => {
                    alert('Dữ liệu ảnh cung cấp không hợp lệ.');
                    fileInfo.textContent = 'Lỗi xử lý ảnh.';
                };
                originalImage.src = dataUrl;
            };

            if (urlTrimmed.startsWith('data:image')) {
                fileInfo.textContent = '⏳ Đang xử lý dữ liệu ảnh...';
                handleDataUrl(urlTrimmed);
                return;
            }

            if (!urlTrimmed.startsWith('http')) {
                alert('Vui lòng nhập một liên kết hình ảnh hợp lệ (bắt đầu bằng http).');
                return;
            }

            fileInfo.textContent = '⏳ Đang tải ảnh từ URL...';
            originalImageEl.classList.add('hidden');
            originalInfo.textContent = '';
            
            const remoteImage = new Image();
            remoteImage.crossOrigin = "Anonymous";

            remoteImage.onload = function() {
                try {
                    const canvas = document.createElement('canvas');
                    canvas.width = this.naturalWidth;
                    canvas.height = this.naturalHeight;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(this, 0, 0);
                    const dataUrl = canvas.toDataURL('image/png');
                    handleDataUrl(dataUrl);
                } catch (e) {
                    console.error("Canvas error (likely CORS):", e);
                    alert('Không thể xử lý ảnh này do chính sách bảo mật (CORS). Vui lòng lưu ảnh về máy tính rồi upload.');
                    fileInfo.textContent = 'Lỗi khi xử lý ảnh từ URL.';
                }
            };

            remoteImage.onerror = function() {
                alert('Không thể tải hình ảnh từ liên kết này. Liên kết có thể bị hỏng hoặc không phải là ảnh.');
                fileInfo.textContent = 'Lỗi khi tải ảnh từ URL.';
            };
            
            remoteImage.src = urlTrimmed;
        }


        function handleFileUpload(event) {
            const file = event.target.files[0];
            if (!file) return;

            // Hiển thị thông tin file
            // FIX: A nested template literal here would cause a syntax error. Changed to string concatenation.
            fileInfo.textContent = 'File: ' + file.name + ' (' + (file.size/1024).toFixed(1) + 'KB)';

            const reader = new FileReader();
            reader.onload = function (e) {
                originalImage.src = e.target.result;
                originalImageEl.src = e.target.result;
                originalImageEl.classList.remove('hidden');
                
                // Hiển thị thông tin ảnh khi load xong
                originalImage.onload = function() {
                    // FIX: A nested template literal here would cause a syntax error. Changed to string concatenation.
                    originalInfo.textContent = 'Kích thước: ' + this.width + ' × ' + this.height + ' pixels';
                };
            };
            reader.readAsDataURL(file);
        }

        function resizeAndFitImage(widthRatio, heightRatio) {
            if (!originalImage.src) {
                alert("Vui lòng upload ảnh thuốc trước.");
                return;
            }

            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            const targetAspectRatio = widthRatio / heightRatio;
            const imageAspectRatio = originalImage.width / originalImage.height;

            let canvasWidth, canvasHeight, drawWidth, drawHeight, offsetX, offsetY;

            if (imageAspectRatio > targetAspectRatio) {
                // Ảnh rộng hơn tỉ lệ đích - fit theo chiều rộng
                canvasWidth = originalImage.width;
                canvasHeight = Math.round(canvasWidth / targetAspectRatio);
                drawWidth = originalImage.width;
                drawHeight = originalImage.height;
                offsetX = 0;
                offsetY = (canvasHeight - drawHeight) / 2;
            } else {
                // Ảnh cao hơn tỉ lệ đích - fit theo chiều cao
                canvasHeight = originalImage.height;
                canvasWidth = Math.round(canvasHeight * targetAspectRatio);
                drawWidth = originalImage.width;
                drawHeight = originalImage.height;
                offsetX = (canvasWidth - drawWidth) / 2;
                offsetY = 0;
            }

            canvas.width = canvasWidth;
            canvas.height = canvasHeight;

            // Nền trắng
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvasWidth, canvasHeight);

            // Vẽ ảnh vào giữa canvas
            ctx.drawImage(
                originalImage,
                0, 0, originalImage.width, originalImage.height,
                offsetX, offsetY, drawWidth, drawHeight
            );

            // Hiển thị kết quả
            previewCanvas.classList.remove('hidden');
            previewCanvas.width = canvasWidth;
            previewCanvas.height = canvasHeight;
            previewCanvas.getContext('2d').drawImage(canvas, 0, 0);

            processedImageEl.src = previewCanvas.toDataURL();
            processedImageEl.classList.remove('hidden');
            processedImageData = processedImageEl.src;

            // Hiện nút xóa nền
            removeBgButton.classList.remove('hidden');
            downloadButton.classList.remove('hidden');

            resizedCanvas = canvas;
        }

        async function removeBackground() {
            if (!resizedCanvas) {
                alert("Vui lòng chọn tỉ lệ khung ảnh trước.");
                return;
            }

            const apiKey = 'PcXx3hZwAvfH5tDzGK1uiHac'; // Thay bằng API key thực

            try {
                // Hiển thị thông báo đang xử lý
                removeBgButton.textContent = '⏳ Đang xóa nền...';
                removeBgButton.disabled = true;

                const blob = await new Promise((resolve) => resizedCanvas.toBlob(resolve, 'image/png'));
                const formData = new FormData();
                formData.append('image_file', blob);

                const response = await fetch('https://api.remove.bg/v1.0/removebg', {
                    method: 'POST',
                    headers: {
                        'X-Api-Key': apiKey,
                    },
                    body: formData,
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(errorText);
                }

                const processedBlob = await response.blob();
                processedImageData = URL.createObjectURL(processedBlob);
                processedImageEl.src = processedImageData;

                // Hiện nút download
                downloadButton.classList.remove('hidden');

            } catch (error) {
                console.error('Error removing background:', error);
                alert('Lỗi khi xóa nền: ' + error.message);
            } finally {
                removeBgButton.textContent = '🎯 Xóa nền ảnh';
                removeBgButton.disabled = false;
            }
        }

        function downloadImage() {
            if (!processedImageData) return;

            const link = document.createElement('a');
            link.href = processedImageData;
            // FIX: A nested template literal here would cause a syntax error. Changed to string concatenation.
            link.download = 'anh_thuoc_' + new Date().getTime() + '.png';
            link.click();
        }
    </script>
</body>
</html>
`;

type AspectRatio = '9:16' | '3:4' | '1:1' | '16:9' | '4:3';

const App: React.FC = () => {
  const [prompt, setPrompt] = useState<string>('');
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  
  const [pristineGeneratedImage, setPristineGeneratedImage] = useState<string | null>(null);
  const [displayGeneratedImage, setDisplayGeneratedImage] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [templates, setTemplates] = useLocalStorage<PromptTemplate[]>('promptTemplates', INITIAL_PROMPTS);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('9:16');
  
  const [isTranslating, setIsTranslating] = useState<boolean>(false);
  const [isEnhancing, setIsEnhancing] = useState<boolean>(false);

  const [isTextEditorOpen, setIsTextEditorOpen] = useState<boolean>(false);
  const [editingFileIndex, setEditingFileIndex] = useState<number | null>(null);
  const [originalExtractedTextLines, setOriginalExtractedTextLines] = useState<string[]>([]);
  const [isExtractingText, setIsExtractingText] = useState<boolean>(false);
  const [isApplyingText, setIsApplyingText] = useState<boolean>(false);
  
  const [isImageEditorOpen, setIsImageEditorOpen] = useState<boolean>(false);
  const [isApplyingEdit, setIsApplyingEdit] = useState<boolean>(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [isGeneratedTextEditorOpen, setIsGeneratedTextEditorOpen] = useState<boolean>(false);
  const [originalGeneratedTextLines, setOriginalGeneratedTextLines] = useState<string[]>([]);
  const [isExtractingGeneratedText, setIsExtractingGeneratedText] = useState<boolean>(false);
  const [isApplyingGeneratedText, setIsApplyingGeneratedText] = useState<boolean>(false);

  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);
  const [isViewingShared, setIsViewingShared] = useState<boolean>(false);
  const [sharedPrompt, setSharedPrompt] = useState<string>('');
  
  const [isVideoPromptModalOpen, setIsVideoPromptModalOpen] = useState<boolean>(false);
  const [isVideoGenerationModalOpen, setIsVideoGenerationModalOpen] = useState<boolean>(false);
  const [isVideoLoading, setIsVideoLoading] = useState<boolean>(false);
  const [videoGenerationStatus, setVideoGenerationStatus] = useState<string>('');
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
  const [videoError, setVideoError] = useState<string | null>(null);
  const currentVideoUrlRef = React.useRef<string | null>(null);

  const [isToolModalOpen, setIsToolModalOpen] = useState<boolean>(false);
  const [isQuoteToolModalOpen, setIsQuoteToolModalOpen] = useState<boolean>(false);
  const [quoteToolInstanceKey, setQuoteToolInstanceKey] = useState(0);

  const [isCanvasEditorOpen, setIsCanvasEditorOpen] = useState<boolean>(false);
  const [canvasElements, setCanvasElements] = useState<CanvasElement[]>([]);

  const [isApiKeySelected, setIsApiKeySelected] = useState<boolean>(false);

  useEffect(() => {
    try {
        if (window.location.hash && window.location.hash.startsWith('#share=')) {
            const encodedData = window.location.hash.substring(7);
            const decodedString = b64_to_utf8(encodedData);
            if (!decodedString) {
                window.location.hash = '';
                return;
            }
            const data = JSON.parse(decodedString);

            if (data.image && typeof data.prompt === 'string') {
                setDisplayGeneratedImage(`data:image/png;base64,${data.image}`);
                setSharedPrompt(data.prompt);
                setIsViewingShared(true);
            } else {
                window.location.hash = '';
            }
        }
    } catch (e) {
        console.error("Failed to parse share data from URL hash:", e);
        window.location.hash = '';
    }
  }, []);

  useEffect(() => {
    const checkApiKey = async () => {
        if (window.aistudio && await window.aistudio.hasSelectedApiKey()) {
            setIsApiKeySelected(true);
        }
    };
    checkApiKey();
  }, []);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
        const { type, payload } = event.data;

        if (type === 'toolImageUpload' && payload && typeof payload.base64 === 'string') {
            const newFile: UploadedFile = {
                name: payload.name || 'edited-image.png',
                type: payload.type || 'image/png',
                size: (payload.base64.length * 3) / 4,
                base64: payload.base64,
            };
            setUploadedFiles(prev => [...prev, newFile]);
            setIsToolModalOpen(false);
        }
    };

    window.addEventListener('message', handleMessage);
    return () => {
        window.removeEventListener('message', handleMessage);
    };
  }, []);

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

  const openAndResetQuoteTool = () => {
    setQuoteToolInstanceKey(prevKey => prevKey + 1);
    setIsQuoteToolModalOpen(true);
  };
  
  const getAspectRatioDescription = (ratio: AspectRatio): string => {
    switch (ratio) {
        case '9:16': return 'a tall vertical image (like a phone screen)';
        case '3:4': return 'a standard vertical portrait image';
        case '1:1': return 'a perfect square image';
        case '16:9': return 'a wide horizontal image (like a movie screen)';
        case '4:3': return 'a standard horizontal landscape image';
        default: return `an image with a ${ratio} ratio`;
    }
  }

  const handleTranslatePrompt = async () => {
      if (!prompt.trim()) return;
      setIsTranslating(true);
      try {
          const response = await ai.models.generateContent({
              model: 'gemini-2.5-flash',
              contents: `Translate the following text to English for an image generation prompt: "${prompt}"`,
              config: {
                  systemInstruction: "You are an expert translator. Provide only the translated English text, without any additional comments or explanations."
              }
          });
          setPrompt(response.text.trim());
      } catch (e) {
          console.error("Translation failed:", e);
          setError(`Translation failed: ${(e as Error).message}`);
      } finally {
          setIsTranslating(false);
      }
  };

  const handleEnhancePrompt = async () => {
      if (!prompt.trim()) return;
      setIsEnhancing(true);
      try {
          const response = await ai.models.generateContent({
              model: 'gemini-2.5-flash',
              contents: `Please enhance this prompt for an AI image generator: "${prompt}"`,
              config: {
                  systemInstruction: "You are an expert prompt engineer for text-to-image AI models. Your task is to rewrite and expand upon the user's prompt to make it more descriptive, vivid, and effective for generating a high-quality, detailed, and visually stunning image. Add details about composition, lighting, art style, color palette, and mood. Respond only with the enhanced prompt itself, without any introductory phrases, explanations, or labels like 'Enhanced Prompt:'."
              }
          });
          setPrompt(response.text.trim());
      } catch (e) {
          console.error("Enhancement failed:", e);
          setError(`Enhancement failed: ${(e as Error).message}`);
      } finally {
          setIsEnhancing(false);
      }
  };

  const handleGenerateImage = async () => {
    if (!prompt.trim()) {
      setError('Please enter a prompt to generate an image.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setPristineGeneratedImage(null);
    setDisplayGeneratedImage(null);
    setCanvasElements([]); // Reset canvas elements for the new image

    try {
      let newImageBase64: string | undefined;

      if (uploadedFiles.length > 0) {
        const imageParts = uploadedFiles.map(file => ({
            inlineData: { mimeType: file.type, data: file.base64 }
        }));
        
        const aspectRatioInstruction = `The most important, critical, and non-negotiable instruction is that the final output image's aspect ratio MUST BE exactly ${aspectRatio}. It should be a ${getAspectRatioDescription(aspectRatio)}. Do not deviate from this aspect ratio under any circumstances.`;
        const fullPrompt = `${aspectRatioInstruction} Now, for the creative part of the request, generate an image based on the uploaded elements and the following prompt: "${prompt}"`;
        const textPart = { text: fullPrompt };

        const allParts = [textPart, ...imageParts];

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts: allParts },
            config: {
                responseModalities: [Modality.IMAGE],
            }
        });
        const imagePart = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData);
        newImageBase64 = imagePart?.inlineData?.data;

      } else {
        const response = await ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: prompt,
            config: {
                numberOfImages: 1,
                outputMimeType: 'image/png',
                aspectRatio: aspectRatio,
            },
        });
        newImageBase64 = response.generatedImages?.[0]?.image?.imageBytes;
      }

      if (newImageBase64) {
        const imageWithPrefix = `data:image/png;base64,${newImageBase64}`;
        setPristineGeneratedImage(imageWithPrefix);
        setDisplayGeneratedImage(imageWithPrefix);
      } else {
        setError('Image generation failed. The model did not return an image.');
      }
    } catch (e) {
      console.error(e);
      setError(`An error occurred: ${(e as Error).message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenVideoPromptModal = async () => {
    if (window.aistudio) {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        if (!hasKey) {
            await window.aistudio.openSelectKey();
        }
        setIsApiKeySelected(true);
        setIsVideoPromptModalOpen(true);
    }
  };

  const handleGenerateVideo = async (videoPrompt: string) => {
    if (!pristineGeneratedImage) {
        setVideoError("No base image available to generate a video from.");
        return;
    }
    setIsVideoPromptModalOpen(false);
    setIsVideoGenerationModalOpen(true);
    setIsVideoLoading(true);
    setVideoGenerationStatus("Initializing video generation...");
    setGeneratedVideoUrl(null);
    setVideoError(null);

    try {
        if (window.aistudio && !await window.aistudio.hasSelectedApiKey()) {
            await window.aistudio.openSelectKey();
        }

        const videoAI = new GoogleGenAI({ apiKey: process.env.API_KEY! });

        let operation = await videoAI.models.generateVideos({
            model: 'veo-3.1-fast-generate-preview',
            prompt: videoPrompt,
            image: {
                imageBytes: stripBase64Prefix(pristineGeneratedImage),
                mimeType: 'image/png',
            },
            config: {
                numberOfVideos: 1,
                resolution: '720p',
                aspectRatio: '9:16'
            }
        });
        
        setVideoGenerationStatus("Video is processing... This can take several minutes.");

        while (!operation.done) {
            await new Promise(resolve => setTimeout(resolve, 10000));
            operation = await videoAI.operations.getVideosOperation({ operation: operation });
        }
        
        setVideoGenerationStatus("Finalizing video...");

        const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
        if (downloadLink) {
            const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
            if (!response.ok) throw new Error(`Failed to fetch video: ${response.statusText}`);
            const blob = await response.blob();
            const videoObjectURL = URL.createObjectURL(blob);
            currentVideoUrlRef.current = videoObjectURL;
            setGeneratedVideoUrl(videoObjectURL);
        } else {
            throw new Error("Video generation completed, but no download link was provided.");
        }

    } catch (e) {
        console.error(e);
        const errorMessage = (e as Error).message;
        if (errorMessage.includes("Requested entity was not found.")) {
             setVideoError("API Key validation failed. Please try selecting your API key again. A link to the billing documentation can be found at ai.google.dev/gemini-api/docs/billing");
             setIsApiKeySelected(false);
        } else {
            setVideoError(`An error occurred: ${errorMessage}`);
        }
    } finally {
        setIsVideoLoading(false);
        setVideoGenerationStatus("");
    }
  };

  useEffect(() => {
    return () => {
      if (currentVideoUrlRef.current) {
        URL.revokeObjectURL(currentVideoUrlRef.current);
      }
    };
  }, []);

  const handleOpenImageEditor = () => {
    if (displayGeneratedImage) {
        setIsImageEditorOpen(true);
        setEditError(null);
    }
  }

  const handleApplyImageEdit = async (maskBase64: string, editPrompt: string) => {
    if (!displayGeneratedImage) return;
    setIsApplyingEdit(true);
    setEditError(null);
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
                parts: [
                    { inlineData: { mimeType: 'image/png', data: stripBase64Prefix(displayGeneratedImage) } },
                    { text: editPrompt },
                    { inlineData: { mimeType: 'image/png', data: maskBase64 } }
                ]
            },
            config: { responseModalities: [Modality.IMAGE] }
        });
        const imagePart = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData);
        const newImageBase64 = imagePart?.inlineData?.data;
        if (newImageBase64) {
            const imageWithPrefix = `data:image/png;base64,${newImageBase64}`;
            setDisplayGeneratedImage(imageWithPrefix);
            setPristineGeneratedImage(imageWithPrefix);
            setIsImageEditorOpen(false);
        } else {
            setEditError('Image editing failed. The model did not return an image.');
        }
    } catch (e) {
        console.error(e);
        setEditError(`An error occurred during editing: ${(e as Error).message}`);
    } finally {
        setIsApplyingEdit(false);
    }
  }

  const handleOpenTextEditor = async (index: number | 'generated') => {
    const isForGenerated = index === 'generated';
    const targetFile = isForGenerated ? { base64: displayGeneratedImage || '', type: 'image/png', name: 'Generated Image' } : uploadedFiles[index];
    if (!targetFile || !targetFile.base64) return;

    if (isForGenerated) {
        setIsGeneratedTextEditorOpen(true);
        setIsExtractingGeneratedText(true);
        setOriginalGeneratedTextLines([]);
    } else {
        setEditingFileIndex(index);
        setIsTextEditorOpen(true);
        setIsExtractingText(true);
        setOriginalExtractedTextLines([]);
    }

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: {
                parts: [
                    { text: "Extract all text from this image, line by line. Provide only the extracted text, with each line on a new line. Do not include any other commentary." },
                    { inlineData: { mimeType: targetFile.type, data: targetFile.base64 } }
                ]
            },
        });
        const extractedLines = response.text.trim().split('\n').filter(line => line.trim() !== '');
        if (isForGenerated) setOriginalGeneratedTextLines(extractedLines);
        else setOriginalExtractedTextLines(extractedLines);
    } catch (e) {
        console.error("Text extraction failed:", e);
        if (isForGenerated) setOriginalGeneratedTextLines(['Error extracting text.']);
        else setOriginalExtractedTextLines(['Error extracting text.']);
    } finally {
        if (isForGenerated) setIsExtractingGeneratedText(false);
        else setIsExtractingText(false);
    }
  }
  
  const handleApplyTextChanges = async (newTextLines: string[], index: number | 'generated') => {
    const isForGenerated = index === 'generated';
    const originalLines = isForGenerated ? originalGeneratedTextLines : originalExtractedTextLines;
    const targetFile = isForGenerated ? { base64: displayGeneratedImage || '', type: 'image/png' } : uploadedFiles[index as number];
    if (!targetFile || !targetFile.base64) return;
    
    let textChangePrompt = 'Critically important: Edit the text in the provided image. ';
    originalLines.forEach(line => {
      if (!newTextLines.includes(line)) textChangePrompt += `Remove the text "${line}". `;
    });
    const modifiedOrAdded = newTextLines.filter(line => !originalLines.includes(line));
    if (modifiedOrAdded.length > 0) {
        textChangePrompt += `Add or modify text to include: ${modifiedOrAdded.map(l => `"${l}"`).join(', ')}. `;
    }

    if (modifiedOrAdded.length === 0 && textChangePrompt === 'Critically important: Edit the text in the provided image. ') {
        if (isForGenerated) setIsGeneratedTextEditorOpen(false); else setIsTextEditorOpen(false);
        return;
    }
    
    if (isForGenerated) setIsApplyingGeneratedText(true); else setIsApplyingText(true);
    
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts: [{ inlineData: { mimeType: targetFile.type, data: stripBase64Prefix(targetFile.base64) } }, { text: textChangePrompt }] },
            config: { responseModalities: [Modality.IMAGE] }
        });
        const newImageBase64 = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData)?.inlineData?.data;

        if (newImageBase64) {
            if (isForGenerated) {
                const fullBase64 = `data:image/png;base64,${newImageBase64}`;
                setDisplayGeneratedImage(fullBase64);
                setPristineGeneratedImage(fullBase64);
                setIsGeneratedTextEditorOpen(false);
            } else {
                setUploadedFiles(files => files.map((file, i) => i === index ? { ...file, base64: newImageBase64 } : file));
                setIsTextEditorOpen(false);
            }
        } else {
             if (isForGenerated) setOriginalGeneratedTextLines(prev => [...prev, 'Error: Could not apply changes.']);
             else setOriginalExtractedTextLines(prev => [...prev, 'Error: Could not apply changes.']);
        }
    } catch (e) {
        console.error("Text application failed:", e);
    } finally {
        if (isForGenerated) setIsApplyingGeneratedText(false); else setIsApplyingText(false);
    }
  };

  const handleOpenShareModal = () => {
    if (displayGeneratedImage) setIsShareModalOpen(true);
  };

  const handleClearSharedView = () => {
    setIsViewingShared(false);
    setDisplayGeneratedImage(null);
    setSharedPrompt('');
    window.location.hash = '';
  }
  
  const handleDoubleClickGeneratedImage = () => {
    const iframe = document.getElementById('quote-tool-iframe') as HTMLIFrameElement;
    if (iframe && iframe.contentWindow && displayGeneratedImage) {
        iframe.contentWindow.postMessage({
            type: 'addImageToQuote',
            payload: { base64: displayGeneratedImage }
        }, '*');
    }
  };

  const handleOpenCanvasEditor = () => {
    if (pristineGeneratedImage) {
        setIsCanvasEditorOpen(true);
    }
  };

  const handleApplyCanvasChanges = (newImageBase64: string, elements: CanvasElement[]) => {
    setDisplayGeneratedImage(newImageBase64);
    setPristineGeneratedImage(newImageBase64);
    setCanvasElements(elements);
    setIsCanvasEditorOpen(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header onToolButtonClick={() => setIsToolModalOpen(true)} onQuoteToolButtonClick={openAndResetQuoteTool} />
      <main className="container mx-auto p-4 md:p-8">
        {isViewingShared ? (
            <div className="bg-white p-6 rounded-lg shadow-lg mb-8 text-center">
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Viewing a Shared Design</h2>
                <p className="text-gray-600 mb-4">Prompt used: <em className="bg-gray-100 p-1 rounded">{sharedPrompt}</em></p>
                <GeneratedImageDisplay
                    isLoading={false}
                    generatedImage={displayGeneratedImage}
                    error={null}
                    onEditImage={() => {}} onEditText={() => {}} onShare={() => {}} onGenerateVideo={() => {}} onDoubleClick={() => {}} onOpenCanvasEditor={() => {}}
                />
                 <button 
                    onClick={handleClearSharedView}
                    className="mt-6 inline-flex items-center justify-center bg-indigo-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-indigo-700 transition-colors"
                >
                    Create Your Own
                </button>
            </div>
        ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-8">
                    <ImageUploader 
                        uploadedFiles={uploadedFiles} 
                        setUploadedFiles={setUploadedFiles}
                        onRemoveBackground={async (index) => {
                             const file = uploadedFiles[index];
                             if (!file) return;
                             setUploadedFiles(files => files.map((f, i) => i === index ? { ...f, isProcessing: true } : f));
                             try {
                                const response = await ai.models.generateContent({
                                    model: 'gemini-2.5-flash-image',
                                    contents: { parts: [ { text: "Remove the background of this image perfectly. The output must be a PNG with a transparent background." }, { inlineData: { mimeType: file.type, data: file.base64 } } ] },
                                    config: { responseModalities: [Modality.IMAGE] }
                                });
                                const imagePart = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData);
                                const newB64 = imagePart?.inlineData?.data;
                                if (newB64) {
                                     setUploadedFiles(files => files.map((f, i) => i === index ? { ...f, base64: newB64, name: `${f.name.split('.')[0]}_no_bg.png` } : f));
                                }
                             } catch(e) { console.error(e); } finally {
                                setUploadedFiles(files => files.map((f, i) => i === index ? { ...f, isProcessing: false } : f));
                             }
                        }}
                        onEditText={(index) => handleOpenTextEditor(index)}
                    />
                    <PromptManager
                        prompt={prompt}
                        setPrompt={setPrompt}
                        templates={templates}
                        setTemplates={setTemplates}
                        onTranslate={handleTranslatePrompt}
                        onEnhance={handleEnhancePrompt}
                        isTranslating={isTranslating}
                        isEnhancing={isEnhancing}
                    />
                    <AspectRatioSelector selectedAspectRatio={aspectRatio} setSelectedAspectRatio={setAspectRatio} />
                    <button
                        onClick={handleGenerateImage}
                        disabled={isLoading || !prompt.trim()}
                        className="w-full bg-indigo-600 text-white font-bold text-lg py-4 px-6 rounded-lg hover:bg-indigo-700 transition-colors disabled:bg-indigo-300 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                    >
                        {isLoading && <Spinner />}
                        {isLoading ? 'Generating...' : 'Generate Poster'}
                    </button>
                </div>
                <div className="flex justify-center items-center bg-gray-100 p-4 rounded-lg min-h-[400px] lg:min-h-0">
                    <GeneratedImageDisplay
                        isLoading={isLoading}
                        generatedImage={displayGeneratedImage}
                        error={error}
                        onEditImage={handleOpenImageEditor}
                        onEditText={() => handleOpenTextEditor('generated')}
                        onShare={handleOpenShareModal}
                        onGenerateVideo={handleOpenVideoPromptModal}
                        onDoubleClick={handleDoubleClickGeneratedImage}
                        onOpenCanvasEditor={handleOpenCanvasEditor}
                    />
                </div>
            </div>
        )}
      </main>
      
      {/* Modals */}
      <TextEditorModal
          isOpen={isTextEditorOpen}
          onClose={() => setIsTextEditorOpen(false)}
          file={editingFileIndex !== null ? uploadedFiles[editingFileIndex] : null}
          initialTextLines={originalExtractedTextLines}
          isExtracting={isExtractingText}
          isApplying={isApplyingText}
          onApply={(newLines) => editingFileIndex !== null && handleApplyTextChanges(newLines, editingFileIndex)}
          onReExtract={() => editingFileIndex !== null && handleOpenTextEditor(editingFileIndex)}
      />

      <TextEditorModal
          isOpen={isGeneratedTextEditorOpen}
          onClose={() => setIsGeneratedTextEditorOpen(false)}
          file={{ name: 'Generated Image', type: 'image/png', size: 0, base64: displayGeneratedImage || '' }}
          initialTextLines={originalGeneratedTextLines}
          isExtracting={isExtractingGeneratedText}
          isApplying={isApplyingGeneratedText}
          onApply={(newLines) => handleApplyTextChanges(newLines, 'generated')}
          onReExtract={() => handleOpenTextEditor('generated')}
      />

      <ImageEditorModal
          isOpen={isImageEditorOpen}
          onClose={() => setIsImageEditorOpen(false)}
          imageSrc={displayGeneratedImage || ''}
          onApply={handleApplyImageEdit}
          isApplying={isApplyingEdit}
          error={editError}
      />
      
       <CanvasEditorModal
          isOpen={isCanvasEditorOpen}
          onClose={() => setIsCanvasEditorOpen(false)}
          imageSrc={pristineGeneratedImage || ''}
          initialElements={canvasElements}
          onApply={handleApplyCanvasChanges}
          ai={ai}
        />

      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        generatedImage={displayGeneratedImage || ''}
        prompt={prompt}
      />

      <VideoPromptModal
        isOpen={isVideoPromptModalOpen}
        onClose={() => setIsVideoPromptModalOpen(false)}
        imageSrc={pristineGeneratedImage || ''}
        initialPrompt={prompt}
        isGenerating={isVideoLoading}
        onSubmit={handleGenerateVideo}
      />

      <VideoGenerationModal
        isOpen={isVideoGenerationModalOpen}
        onClose={() => setIsVideoGenerationModalOpen(false)}
        isLoading={isVideoLoading}
        status={videoGenerationStatus}
        videoUrl={generatedVideoUrl}
        error={videoError}
      />
      
      <IframeModal
        isOpen={isToolModalOpen}
        onClose={() => setIsToolModalOpen(false)}
        htmlContent={TOOL_PAGE_HTML}
        title="Công Cụ Chỉnh Sửa Ảnh"
      />
      
      <IframeModal
        key={quoteToolInstanceKey}
        id="quote-tool-iframe"
        isOpen={isQuoteToolModalOpen}
        onClose={() => setIsQuoteToolModalOpen(false)}
        htmlContent={QUOTE_TOOL_PAGE_HTML}
        title="Tạo Bảng Báo Giá"
      />
    </div>
  );
};

export default App;
