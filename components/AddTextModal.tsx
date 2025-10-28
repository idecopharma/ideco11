import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { TrashIcon, TextBoxIcon, AlignLeftIcon, AlignCenterIcon, AlignRightIcon, UnderlineIcon, PhotoIcon, PaintBrushIcon, EraserIcon, RectangleIcon, EllipseIcon, DiamondIcon } from './Icons';
import type { CanvasElement, TextProperties, ImageProperties, BannerProperties } from '../types';

// --- TYPE DEFINITIONS ---
interface CompleteTextStyle {
    fontSize: number; fontFamily: string; color: string;
    isBold: boolean; isItalic: boolean; isUnderline: boolean;
}

interface AddTextModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageSrc: string;
  initialElements: CanvasElement[];
  onApply: (newImageBase64: string, elements: CanvasElement[]) => void;
}

type ActionType = 'move' | 'rotate' | 'none' | 'skew-x' | 'skew-y' |
  'resize-top-left' | 'resize-top-right' |
  'resize-bottom-left' | 'resize-bottom-right';

interface ActionState {
    type: ActionType;
    elementId: number | null;
    initialMousePos: { x: number; y: number };
    initialElement: CanvasElement | null;
}

const FONT_FACES = [
    'Arial', 'Verdana', 'Helvetica', 'Tahoma', 'Trebuchet MS', 'Times New Roman',
    'Georgia', 'Garamond', 'Courier New', 'Brush Script MT', 'Impact', 'Roboto', 'Montserrat'
];

const TEXT_STYLE_TEMPLATES: { name: string; style: Partial<TextProperties> }[] = [
    { name: 'Meme', style: { fontFamily: 'Impact', color: '#FFFFFF', text: 'TOP TEXT', strokeEnabled: true, strokeColor: '#000000', strokeWidth: 2, shadowEnabled: true, shadowColor: 'rgba(0,0,0,0.5)', shadowBlur: 3, shadowOffsetY: 3 } },
    { name: 'Neon', style: { fontFamily: 'Brush Script MT', color: '#FFFFFF', text: 'Neon Glow', shadowEnabled: true, shadowColor: '#FF00FF', shadowBlur: 15, strokeEnabled: true, strokeColor: '#FF00FF', strokeWidth: 1 } },
    { name: 'Elegant', style: { fontFamily: 'Garamond', color: '#333333', text: 'An Elegant Quote', isItalic: true } },
    { name: 'Headline', style: { fontFamily: 'Roboto', color: '#222222', text: 'Bold Headline', isBold: true, shadowEnabled: true, shadowColor: 'rgba(0,0,0,0.2)', shadowBlur: 2, shadowOffsetY: 2 } },
    { name: 'Retro', style: { fontFamily: 'Courier New', color: '#FBBF24', text: 'Retro Style', strokeEnabled: true, strokeColor: '#D97706', strokeWidth: 1 } },
    { name: 'Simple', style: { fontFamily: 'Arial', color: '#000000', text: 'Simple Text', isBold: false, isItalic: false, shadowEnabled: false, strokeEnabled: false } }
];

// --- HELPER FUNCTIONS ---
const rotatePoint = (point: {x: number, y: number}, center: {x: number, y: number}, angleDeg: number) => {
    const angleRad = angleDeg * Math.PI / 180;
    const cos = Math.cos(angleRad);
    const sin = Math.sin(angleRad);
    const dx = point.x - center.x;
    const dy = point.y - center.y;
    return {
        x: center.x + dx * cos - dy * sin,
        y: center.y + dx * sin + dy * cos
    };
};

const mergeRanges = <T extends {start: number, end: number}>(existingRanges: T[], newRange: T): T[] => {
    return [...existingRanges, newRange];
};

const getStyleForIndex = (index: number, el: TextProperties): CompleteTextStyle => {
    const style: CompleteTextStyle = {
        fontSize: el.fontSize, fontFamily: el.fontFamily, color: el.color,
        isBold: el.isBold, isItalic: el.isItalic, isUnderline: el.isUnderline,
    };
    for (const range of el.colorRanges) {
        if (index >= range.start && index < range.end) style.color = range.color;
    }
    for (const range of el.fontSizeRanges) {
        if (index >= range.start && index < range.end) style.fontSize = range.fontSize;
    }
    return style;
};


