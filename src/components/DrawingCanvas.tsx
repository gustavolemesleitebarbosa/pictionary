import React, { useRef, useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Eraser, Brush, RotateCcw } from 'lucide-react';
import { socketService, type DrawingData } from '../services/socketService';

interface DrawingCanvasProps {
  isDrawing: boolean;
  roomId: string;
}

interface Point {
  x: number;
  y: number;
}

const DrawingCanvas: React.FC<DrawingCanvasProps> = ({ isDrawing, roomId }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawingActive, setIsDrawingActive] = useState(false);
  const [currentColor, setCurrentColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState([5]);
  const [tool, setTool] = useState<'brush' | 'eraser'>('brush');
  const [lastPoint, setLastPoint] = useState<Point | null>(null);
  const [canvasInitialized, setCanvasInitialized] = useState(false);
  
  // Normalized canvas dimensions - these are the "logical" coordinates that all devices use
  const NORMALIZED_WIDTH = 800;
  const NORMALIZED_HEIGHT = 500;
  const [scale, setScale] = useState(1);

  const colors = [
    '#000000', '#FF0000', '#00FF00', '#0000FF', 
    '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500',
    '#800080', '#FFC0CB', '#A52A2A', '#808080'
  ];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Store the current canvas content
    let imageData: ImageData | null = null;

    // Set canvas size with normalized dimensions
    const resizeCanvas = () => {
      const container = canvas.parentElement;
      if (!container) return;
      
      // Save current canvas content before resize (in normalized coordinates)
      if (canvas.width > 0 && canvas.height > 0) {
        try {
          imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        } catch (e) {
          console.warn('Could not save canvas data:', e);
        }
      }
      
      // Get container size
      const containerRect = container.getBoundingClientRect();
      const availableWidth = Math.floor(containerRect.width - 32); // Account for padding
      const availableHeight = Math.floor(Math.min(
        containerRect.height - 32, // Account for container padding
        window.innerHeight * 0.5, // Use more screen space on mobile
        600 // Max height on desktop
      ));
      
      // Calculate scale to fit the normalized canvas in the available space
      const scaleX = availableWidth / NORMALIZED_WIDTH;
      const scaleY = availableHeight / NORMALIZED_HEIGHT;
      const newScale = Math.min(scaleX, scaleY, 1); // Don't scale up beyond 1:1
      
      // Calculate actual display size
      const displayWidth = Math.floor(NORMALIZED_WIDTH * newScale);
      const displayHeight = Math.floor(NORMALIZED_HEIGHT * newScale);
      
      // Check if we need to update
      const currentDisplayWidth = parseInt(canvas.style.width) || 0;
      const currentDisplayHeight = parseInt(canvas.style.height) || 0;
      
      if (currentDisplayWidth !== displayWidth || currentDisplayHeight !== displayHeight || scale !== newScale) {
        // Set the internal canvas size to normalized dimensions for consistent coordinates
        canvas.width = NORMALIZED_WIDTH;
        canvas.height = NORMALIZED_HEIGHT;
        
        // Set the display size via CSS
        canvas.style.width = `${displayWidth}px`;
        canvas.style.height = `${displayHeight}px`;
        
        // Update scale factor for coordinate conversion
        setScale(newScale);
        
        // Set drawing properties
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, NORMALIZED_WIDTH, NORMALIZED_HEIGHT);
        
        // Restore canvas content if it exists
        if (imageData && imageData.width === NORMALIZED_WIDTH && imageData.height === NORMALIZED_HEIGHT) {
          try {
            ctx.putImageData(imageData, 0, 0);
          } catch (e) {
            console.warn('Could not restore canvas data:', e);
          }
        }
        
        console.log(`Canvas resized: ${displayWidth}x${displayHeight} (scale: ${Math.round(newScale * 100)}%)`);
      }
    };

    // Initial resize with delay for mobile
    setTimeout(() => {
      resizeCanvas();
      setCanvasInitialized(true);
    }, 100);
    
    // Add resize listener with debounce for better performance
    let resizeTimeout: NodeJS.Timeout;
    const debouncedResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        // Only resize if canvas is initialized and visible
        if (canvasInitialized && !document.hidden) {
          resizeCanvas();
        }
      }, 150);
    };
    
    // Listen for resize and orientation change events
    window.addEventListener('resize', debouncedResize);
    window.addEventListener('orientationchange', debouncedResize);
    
    // Prevent scroll-related canvas clearing by handling viewport changes
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // Page became visible again, ensure canvas is properly sized
        setTimeout(resizeCanvas, 100);
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('resize', debouncedResize);
      window.removeEventListener('orientationchange', debouncedResize);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearTimeout(resizeTimeout);
    };
  }, []);

  // Set up WebSocket listener for incoming drawing data
  useEffect(() => {
    const handleIncomingDrawing = (data: DrawingData & { roomId: string }) => {
      if (data.roomId !== roomId) return;
      
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx) return;

      // Draw the received line on our canvas
      drawLine(ctx, data.lastX, data.lastY, data.x, data.y, data.color, data.size, data.tool);
    };

    const handleClearCanvas = () => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx) return;

      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, NORMALIZED_WIDTH, NORMALIZED_HEIGHT);
    };

    socketService.onDrawing(handleIncomingDrawing);
    
    // Listen for clear canvas events
    const socket = socketService.getSocket();
    if (socket) {
      socket.on('clear-canvas', handleClearCanvas);
    }

    // Cleanup listener when component unmounts or roomId changes
    return () => {
      if (socket) {
        socket.off('drawing', handleIncomingDrawing);
        socket.off('clear-canvas', handleClearCanvas);
      }
    };
  }, [roomId]);

  const drawLine = (
    ctx: CanvasRenderingContext2D, 
    fromX: number, 
    fromY: number, 
    toX: number, 
    toY: number, 
    color: string, 
    size: number, 
    drawTool: 'brush' | 'eraser'
  ) => {
    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    
    if (drawTool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = size * 2;
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = color;
      ctx.lineWidth = size;
    }
    
    ctx.stroke();
  };

  const getPointFromEvent = (e: React.MouseEvent | React.TouchEvent): Point => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    
    // Get screen coordinates
    let screenX: number, screenY: number;
    if ('touches' in e) {
      screenX = e.touches[0].clientX - rect.left;
      screenY = e.touches[0].clientY - rect.top;
    } else {
      screenX = e.clientX - rect.left;
      screenY = e.clientY - rect.top;
    }
    
    // Convert screen coordinates to normalized canvas coordinates
    const normalizedX = (screenX / rect.width) * NORMALIZED_WIDTH;
    const normalizedY = (screenY / rect.height) * NORMALIZED_HEIGHT;
    
    return {
      x: Math.round(normalizedX),
      y: Math.round(normalizedY)
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    
    e.preventDefault();
    const point = getPointFromEvent(e);
    setIsDrawingActive(true);
    setLastPoint(point);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !isDrawingActive) return;
    
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || !lastPoint) return;

    const currentPoint = getPointFromEvent(e);
    
    // Draw locally
    drawLine(ctx, lastPoint.x, lastPoint.y, currentPoint.x, currentPoint.y, currentColor, brushSize[0], tool);
    
    // Send drawing data to other players via WebSocket
    const drawingData: DrawingData = {
      x: currentPoint.x,
      y: currentPoint.y,
      lastX: lastPoint.x,
      lastY: lastPoint.y,
      color: currentColor,
      size: brushSize[0],
      tool: tool
    };
    
    socketService.sendDrawing(roomId, drawingData);
    
    setLastPoint(currentPoint);
  };

  const stopDrawing = () => {
    setIsDrawingActive(false);
    setLastPoint(null);
  };

  const clearCanvas = () => {
    if (!isDrawing) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, NORMALIZED_WIDTH, NORMALIZED_HEIGHT);
    
    // Send clear canvas event to other players
    const clearData: DrawingData = {
      x: 0,
      y: 0,
      lastX: 0,
      lastY: 0,
      color: '#FFFFFF',
      size: NORMALIZED_WIDTH,
      tool: 'brush'
    };
    
    socketService.sendDrawing(roomId, clearData);
  };

  return (
    <div className="space-y-4">
      {/* Drawing Tools */}
      {isDrawing && (
        <Card className="bg-white shadow-lg">
          <CardContent className="p-4">
            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
              {/* Color Palette */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Colors</label>
                <div className="grid grid-cols-6 lg:grid-cols-4 gap-2">
                  {colors.map((color) => (
                    <button
                      key={color}
                      className={`w-8 h-8 rounded-full border-2 transition-all hover:scale-105 ${
                        currentColor === color ? 'border-gray-800 scale-110 ring-2 ring-blue-300' : 'border-gray-300'
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() => setCurrentColor(color)}
                      aria-label={`Select ${color} color`}
                    />
                  ))}
                </div>
              </div>

              {/* Tools */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Tools</label>
                <div className="flex gap-2">
                  <Button
                    variant={tool === 'brush' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTool('brush')}
                    className="flex items-center gap-1"
                  >
                    <Brush className="w-4 h-4" />
                    <span className="hidden sm:inline">Brush</span>
                  </Button>
                  <Button
                    variant={tool === 'eraser' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTool('eraser')}
                    className="flex items-center gap-1"
                  >
                    <Eraser className="w-4 h-4" />
                    <span className="hidden sm:inline">Eraser</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={clearCanvas}
                    className="flex items-center gap-1"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span className="hidden sm:inline">Clear</span>
                  </Button>
                </div>
              </div>

              {/* Brush Size */}
              <div className="space-y-2 flex-1 min-w-0">
                <label className="text-sm font-medium text-gray-700">
                  Brush Size: <span className="font-normal">{brushSize[0]}px</span>
                </label>
                <Slider
                  value={brushSize}
                  onValueChange={setBrushSize}
                  max={20}
                  min={1}
                  step={1}
                  className="w-full max-w-32"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Canvas */}
      <div className="w-full">
        <div className="flex justify-center items-center w-full min-h-[300px] max-h-[70vh] border-2 border-gray-200 bg-gray-50 rounded-lg p-4">
          <canvas
            ref={canvasRef}
            className={`block border border-gray-300 bg-white rounded shadow-sm ${
              isDrawing ? 'cursor-crosshair' : 'cursor-default'
            }`}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
            style={{ 
              touchAction: 'none', // Prevent scrolling on touch devices
              imageRendering: 'auto', // Use smooth scaling
              userSelect: 'none', // Prevent text selection
              WebkitUserSelect: 'none', // Safari
              msUserSelect: 'none', // IE
              position: 'relative',
              zIndex: 1,
              maxWidth: '100%',
              maxHeight: '100%'
            }}
          />
        </div>
        {/* Debug info for mobile testing */}
        {scale < 1 && (
          <div className="text-center mt-2 text-xs text-gray-500">
            Display: {Math.round(scale * 100)}% • Logical: {NORMALIZED_WIDTH}×{NORMALIZED_HEIGHT}
          </div>
        )}
      </div>
    </div>
  );
};

export default DrawingCanvas;