// --- MAIN COMPONENT ---
const AddTextModal: React.FC<AddTextModalProps> = ({ isOpen, onClose, imageSrc, initialElements, onApply }) => {
    const [elements, setElements] = useState<CanvasElement[]>([]);
    const [selectedElementId, setSelectedElementId] = useState<number | null>(null);
    const [isImageReady, setIsImageReady] = useState(false);
    const [selection, setSelection] = useState({ start: 0, end: 0 });
    const [activeTool, setActiveTool] = useState<'select' | 'brush' | 'eraser'>('select');
    const [brushSize, setBrushSize] = useState(20);
    const [brushColor, setBrushColor] = useState('#000000');
    const [isSelectingText, setIsSelectingText] = useState(false);

    const imageRef = useRef<HTMLImageElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const drawingCanvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const selectionStartRef = useRef(0);
    
    const actionState = useRef<ActionState>({ type: 'none', elementId: null, initialMousePos: {x:0, y:0}, initialElement: null });
    const isDrawingOnOverlay = useRef(false);
    const lastDrawPosition = useRef<{ x: number; y: number } | null>(null);
    const lastClickRef = useRef({ time: 0, elementId: null as number | null });

    const selectedElement = useMemo(() => {
        return elements.find(el => el.id === selectedElementId) || null;
    }, [elements, selectedElementId]);

    const getCtx = useCallback(() => canvasRef.current?.getContext('2d'), []);

    const getFontString = (style: Omit<CompleteTextStyle, 'color' | 'isUnderline'>) => {
        return `${style.isItalic ? 'italic ' : ''}${style.isBold ? 'bold ' : ''}${style.fontSize}px ${style.fontFamily}`;
    };
    
    const getWrappedLines = useCallback((ctx: CanvasRenderingContext2D, textEl: TextProperties): { line: string; startIndex: number }[] => {
        const { text, width: maxWidth } = textEl;
        // This is a simplified wrapping algorithm. It uses the default font style for measuring, which is an approximation
        // if the text has multiple styles. A fully style-aware wrapping algorithm is much more complex.
        // However, this is sufficient for the height and rendering calculations which ARE style-aware.
        ctx.font = getFontString(textEl);
        const paragraphs = text.split('\n');
        const allLines: { line: string; startIndex: number }[] = [];
        let textCursor = 0;

        paragraphs.forEach(paragraph => {
            if (paragraph === '') {
                allLines.push({ line: '', startIndex: textCursor });
                textCursor++; // Account for the \n
                return;
            }
            const words = paragraph.split(' ');
            let currentLine = '';
            let lineStartIndex = textCursor;

            for (const word of words) {
                const testLine = currentLine === '' ? word : `${currentLine} ${word}`;
                // Use the base style for wrapping measurement.
                ctx.font = getFontString(getStyleForIndex(lineStartIndex, textEl));
                if (ctx.measureText(testLine).width > maxWidth && currentLine !== '') {
                    allLines.push({ line: currentLine, startIndex: lineStartIndex });
                    const consumedLength = currentLine.length + 1; // +1 for the space
                    lineStartIndex += consumedLength;
                    currentLine = word;
                } else {
                    currentLine = testLine;
                }
            }
            allLines.push({ line: currentLine, startIndex: lineStartIndex });
            textCursor += paragraph.length + 1; // Move cursor to start of next paragraph
        });
        return allLines;
    }, []);

    const getElementMetrics = useCallback((el: CanvasElement) => {
        const hasWidth = 'width' in el;
        const width = hasWidth ? el.width : 0;
        let height: number;
        if (el.type === 'text') {
            const ctx = getCtx();
            if (!ctx) { 
                height = 0; 
            } else {
                const linesInfo = getWrappedLines(ctx, el);
    
                if (!linesInfo || linesInfo.length === 0) {
                    height = el.fontSize; // Fallback for empty text
                } else {
                    let totalHeight = 0;
    
                    // Calculate total height based on the max font size of each line
                    for (const lineInfo of linesInfo) {
                        let maxFontSizeInLine = 0;
                        if (lineInfo.line.length > 0) {
                            for (let j = 0; j < lineInfo.line.length; j++) {
                                const style = getStyleForIndex(lineInfo.startIndex + j, el);
                                if (style.fontSize > maxFontSizeInLine) {
                                    maxFontSizeInLine = style.fontSize;
                                }
                            }
                        } else {
                            // For an empty line, use the style of the preceding character or the base style
                            const style = lineInfo.startIndex > 0 ? getStyleForIndex(lineInfo.startIndex - 1, el) : el;
                            maxFontSizeInLine = style.fontSize;
                        }
                        totalHeight += maxFontSizeInLine * el.lineHeight;
                    }
    
                    // Correct for the last line not having trailing inter-line spacing
                    const lastLineInfo = linesInfo[linesInfo.length - 1];
                    let maxFontSizeInLastLine = 0;
                    if (lastLineInfo.line.length > 0) {
                        for (let j = 0; j < lastLineInfo.line.length; j++) {
                            const style = getStyleForIndex(lastLineInfo.startIndex + j, el);
                            if (style.fontSize > maxFontSizeInLastLine) {
                                maxFontSizeInLastLine = style.fontSize;
                            }
                        }
                    } else {
                         const style = lastLineInfo.startIndex > 0 ? getStyleForIndex(lastLineInfo.startIndex - 1, el) : el;
                         maxFontSizeInLastLine = style.fontSize;
                    }
                    totalHeight -= maxFontSizeInLastLine * (el.lineHeight - 1);
                    height = Math.max(el.fontSize, totalHeight);
                }
            }
        } else {
            height = el.height;
        }
        const centerX = el.x + width / 2;
        const centerY = el.y + height / 2;
        return { x: el.x, y: el.y, width, height, centerX, centerY };
    }, [getWrappedLines, getCtx]);
    
    const drawImageElement = (ctx: CanvasRenderingContext2D, el: ImageProperties) => {
        if (!el.imageElement) return;
        ctx.save();
        const { centerX, centerY } = getElementMetrics(el);
        ctx.translate(centerX, centerY);
        ctx.rotate(el.rotation * Math.PI / 180);
        ctx.transform(1, el.skewY, el.skewX, 1, 0, 0);
        ctx.drawImage(el.imageElement, -el.width/2, -el.height/2, el.width, el.height);
        ctx.restore();
    }
    
    const drawBannerElement = (ctx: CanvasRenderingContext2D, el: BannerProperties) => {
        ctx.save();
        const { centerX, centerY, width, height } = getElementMetrics(el);
        ctx.translate(centerX, centerY);
        ctx.rotate(el.rotation * Math.PI / 180);
        ctx.transform(1, el.skewY, el.skewX, 1, 0, 0);

        if (el.shadowEnabled) {
            ctx.shadowColor = el.shadowColor;
            ctx.shadowBlur = el.shadowBlur;
            ctx.shadowOffsetX = el.shadowOffsetX;
            ctx.shadowOffsetY = el.shadowOffsetY;
        }
        ctx.fillStyle = el.backgroundColor;

        if (el.shape === 'rectangle') {
            ctx.fillRect(-width / 2, -height / 2, width, height);
            ctx.shadowColor = 'transparent';
            if (el.strokeEnabled && el.strokeWidth > 0) {
                ctx.strokeStyle = el.strokeColor;
                ctx.lineWidth = el.strokeWidth;
                ctx.strokeRect(-width / 2, -height / 2, width, height);
            }
        } else if (el.shape === 'ellipse') {
            ctx.beginPath();
            ctx.ellipse(0, 0, width / 2, height / 2, 0, 0, 2 * Math.PI);
            ctx.fill();
            ctx.shadowColor = 'transparent';
            if (el.strokeEnabled && el.strokeWidth > 0) {
                ctx.strokeStyle = el.strokeColor;
                ctx.lineWidth = el.strokeWidth;
                ctx.stroke();
            }
        } else if (el.shape === 'diamond') {
            ctx.beginPath();
            ctx.moveTo(0, -height / 2); // Top
            ctx.lineTo(width / 2, 0);   // Right
            ctx.lineTo(0, height / 2);  // Bottom
            ctx.lineTo(-width / 2, 0);  // Left
            ctx.closePath();
            ctx.fill();
            ctx.shadowColor = 'transparent';
            if (el.strokeEnabled && el.strokeWidth > 0) {
                ctx.strokeStyle = el.strokeColor;
                ctx.lineWidth = el.strokeWidth;
                ctx.stroke();
            }
        }

        ctx.restore();
    }
    
     const drawTextElement = useCallback((ctx: CanvasRenderingContext2D, el: TextProperties) => {
        ctx.save();
        const { centerX, centerY, width, height } = getElementMetrics(el);
        ctx.translate(centerX, centerY);
        ctx.rotate(el.rotation * Math.PI / 180);
        ctx.transform(1, el.skewY, el.skewX, 1, 0, 0);

        if (el.shadowEnabled) {
            ctx.shadowColor = el.shadowColor; ctx.shadowBlur = el.shadowBlur;
            ctx.shadowOffsetX = el.shadowOffsetX; ctx.shadowOffsetY = el.shadowOffsetY;
        }
        const linesInfo = getWrappedLines(ctx, el);
        
        linesInfo.forEach((lineInfo, lineIndex) => {
            const { line, startIndex: lineStartIndex } = lineInfo;

            // Calculate the height of the current line based on its max font size
            let maxFontSizeInLine = 0;
            for (let i = 0; i < line.length; i++) {
                maxFontSizeInLine = Math.max(maxFontSizeInLine, getStyleForIndex(lineStartIndex + i, el).fontSize);
            }
            if (line.length === 0) {
                maxFontSizeInLine = getStyleForIndex(lineStartIndex, el).fontSize;
            }
            const lineHeight = maxFontSizeInLine * el.lineHeight;
            
            // Calculate Y position for the current line
            let lineY = -height / 2;
            for (let i = 0; i < lineIndex; i++) {
                const prevLine = linesInfo[i];
                let prevMaxFont = 0;
                 for (let j = 0; j < prevLine.line.length; j++) {
                    prevMaxFont = Math.max(prevMaxFont, getStyleForIndex(prevLine.startIndex + j, el).fontSize);
                 }
                 if (prevLine.line.length === 0) {
                     prevMaxFont = getStyleForIndex(prevLine.startIndex, el).fontSize;
                 }
                lineY += prevMaxFont * el.lineHeight;
            }


            let runs: {text: string, style: CompleteTextStyle}[] = [];
            if (line.length > 0) {
                let currentRun = { text: line[0], style: getStyleForIndex(lineStartIndex, el) };
                for (let i = 1; i < line.length; i++) {
                    const style = getStyleForIndex(lineStartIndex + i, el);
                    if (JSON.stringify(style) === JSON.stringify(currentRun.style)) {
                        currentRun.text += line[i];
                    } else { runs.push(currentRun); currentRun = { text: line[i], style }; }
                }
                runs.push(currentRun);
            }
            const totalLineWidth = runs.reduce((acc, run) => {
                ctx.font = getFontString(run.style); return acc + ctx.measureText(run.text).width;
            }, 0);
            let currentX = -width / 2;
            if (el.textAlign === 'center') currentX += (width - totalLineWidth) / 2;
            else if (el.textAlign === 'right') currentX += width - totalLineWidth;
            
            let lineCharIndex = 0;
            // First pass for selection highlight
            let tempX = currentX;
            for (const run of runs) {
                for (let i = 0; i < run.text.length; i++) {
                    const absoluteCharIndex = lineStartIndex + lineCharIndex + i;
                    if (selection.start !== selection.end && el.id === selectedElementId && absoluteCharIndex >= selection.start && absoluteCharIndex < selection.end) {
                        ctx.save();
                        ctx.font = getFontString(run.style);
                        const charWidth = ctx.measureText(run.text[i]).width;
                        ctx.fillStyle = 'rgba(0, 123, 255, 0.4)';
                        ctx.fillRect(tempX, lineY, charWidth, lineHeight);
                        ctx.restore();
                    }
                    ctx.font = getFontString(run.style);
                    tempX += ctx.measureText(run.text[i]).width;
                }
                lineCharIndex += run.text.length;
            }

            // Second pass for text
            runs.forEach(run => {
                ctx.font = getFontString(run.style); ctx.fillStyle = run.style.color; ctx.textBaseline = 'top';
                if (el.strokeEnabled && el.strokeWidth > 0) {
                    ctx.strokeStyle = el.strokeColor; ctx.lineWidth = el.strokeWidth * 2; ctx.strokeText(run.text, currentX, lineY);
                }
                ctx.fillText(run.text, currentX, lineY);
                if (run.style.isUnderline) {
                    const measuredWidth = ctx.measureText(run.text).width;
                    const underlineY = lineY + run.style.fontSize + 2;
                    ctx.beginPath(); ctx.moveTo(currentX, underlineY); ctx.lineTo(currentX + measuredWidth, underlineY);
                    ctx.strokeStyle = run.style.color; ctx.lineWidth = Math.max(1, run.style.fontSize / 15); ctx.stroke();
                }
                currentX += ctx.measureText(run.text).width;
            });
        });
        ctx.restore();
    }, [getElementMetrics, getWrappedLines, selection, selectedElementId]);

    const drawCanvas = useCallback(() => {
        const canvas = canvasRef.current; const ctx = getCtx(); const image = imageRef.current;
        if (!canvas || !ctx || !image || !isImageReady) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

        elements.forEach(el => {
            if (el.type === 'text') drawTextElement(ctx, el);
            else if (el.type === 'image') drawImageElement(ctx, el);
            else if (el.type === 'banner') drawBannerElement(ctx, el);
        });
        
        if (selectedElement && activeTool === 'select' && !isSelectingText) {
            const { centerX, centerY, width, height } = getElementMetrics(selectedElement);
            ctx.save();
            ctx.translate(centerX, centerY);
            ctx.rotate(selectedElement.rotation * Math.PI / 180);
            
            ctx.strokeStyle = '#007bff'; ctx.lineWidth = 1;
            ctx.setLineDash([4, 2]);
            ctx.strokeRect(-width / 2, -height / 2, width, height);
            ctx.setLineDash([]);
            
            const handleSize = 8;
            ctx.fillStyle = '#fff'; ctx.strokeStyle = '#007bff'; ctx.lineWidth = 2;
            
            const handleBaseCoords = [
                // Corners
                { x: -width / 2, y: -height / 2 }, { x: width / 2, y: -height / 2 },
                { x: -width / 2, y: height / 2 }, { x: width / 2, y: height / 2 },
                // Skew handles
                { x: 0, y: -height / 2 }, { x: 0, y: height / 2 },
                { x: -width / 2, y: 0 }, { x: width / 2, y: 0 },
            ];

            handleBaseCoords.forEach(coord => {
                ctx.strokeRect(coord.x - handleSize / 2, coord.y - handleSize / 2, handleSize, handleSize);
                ctx.fillRect(coord.x - handleSize / 2, coord.y - handleSize / 2, handleSize, handleSize);
            });
            
            ctx.beginPath(); ctx.moveTo(0, -height / 2); ctx.lineTo(0, -height / 2 - 20); ctx.stroke();
            ctx.beginPath(); ctx.arc(0, -height / 2 - 20, handleSize / 2, 0, 2 * Math.PI); ctx.fill(); ctx.stroke();
            ctx.restore();
        }
    }, [elements, selectedElement, isImageReady, drawTextElement, getElementMetrics, activeTool, isSelectingText, getCtx]);
    
    useEffect(() => {
        if (!isOpen) { setIsImageReady(false); return; }
        setElements([]); setSelectedElementId(null); setIsImageReady(false); setActiveTool('select');
        const image = new Image(); image.crossOrigin = "anonymous"; image.src = imageSrc; imageRef.current = image;
        if (image.complete) { setIsImageReady(true); } else { image.onload = () => setIsImageReady(true); }
    }, [isOpen, imageSrc]);

    useEffect(() => {
        if (isOpen) {
            const loadElements = async (initials: CanvasElement[]) => {
                const loadedElements = await Promise.all(initials.map(async el => {
                    if (el.type === 'image' && el.src && !el.imageElement) {
                        return new Promise((resolve) => {
                            const img = new Image();
                            img.onload = () => resolve({ ...el, imageElement: img });
                            img.onerror = (err) => {
                                console.error("Failed to load image for canvas:", err);
                                resolve(el);
                            };
                            img.src = el.src;
                        });
                    }
                    return el;
                }));
                setElements(loadedElements as CanvasElement[]);
            };
            loadElements(initialElements);
        } else {
            setElements([]);
        }
    }, [isOpen, initialElements]);

    useEffect(() => {
        if (!isOpen || !isImageReady) return;
        const resizeAndDraw = () => {
            const canvas = canvasRef.current; const drawingCanvas = drawingCanvasRef.current;
            const container = containerRef.current; const image = imageRef.current;
            if (!canvas || !container || !image || !drawingCanvas) return;
            const contW = container.clientWidth - 32; const contH = container.clientHeight - 32;
            const imgAR = image.naturalWidth / image.naturalHeight;
            let newW, newH;
            if (contW / contH > imgAR) { newH = contH; newW = newH * imgAR; } else { newW = contW; newH = newW / imgAR; }
            canvas.width = newW; canvas.height = newH;
            drawingCanvas.width = newW; drawingCanvas.height = newH;
            drawCanvas();
        };
        resizeAndDraw();
        window.addEventListener('resize', resizeAndDraw);
        return () => window.removeEventListener('resize', resizeAndDraw);
    }, [isOpen, isImageReady, drawCanvas]);
    
    useEffect(() => { drawCanvas(); }, [elements, selectedElementId, drawCanvas, selection]);

    const getCoords = (e: React.MouseEvent) => {
        const canvas = canvasRef.current; if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect(); return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    const getCharIndexAtPoint = useCallback((el: TextProperties, point: { x: number; y: number }): number => {
        const ctx = getCtx();
        if (!ctx) return -1;
    
        const { centerX, centerY, width, height } = getElementMetrics(el);
        const { skewX = 0, skewY = 0 } = el;
        const unrotatedPoint = rotatePoint(point, { x: centerX, y: centerY }, -el.rotation);
        
        const det = 1 - skewX * skewY;
        if (det === 0) return -1;
        const localX = unrotatedPoint.x - centerX;
        const localY = unrotatedPoint.y - centerY;
        const unskewedLocalX = (localX - skewX * localY) / det;
        const unskewedLocalY = (-skewY * localX + localY) / det;
        
        const linesInfo = getWrappedLines(ctx, el);
        
        let cumulativeY = -height / 2;

        for (const lineInfo of linesInfo) {
            const { line, startIndex: lineStartIndex } = lineInfo;

            let maxFontSizeInLine = 0;
             for (let i = 0; i < line.length; i++) {
                maxFontSizeInLine = Math.max(maxFontSizeInLine, getStyleForIndex(lineStartIndex + i, el).fontSize);
             }
             if (line.length === 0) {
                 maxFontSizeInLine = getStyleForIndex(lineStartIndex, el).fontSize;
             }
            const lineHeight = maxFontSizeInLine * el.lineHeight;

            if (unskewedLocalY >= cumulativeY && unskewedLocalY <= cumulativeY + lineHeight) {
                let runs: { text: string, style: CompleteTextStyle }[] = [];
                if (line.length > 0) {
                    let currentRun = { text: line[0], style: getStyleForIndex(lineStartIndex, el) };
                    for (let i = 1; i < line.length; i++) {
                        const style = getStyleForIndex(lineStartIndex + i, el);
                        if (JSON.stringify(style) === JSON.stringify(currentRun.style)) {
                            currentRun.text += line[i];
                        } else { runs.push(currentRun); currentRun = { text: line[i], style }; }
                    }
                    runs.push(currentRun);
                }
    
                const totalLineWidth = runs.reduce((acc, run) => { ctx.font = getFontString(run.style); return acc + ctx.measureText(run.text).width; }, 0);
    
                let currentX = -width / 2;
                if (el.textAlign === 'center') currentX += (width - totalLineWidth) / 2;
                else if (el.textAlign === 'right') currentX += width - totalLineWidth;
                
                let lineCharIndex = 0;
                for (const run of runs) {
                    for (let i = 0; i < run.text.length; i++) {
                        ctx.font = getFontString(run.style);
                        const charWidth = ctx.measureText(run.text[i]).width;
                        if (unskewedLocalX >= currentX && unskewedLocalX < currentX + charWidth) {
                            return lineStartIndex + lineCharIndex + i + (unskewedLocalX > currentX + charWidth / 2 ? 1 : 0);
                        }
                        currentX += charWidth;
                    }
                    lineCharIndex += run.text.length;
                }
                if (unskewedLocalX >= currentX) return lineStartIndex + line.length;
                if (unskewedLocalX < -width / 2) return lineStartIndex;
            }
            cumulativeY += lineHeight;
        }
        return el.text.length;
    }, [getElementMetrics, getWrappedLines, getCtx]);
    
    const getActionForMouseDown = (mousePos: {x: number, y: number}): {type: ActionType, element: CanvasElement | null} => {
        if (isSelectingText) return { type: 'none', element: null };
        for (const el of [...elements].reverse()) {
            const { centerX, centerY, width, height } = getElementMetrics(el);
            const center = { x: centerX, y: centerY };
            const unrotatedMousePos = rotatePoint(mousePos, center, -el.rotation);
            
            const handleSize = 10;
            const halfW = width / 2, halfH = height / 2;
            const localX = unrotatedMousePos.x - centerX; const localY = unrotatedMousePos.y - centerY;

            if (Math.abs(localX) < handleSize && Math.abs(localY + halfH + 20) < handleSize) return {type: 'rotate', element: el};
            
            if (Math.abs(localX + halfW) < handleSize && Math.abs(localY + halfH) < handleSize) return {type: 'resize-top-left', element: el};
            if (Math.abs(localX - halfW) < handleSize && Math.abs(localY + halfH) < handleSize) return {type: 'resize-top-right', element: el};
            if (Math.abs(localX + halfW) < handleSize && Math.abs(localY - halfH) < handleSize) return {type: 'resize-bottom-left', element: el};
            if (Math.abs(localX - halfW) < handleSize && Math.abs(localY - halfH) < handleSize) return {type: 'resize-bottom-right', element: el};

            if (Math.abs(localX) < handleSize && (Math.abs(localY + halfH) < handleSize || Math.abs(localY - halfH) < handleSize)) return {type: 'skew-y', element: el};
            if (Math.abs(localY) < handleSize && (Math.abs(localX + halfW) < handleSize || Math.abs(localX - halfW) < handleSize)) return {type: 'skew-x', element: el};

            if (unrotatedMousePos.x >= centerX - halfW && unrotatedMousePos.x <= centerX + halfW && unrotatedMousePos.y >= centerY - halfH && unrotatedMousePos.y <= centerY + halfH) return {type: 'move', element: el};
        }
        return {type: 'none', element: null};
    }
    
    // --- DRAWING LOGIC ---
    const startOverlayDrawing = (pos: { x: number; y: number }) => {
        isDrawingOnOverlay.current = true;
        lastDrawPosition.current = pos;
    };
    const drawOnOverlay = (pos: { x: number; y: number }) => {
        if (!isDrawingOnOverlay.current || !lastDrawPosition.current) return;
        const ctx = drawingCanvasRef.current?.getContext('2d');
        if (!ctx) return;
        ctx.beginPath();
        ctx.moveTo(lastDrawPosition.current.x, lastDrawPosition.current.y);
        ctx.lineTo(pos.x, pos.y);
        ctx.lineWidth = brushSize;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        if (activeTool === 'eraser') {
            ctx.globalCompositeOperation = 'destination-out';
        } else {
            ctx.globalCompositeOperation = 'source-over';
            ctx.strokeStyle = brushColor;
        }
        ctx.stroke();
        lastDrawPosition.current = pos;
    };
    const stopOverlayDrawing = () => {
        isDrawingOnOverlay.current = false;
        lastDrawPosition.current = null;
    };
    const clearDrawingCanvas = () => {
        const canvas = drawingCanvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (ctx && canvas) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
    };


    const handleMouseDown = (e: React.MouseEvent) => {
        const mousePos = getCoords(e);
        if (activeTool !== 'select') {
            startOverlayDrawing(mousePos);
            return;
        }
        const { type, element } = getActionForMouseDown(mousePos);

        const now = Date.now();
        const isDoubleClick = (now - lastClickRef.current.time) < 300 && lastClickRef.current.elementId === element?.id;
        
        lastClickRef.current = { time: now, elementId: element?.id ?? null };

        if (element && type === 'move' && element.type === 'text' && isDoubleClick) {
            e.preventDefault(); 
            setSelectedElementId(element.id);
            const index = getCharIndexAtPoint(element as TextProperties, mousePos);
            setIsSelectingText(true);
            selectionStartRef.current = index;
            setSelection({ start: index, end: index });
            if (textareaRef.current) {
                textareaRef.current.focus();
                textareaRef.current.setSelectionRange(index, index);
            }
            actionState.current = { type: 'none', elementId: element.id, initialMousePos: mousePos, initialElement: element };

        } else {
            if (element) {
                if (element.id !== selectedElementId) {
                    setSelection({ start: 0, end: 0 });
                }
                setSelectedElementId(element.id);
                actionState.current = { type, elementId: element.id, initialMousePos: mousePos, initialElement: element };
            } else {
                setSelectedElementId(null);
                setSelection({ start: 0, end: 0 });
                actionState.current = { type: 'none', elementId: null, initialMousePos: mousePos, initialElement: null };
            }
        }
    };
    
    const handleMouseMove = (e: React.MouseEvent) => {
        const mousePos = getCoords(e);
        if (activeTool !== 'select') {
            drawOnOverlay(mousePos);
            return;
        }

        if (isSelectingText && selectedElement && selectedElement.type === 'text') {
            const currentIndex = getCharIndexAtPoint(selectedElement as TextProperties, mousePos);
            const start = selectionStartRef.current;
            const newSelection = {
                start: Math.min(start, currentIndex),
                end: Math.max(start, currentIndex),
            };
            setSelection(newSelection);
            if (textareaRef.current) {
                textareaRef.current.setSelectionRange(newSelection.start, newSelection.end);
            }
            return;
        }

        const { type, initialMousePos, initialElement } = actionState.current;
        if (type === 'none' || !initialElement) return;

        const dx = mousePos.x - initialMousePos.x;
        const dy = mousePos.y - initialMousePos.y;
        const isShiftHeld = e.shiftKey;

        setElements(els => els.map(el => {
            if (el.id !== initialElement.id) return el;
            const angleRad = initialElement.rotation * Math.PI / 180;
            const cos = Math.cos(angleRad); const sin = Math.sin(angleRad);
            const localDx = dx * cos + dy * sin; const localDy = -dx * sin + dy * cos;
            
            if (type === 'move') return { ...el, x: initialElement.x + dx, y: initialElement.y + dy };
            if (type === 'rotate') {
                const metrics = getElementMetrics(initialElement); const center = { x: metrics.centerX, y: metrics.centerY };
                const startAngle = Math.atan2(initialMousePos.y - center.y, initialMousePos.x - center.x);
                const currentAngle = Math.atan2(mousePos.y - center.y, mousePos.x - center.x);
                const angleDiff = (currentAngle - startAngle) * 180 / Math.PI;
                return { ...el, rotation: (initialElement.rotation + angleDiff + 360) % 360 };
            }
            if (type === 'skew-x') {
                const skewFactor = 0.005;
                return { ...el, skewX: initialElement.skewX + localDx * skewFactor };
            }
            if (type === 'skew-y') {
                const skewFactor = 0.005;
                return { ...el, skewY: initialElement.skewY - localDy * skewFactor };
            }

            // --- RESIZE LOGIC ---
            const resizeText = (textEl: TextProperties) => {
                if (isShiftHeld) { // Proportional
                    const metrics = getElementMetrics(initialElement);
                    const center = { x: metrics.centerX, y: metrics.centerY };
                    const initialDist = Math.hypot(initialMousePos.x - center.x, initialMousePos.y - center.y);
                    const currentDist = Math.hypot(mousePos.x - center.x, mousePos.y - center.y);
                    if (initialDist === 0) return textEl;
                    const scale = currentDist / initialDist;
                    const newWidth = Math.max(20, initialElement.width * scale);
                    const newFontSize = Math.max(8, initialElement.fontSize * scale);
                    const newMetrics = getElementMetrics({ ...initialElement as TextProperties, width: newWidth, fontSize: newFontSize });
                    return { ...textEl, width: newWidth, fontSize: newFontSize, x: center.x - newWidth / 2, y: center.y - newMetrics.height / 2 };
                } else { // Freeform
                    let newWidth = textEl.width;
                    if (type.includes('right')) newWidth = Math.max(20, initialElement.width + localDx);
                    if (type.includes('left')) newWidth = Math.max(20, initialElement.width - localDx);
                    
                    const dw = newWidth - initialElement.width;
                    const initialMetrics = getElementMetrics(initialElement);
                    let shiftX = 0;
                    if (type.includes('right')) shiftX += dw / 2; if (type.includes('left')) shiftX -= dw / 2;
                    
                    const rotatedShiftX = shiftX * cos; const rotatedShiftY = shiftX * sin;
                    const oldCenter = { x: initialMetrics.centerX, y: initialMetrics.centerY };
                    const newCenter = { x: oldCenter.x + rotatedShiftX, y: oldCenter.y + rotatedShiftY };
                    
                    return { ...textEl, width: newWidth, x: newCenter.x - newWidth / 2, y: newCenter.y - initialMetrics.height / 2 };
                }
            };
            
            const resizeShape = (shapeEl: ImageProperties | BannerProperties) => {
                let newWidth = initialElement.width; let newHeight = initialElement.height;
                if (type.includes('right')) newWidth = Math.max(20, initialElement.width + localDx);
                if (type.includes('left')) newWidth = Math.max(20, initialElement.width - localDx);
                if (type.includes('bottom')) newHeight = Math.max(20, initialElement.height + localDy);
                if (type.includes('top')) newHeight = Math.max(20, initialElement.height - localDy);

                if (isShiftHeld && shapeEl.type === 'banner') {
                     const initialAspectRatio = initialElement.width / initialElement.height;
                     if (type.includes('left') || type.includes('right')) newHeight = newWidth / initialAspectRatio;
                     else newWidth = newHeight * initialAspectRatio;
                } else if (shapeEl.type === 'image') {
                    if (type.includes('left') || type.includes('right')) newHeight = newWidth / shapeEl.aspectRatio;
                    else newWidth = newHeight * shapeEl.aspectRatio;
                }

                const dw = newWidth - initialElement.width; const dh = newHeight - initialElement.height;
                let shiftX = 0; let shiftY = 0;
                if (type.includes('right')) shiftX += dw / 2; if (type.includes('left')) shiftX -= dw / 2;
                if (type.includes('bottom')) shiftY += dh / 2; if (type.includes('top')) shiftY -= dh / 2;
                const rotatedShiftX = shiftX * cos - shiftY * sin; const rotatedShiftY = shiftX * sin + shiftY * cos;
                const oldCenter = { x: initialElement.x + initialElement.width / 2, y: initialElement.y + initialElement.height / 2 };
                const newCenter = { x: oldCenter.x + rotatedShiftX, y: oldCenter.y + rotatedShiftY };
                return { ...shapeEl, width: newWidth, height: newHeight, x: newCenter.x - newWidth / 2, y: newCenter.y - newHeight / 2 };
            };
            
            if (type.startsWith('resize-')) {
                if (el.type === 'text') return resizeText(el);
                if (el.type === 'image' || el.type === 'banner') return resizeShape(el);
            }

            return el;
        }));
    };
    
    const handleMouseUp = () => {
        if (activeTool !== 'select') {
            stopOverlayDrawing();
        }
        if (isSelectingText) {
            setIsSelectingText(false);
        }
        actionState.current = { type: 'none', elementId: null, initialMousePos: {x:0, y:0}, initialElement: null };
    };
    
    const handleAddText = () => {
        const canvas = canvasRef.current; if (!canvas) return;
        const fontSize = Math.max(30, Math.round(canvas.height / 20));
        const width = canvas.width * 0.5;
        const newElement: TextProperties = {
            type: 'text', id: Date.now(), text: 'Your Text Here',
            x: (canvas.width - width) / 2, y: canvas.height / 2 - fontSize,
            width, fontSize, fontFamily: 'Arial', color: '#000000', colorRanges: [], fontSizeRanges: [],
            isBold: false, isItalic: false, isUnderline: false,
            textAlign: 'center', rotation: 0, skewX: 0, skewY: 0, lineHeight: 1.2, shadowEnabled: false, shadowColor: '#000000',
            shadowBlur: 5, shadowOffsetX: 5, shadowOffsetY: 5, strokeEnabled: false, strokeColor: '#ffffff', strokeWidth: 2
        };
        setElements(els => [...els, newElement]); setSelectedElementId(newElement.id); setActiveTool('select');
    };

    const handleAddBanner = (shape: 'rectangle' | 'ellipse' | 'diamond') => {
        const canvas = canvasRef.current; if (!canvas) return;
        const width = canvas.width * (shape === 'ellipse' ? 0.4 : 0.8);
        const height = canvas.height * (shape === 'ellipse' ? 0.2 : 0.15);
        const newElement: BannerProperties = {
            type: 'banner', id: Date.now(), shape,
            x: (canvas.width - width) / 2, y: (canvas.height - height) * 0.8,
            width, height, rotation: 0, skewX: 0, skewY: 0, backgroundColor: '#ffffff',
            shadowEnabled: true, shadowColor: '#000000', shadowBlur: 10, shadowOffsetX: 0, shadowOffsetY: 5,
            strokeEnabled: false, strokeColor: '#000000', strokeWidth: 2,
        };
        setElements(els => [...els, newElement]); setSelectedElementId(newElement.id); setActiveTool('select');
    };

    const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]; if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const canvas = canvasRef.current; if (!canvas) return;
                const imgAspectRatio = img.width / img.height;
                const newWidth = canvas.width * 0.3; const newHeight = newWidth / imgAspectRatio;
                const newImage: ImageProperties = {
                    type: 'image', id: Date.now(),
                    src: img.src,
                    imageElement: img,
                    x: (canvas.width - newWidth) / 2, y: (canvas.height - newHeight) / 2,
                    width: newWidth, height: newHeight, rotation: 0, skewX: 0, skewY: 0, aspectRatio: imgAspectRatio
                };
                setElements(els => [...els, newImage]); setSelectedElementId(newImage.id); setActiveTool('select');
            };
            img.src = event.target?.result as string;
        };
        reader.readAsDataURL(file); e.target.value = '';
    }
    
    const handleDeleteElement = () => {
        if (!selectedElementId) return;
        setElements(els => els.filter(el => el.id !== selectedElementId));
        setSelectedElementId(null);
    };

    const updateSelectedElement = (updates: Partial<CanvasElement>) => {
        if (!selectedElementId) return;
        setElements(els => els.map(el => (el.id === selectedElementId) ? { ...el, ...updates } : el));
    };
    
    const handleApply = () => {
        const canvas = canvasRef.current; const bgImage = imageRef.current;
        if (!canvas || !bgImage || !isImageReady) return;
        const exportCanvas = document.createElement('canvas');
        exportCanvas.width = bgImage.naturalWidth; exportCanvas.height = bgImage.naturalHeight;
        const exportCtx = exportCanvas.getContext('2d'); if (!exportCtx) return;
        exportCtx.drawImage(bgImage, 0, 0);

        const scaleX = exportCanvas.width / canvas.width; const scaleY = exportCanvas.height / canvas.height;
        elements.forEach(el => {
            if (el.type === 'text') {
                 const scaledEl = { ...el, x: el.x * scaleX, y: el.y * scaleY, width: el.width * scaleX, fontSize: el.fontSize * scaleY, fontSizeRanges: el.fontSizeRanges.map(r => ({...r, fontSize: r.fontSize * scaleY})), shadowBlur: el.shadowBlur * scaleY, shadowOffsetX: el.shadowOffsetX * scaleX, shadowOffsetY: el.shadowOffsetY * scaleY, strokeWidth: el.strokeWidth * scaleY };
                drawTextElement(exportCtx, scaledEl);
            } else if (el.type === 'image') {
                const scaledEl = { ...el, x: el.x * scaleX, y: el.y * scaleY, width: el.width * scaleX, height: el.height * scaleY };
                drawImageElement(exportCtx, scaledEl);
            } else if (el.type === 'banner') {
                 const scaledEl = { ...el, x: el.x * scaleX, y: el.y * scaleY, width: el.width * scaleX, height: el.height * scaleY, shadowBlur: el.shadowBlur * scaleY, shadowOffsetX: el.shadowOffsetX * scaleX, shadowOffsetY: el.shadowOffsetY * scaleY, strokeWidth: el.strokeWidth * scaleY };
                drawBannerElement(exportCtx, scaledEl);
            }
        });
        const drawingCanvas = drawingCanvasRef.current;
        if (drawingCanvas) {
            exportCtx.drawImage(drawingCanvas, 0, 0, exportCanvas.width, exportCanvas.height);
        }
        
        const elementsToSave = elements.map(el => {
            if (el.type === 'image') {
                const { imageElement, ...rest } = el;
                return rest;
            }
            return el;
        });

        onApply(exportCanvas.toDataURL('image/png'), elementsToSave as CanvasElement[]);
    };
    
    const handleColorChange = (newColor: string) => {
        const el = selectedElement;
        if (!el || el.type !== 'text') return;
        if (selection.start === selection.end) { updateSelectedElement({ color: newColor }); return; }
        const newRange = { start: selection.start, end: selection.end, color: newColor };
        updateSelectedElement({ colorRanges: mergeRanges(el.colorRanges, newRange) });
    };

    const handleFontSizeChange = (newSize: number) => {
        const el = selectedElement;
        if (!el || el.type !== 'text' || isNaN(newSize)) return;
        if (selection.start === selection.end) { updateSelectedElement({ fontSize: newSize }); return; }
        const newRange = { start: selection.start, end: selection.end, fontSize: newSize };
        updateSelectedElement({ fontSizeRanges: mergeRanges(el.fontSizeRanges, newRange) });
    };

    const handleApplyTemplate = (templateStyle: Partial<TextProperties>) => {
        if (selectedElement && selectedElement.type === 'text') {
            updateSelectedElement(templateStyle);
        }
    };

    const TextPreview = ({ element }: { element: TextProperties | null }) => {
        if (!element) return null;
        const spans: React.ReactNode[] = []; const fullText = element.text;
        const points = new Set([0, fullText.length]);
        element.colorRanges.forEach(r => { points.add(r.start); points.add(r.end); });
        element.fontSizeRanges.forEach(r => { points.add(r.start); points.add(r.end); });
        const sortedPoints = Array.from(points).sort((a, b) => a - b);
        for (let i = 0; i < sortedPoints.length - 1; i++) {
            const start = sortedPoints[i]; const end = sortedPoints[i + 1];
            if (start >= end) continue;
            const midPoint = Math.floor((start + end) / 2);
            const style = getStyleForIndex(midPoint, element);
            const text = fullText.substring(start, end);
            spans.push(<span key={start} style={{ color: style.color, fontSize: `${style.fontSize / 3}px`, whiteSpace: 'pre-wrap' }}>{text}</span>);
        }
        return <div className="p-2 border rounded-md bg-white min-h-[100px] text-left leading-tight">{spans}</div>;
    };

    const cursorStyle = useMemo(() => {
        if (activeTool === 'brush' || activeTool === 'eraser') return 'crosshair';
        if (isSelectingText) return 'text';
        return 'default';
    }, [activeTool, isSelectingText]);

    return (
        <div className={`fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4 ${isOpen ? '' : 'hidden'}`} onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl w-full h-full max-w-7xl max-h-[95vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                <input type="file" ref={imageInputRef} onChange={handleImageFileChange} className="hidden" accept="image/*" />
                <div className="flex justify-between items-center p-4 border-b">
                    <h3 className="text-xl font-bold text-gray-900">Add Text, Images & Banners</h3>
                     <div className="flex gap-2">
                       <button onClick={handleApply} className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700">Save &amp; Close</button>
                       <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">Cancel</button>
                    </div>
                </div>
                <div className="flex-grow flex min-h-0">
                    <div
                        ref={containerRef}
                        className="flex-grow flex justify-center items-center bg-gray-200 p-4 relative"
                        style={{ cursor: cursorStyle }}
                        onMouseDown={handleMouseDown} onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}
                    >
                        <canvas ref={canvasRef} className="shadow-lg bg-white z-0" />
                        <canvas ref={drawingCanvasRef} className="absolute shadow-lg pointer-events-none z-10" />
                    </div>
                    <div className="w-80 bg-gray-50 p-4 border-l flex flex-col gap-4 text-sm overflow-y-auto">
                        {!isImageReady ? ( <div className="m-auto flex flex-col items-center gap-4"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div><p className="text-gray-500">Loading Image...</p></div>
                        ) : (
                            <>
                                {/* ADD NEW ELEMENTS SECTION */}
                                <div className="space-y-3 pb-4 border-b">
                                    <h4 className="font-semibold text-base text-gray-800">1. Add Layer</h4>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button onClick={handleAddText} className="px-2 py-2 text-xs font-medium flex items-center justify-center gap-2 bg-white border border-gray-300 rounded-md hover:bg-gray-100 transition-colors"><TextBoxIcon className="w-4 h-4"/> Text</button>
                                        <button onClick={() => handleAddBanner('rectangle')} className="px-2 py-2 text-xs font-medium flex items-center justify-center gap-2 bg-white border border-gray-300 rounded-md hover:bg-gray-100 transition-colors"><RectangleIcon className="w-4 h-4"/> Rectangle</button>
                                        <button onClick={() => handleAddBanner('ellipse')} className="px-2 py-2 text-xs font-medium flex items-center justify-center gap-2 bg-white border border-gray-300 rounded-md hover:bg-gray-100 transition-colors"><EllipseIcon className="w-4 h-4"/> Ellipse</button>
                                        <button onClick={() => handleAddBanner('diamond')} className="px-2 py-2 text-xs font-medium flex items-center justify-center gap-2 bg-white border border-gray-300 rounded-md hover:bg-gray-100 transition-colors"><DiamondIcon className="w-4 h-4"/> Diamond</button>
                                        <button onClick={() => imageInputRef.current?.click()} className="col-span-2 px-2 py-2 text-xs font-medium flex items-center justify-center gap-2 bg-white border border-gray-300 rounded-md hover:bg-gray-100 transition-colors"><PhotoIcon className="w-4 h-4"/> Image from file</button>
                                    </div>
                                </div>

                                {/* TEXT STYLE TEMPLATES */}
                                {selectedElement?.type === 'text' && (
                                     <div className="space-y-3 pb-4 border-b">
                                        <h4 className="font-semibold text-base text-gray-800">Text Style Templates</h4>
                                        <div className="grid grid-cols-2 gap-2">
                                            {TEXT_STYLE_TEMPLATES.map(template => (
                                                <button 
                                                    key={template.name} 
                                                    onClick={() => handleApplyTemplate(template.style)}
                                                    className="p-2 border rounded-md text-center text-xs truncate bg-white"
                                                    title={template.name}
                                                >
                                                    <span style={{
                                                        fontFamily: template.style.fontFamily,
                                                        fontWeight: template.style.isBold ? 'bold' : 'normal',
                                                        fontStyle: template.style.isItalic ? 'italic' : 'normal',
                                                        color: template.style.color,
                                                        textShadow: template.style.shadowEnabled ? `${template.style.shadowOffsetX || 0}px ${template.style.shadowOffsetY || 0}px ${template.style.shadowBlur || 0}px ${template.style.shadowColor}` : 'none',
                                                        WebkitTextStroke: template.style.strokeEnabled ? `${template.style.strokeWidth}px ${template.style.strokeColor}` : 'none',
                                                    }}>
                                                        {template.name}
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* DRAWING TOOLS SECTION */}
                                <div className="space-y-3 pb-4 border-b">
                                    <h4 className="font-semibold text-base text-gray-800">2. Draw or Erase</h4>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button onClick={() => { setActiveTool('brush'); setSelectedElementId(null); }} className={`p-2 rounded-md flex items-center justify-center gap-2 border-2 transition-colors ${activeTool === 'brush' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white hover:bg-gray-100 border-gray-300'}`}><PaintBrushIcon className="w-5 h-5" /> Brush</button>
                                        <button onClick={() => { setActiveTool('eraser'); setSelectedElementId(null); }} className={`p-2 rounded-md flex items-center justify-center gap-2 border-2 transition-colors ${activeTool === 'eraser' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white hover:bg-gray-100 border-gray-300'}`}><EraserIcon className="w-5 h-5" /> Eraser</button>
                                    </div>
                                    {(activeTool === 'brush' || activeTool === 'eraser') && (
                                        <div className="p-2 border rounded-md bg-white space-y-3">
                                            <div>
                                                <label htmlFor="brush-size" className="font-medium">Size: {brushSize}px</label>
                                                <input id="brush-size" type="range" min="1" max="100" value={brushSize} onChange={(e) => setBrushSize(Number(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600" />
                                            </div>
                                            {activeTool === 'brush' && (
                                                <div>
                                                    <label className="font-medium">Color</label>
                                                    <input type="color" value={brushColor} onChange={(e) => setBrushColor(e.target.value)} className="w-full h-10 p-1 border rounded-md"/>
                                                </div>
                                            )}
                                            <button onClick={clearDrawingCanvas} className="w-full text-center p-2 rounded-md bg-red-100 text-red-700 hover:bg-red-200 transition-colors text-xs">Clear All Drawings</button>
                                        </div>
                                    )}
                                    {activeTool !== 'select' ?
                                      <button onClick={() => setActiveTool('select')} className="w-full text-center p-2 rounded-md bg-gray-200 text-gray-800 hover:bg-gray-300 transition-colors font-semibold text-xs">Back to Select Tool</button>
                                      : null
                                    }
                                </div>
                                
                                {/* EDIT SELECTED SECTION */}
                                <div className="flex-grow flex flex-col min-h-0">
                                    <h4 className="font-semibold text-base text-gray-800 mb-2">3. Edit Selected Layer</h4>
                                    <div className="flex-grow">
                                        {selectedElement ? (
                                            <div className="flex flex-col h-full gap-4">
                                                {selectedElement.type === 'text' && <>
                                                    <details open className="space-y-2"><summary className="font-semibold cursor-pointer">Appearance</summary>
                                                        <textarea ref={textareaRef} value={selectedElement.text} onChange={e => updateSelectedElement({ text: e.target.value, colorRanges: [], fontSizeRanges: [] })} onSelect={e => setSelection({ start: e.currentTarget.selectionStart, end: e.currentTarget.selectionEnd })} className="w-full p-2 border rounded-md bg-white min-h-[100px] focus:ring-2 focus:ring-indigo-500" />
                                                        <div><label className="font-medium">Text Preview</label><TextPreview element={selectedElement} /></div>
                                                        <div className="grid grid-cols-2 gap-2">
                                                            <div><label className="font-medium">Font Size</label><input type="number" value={Math.round(getStyleForIndex(selection.start, selectedElement).fontSize)} onChange={e => handleFontSizeChange(parseInt(e.target.value))} className="w-full p-2 border rounded-md" /></div>
                                                            <div><label className="font-medium">Color</label><input type="color" value={getStyleForIndex(selection.start, selectedElement).color} onChange={e => handleColorChange(e.target.value)} className="w-full h-10 p-1 border rounded-md"/></div>
                                                        </div>
                                                        <div><label className="font-medium">Font</label><select value={selectedElement.fontFamily} onChange={e => updateSelectedElement({ fontFamily: e.target.value })} className="w-full p-2 border rounded-md">{FONT_FACES.map(f => <option key={f} value={f}>{f}</option>)}</select></div>
                                                        <div className="flex items-center gap-1 border p-1 rounded-md bg-white">
                                                            <button onClick={() => updateSelectedElement({ isBold: !selectedElement.isBold })} className={`flex-1 py-1 border rounded font-bold ${selectedElement.isBold ? 'bg-indigo-600 text-white' : ''}`}>B</button>
                                                            <button onClick={() => updateSelectedElement({ isItalic: !selectedElement.isItalic })} className={`flex-1 py-1 border rounded italic ${selectedElement.isItalic ? 'bg-indigo-600 text-white' : ''}`}>I</button>
                                                            <button onClick={() => updateSelectedElement({ isUnderline: !selectedElement.isUnderline })} className={`flex-1 p-1.5 border rounded ${selectedElement.isUnderline ? 'bg-indigo-600 text-white' : ''}`}><UnderlineIcon className="w-4 h-4 mx-auto"/></button>
                                                        </div>
                                                        <div className="flex items-center gap-1 border p-1 rounded-md bg-white">
                                                            <button onClick={() => updateSelectedElement({ textAlign: 'left'})} className={`flex-1 p-1 border rounded ${selectedElement.textAlign === 'left' ? 'bg-indigo-600 text-white' : ''}`}><AlignLeftIcon className="w-5 h-5 mx-auto"/></button>
                                                            <button onClick={() => updateSelectedElement({ textAlign: 'center'})} className={`flex-1 p-1 border rounded ${selectedElement.textAlign === 'center' ? 'bg-indigo-600 text-white' : ''}`}><AlignCenterIcon className="w-5 h-5 mx-auto"/></button>
                                                            <button onClick={() => updateSelectedElement({ textAlign: 'right'})} className={`flex-1 p-1 border rounded ${selectedElement.textAlign === 'right' ? 'bg-indigo-600 text-white' : ''}`}><AlignRightIcon className="w-5 h-5 mx-auto"/></button>
                                                        </div>
                                                    </details>
                                                    <details className="space-y-2 border-t pt-2"><summary className="font-semibold cursor-pointer">Shadow</summary>
                                                        <div className="flex items-center justify-between"><label>Enable Shadow</label><input type="checkbox" checked={selectedElement.shadowEnabled} onChange={e => updateSelectedElement({ shadowEnabled: e.target.checked })} className="h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500"/></div>
                                                        <div className="grid grid-cols-2 gap-2">
                                                            <div><label>Color</label><input type="color" value={selectedElement.shadowColor} onChange={e => updateSelectedElement({ shadowColor: e.target.value })} className="w-full p-1 h-10 border rounded-md" disabled={!selectedElement.shadowEnabled}/></div>
                                                            <div><label>Blur</label><input type="number" value={selectedElement.shadowBlur} onChange={e => updateSelectedElement({ shadowBlur: parseInt(e.target.value) })} className="w-full p-2 border rounded-md" disabled={!selectedElement.shadowEnabled}/></div>
                                                            <div><label>Offset X</label><input type="number" value={selectedElement.shadowOffsetX} onChange={e => updateSelectedElement({ shadowOffsetX: parseInt(e.target.value) })} className="w-full p-2 border rounded-md" disabled={!selectedElement.shadowEnabled}/></div>
                                                            <div><label>Offset Y</label><input type="number" value={selectedElement.shadowOffsetY} onChange={e => updateSelectedElement({ shadowOffsetY: parseInt(e.target.value) })} className="w-full p-2 border rounded-md" disabled={!selectedElement.shadowEnabled}/></div>
                                                        </div>
                                                    </details>
                                                    <details className="space-y-2 border-t pt-2"><summary className="font-semibold cursor-pointer">Stroke (Outline)</summary>
                                                        <div className="flex items-center justify-between"><label>Enable Stroke</label><input type="checkbox" checked={selectedElement.strokeEnabled} onChange={e => updateSelectedElement({ strokeEnabled: e.target.checked })} className="h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500"/></div>
                                                        <div className="grid grid-cols-2 gap-2">
                                                            <div><label>Color</label><input type="color" value={selectedElement.strokeColor} onChange={e => updateSelectedElement({ strokeColor: e.target.value })} className="w-full p-1 h-10 border rounded-md" disabled={!selectedElement.strokeEnabled}/></div>
                                                            <div><label>Width</label><input type="number" min="0" value={selectedElement.strokeWidth} onChange={e => updateSelectedElement({ strokeWidth: parseInt(e.target.value) })} className="w-full p-2 border rounded-md" disabled={!selectedElement.strokeEnabled}/></div>
                                                        </div>
                                                    </details>
                                                </>}
                                                {selectedElement.type === 'banner' && <>
                                                    <details open className="space-y-2"><summary className="font-semibold cursor-pointer">Appearance</summary>
                                                        <div><label className="font-medium">Background Color</label><input type="color" value={selectedElement.backgroundColor} onChange={e => updateSelectedElement({ backgroundColor: e.target.value })} className="w-full h-10 p-1 border rounded-md"/></div>
                                                    </details>
                                                    <details className="space-y-2 border-t pt-2"><summary className="font-semibold cursor-pointer">Shadow</summary>
                                                        <div className="flex items-center justify-between"><label>Enable Shadow</label><input type="checkbox" checked={selectedElement.shadowEnabled} onChange={e => updateSelectedElement({ shadowEnabled: e.target.checked })} className="h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500"/></div>
                                                        <div className="grid grid-cols-2 gap-2">
                                                            <div><label>Color</label><input type="color" value={selectedElement.shadowColor} onChange={e => updateSelectedElement({ shadowColor: e.target.value })} className="w-full p-1 h-10 border rounded-md" disabled={!selectedElement.shadowEnabled}/></div>
                                                            <div><label>Blur</label><input type="number" value={selectedElement.shadowBlur} onChange={e => updateSelectedElement({ shadowBlur: parseInt(e.target.value) })} className="w-full p-2 border rounded-md" disabled={!selectedElement.shadowEnabled}/></div>
                                                            <div><label>Offset X</label><input type="number" value={selectedElement.shadowOffsetX} onChange={e => updateSelectedElement({ shadowOffsetX: parseInt(e.target.value) })} className="w-full p-2 border rounded-md" disabled={!selectedElement.shadowEnabled}/></div>
                                                            <div><label>Offset Y</label><input type="number" value={selectedElement.shadowOffsetY} onChange={e => updateSelectedElement({ shadowOffsetY: parseInt(e.target.value) })} className="w-full p-2 border rounded-md" disabled={!selectedElement.shadowEnabled}/></div>
                                                        </div>
                                                    </details>
                                                    <details className="space-y-2 border-t pt-2"><summary className="font-semibold cursor-pointer">Border</summary>
                                                        <div className="flex items-center justify-between"><label>Enable Border</label><input type="checkbox" checked={selectedElement.strokeEnabled} onChange={e => updateSelectedElement({ strokeEnabled: e.target.checked })} className="h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500"/></div>
                                                        <div className="grid grid-cols-2 gap-2">
                                                            <div><label>Color</label><input type="color" value={selectedElement.strokeColor} onChange={e => updateSelectedElement({ strokeColor: e.target.value })} className="w-full p-1 h-10 border rounded-md" disabled={!selectedElement.strokeEnabled}/></div>
                                                            <div><label>Width</label><input type="number" min="0" value={selectedElement.strokeWidth} onChange={e => updateSelectedElement({ strokeWidth: parseInt(e.target.value) })} className="w-full p-2 border rounded-md" disabled={!selectedElement.strokeEnabled}/></div>
                                                        </div>
                                                    </details>
                                                </>}
                                                <div><label className="font-medium">Rotation: {Math.round(selectedElement.rotation)}°</label><input type="range" min="0" max="360" value={selectedElement.rotation} onChange={e => updateSelectedElement({ rotation: parseInt(e.target.value) })} className="w-full accent-indigo-600" /></div>
                                                <div className="mt-auto pt-4">
                                                    <button onClick={handleDeleteElement} className="w-full px-4 py-2 font-medium flex items-center justify-center gap-2 text-white bg-red-600 rounded-md hover:bg-red-700"><TrashIcon className="w-5 h-5"/> Delete Selected</button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="text-center text-gray-500 py-10">
                                                <p>Select an item on the canvas to see its properties.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AddTextModal;