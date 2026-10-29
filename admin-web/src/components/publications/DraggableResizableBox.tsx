import React from 'react';
import { Rnd } from 'react-rnd';
import { Trash2 } from 'lucide-react';

interface DraggableResizableBoxProps {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  scale?: number;
  isSelected?: boolean;
  interactive?: boolean;
  label?: string;
  onSelect?: () => void;
  onChange: (coords: { x: number; y: number; width: number; height: number }) => void;
  onDelete?: () => void;
  children: React.ReactNode;
  zIndex?: number;
  minWidth?: number;
  minHeight?: number;
}

export const DraggableResizableBox: React.FC<DraggableResizableBoxProps> = ({
  x,
  y,
  width,
  height,
  scale = 1,
  isSelected = false,
  interactive = true,
  label,
  onSelect,
  onChange,
  onDelete,
  children,
  zIndex = 10,
  minWidth = 40,
  minHeight = 30,
}) => {
  if (!interactive) {
    // Non-interactive (clean print / export mode)
    return (
      <div
        className="absolute box-border"
        style={{
          left: `${x}px`,
          top: `${y}px`,
          width: `${width}px`,
          height: `${height}px`,
          zIndex,
        }}
      >
        <div className="w-full h-full relative overflow-hidden flex items-center justify-center pointer-events-none">
          {children}
        </div>
      </div>
    );
  }

  // Canva-style resize handles: Hit areas are transparent, with small pills/circles centered inside
  const baseHandleStyle: React.CSSProperties = {
    background: 'transparent',
    border: 'none',
    boxShadow: 'none',
    outline: 'none',
    display: isSelected ? 'flex' : 'none',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 40,
  };

  const resizeHandleStyles = {
    topLeft: { ...baseHandleStyle, width: 20, height: 20, top: -10, left: -10 },
    topRight: { ...baseHandleStyle, width: 20, height: 20, top: -10, right: -10 },
    bottomLeft: { ...baseHandleStyle, width: 20, height: 20, bottom: -10, left: -10 },
    bottomRight: { ...baseHandleStyle, width: 20, height: 20, bottom: -10, right: -10 },
    top: { ...baseHandleStyle, height: 16, top: -8 },
    bottom: { ...baseHandleStyle, height: 16, bottom: -8 },
    left: { ...baseHandleStyle, width: 16, left: -8 },
    right: { ...baseHandleStyle, width: 16, right: -8 },
  };

  const resizeHandleComponents = {
    topLeft: (
      <div className="w-2.5 h-2.5 bg-white border-2 border-blue-600 rounded-full shadow-sm hover:scale-125 transition-transform" />
    ),
    topRight: (
      <div className="w-2.5 h-2.5 bg-white border-2 border-blue-600 rounded-full shadow-sm hover:scale-125 transition-transform" />
    ),
    bottomLeft: (
      <div className="w-2.5 h-2.5 bg-white border-2 border-blue-600 rounded-full shadow-sm hover:scale-125 transition-transform" />
    ),
    bottomRight: (
      <div className="w-2.5 h-2.5 bg-white border-2 border-blue-600 rounded-full shadow-sm hover:scale-125 transition-transform" />
    ),
    top: (
      <div className="w-4 h-1 bg-white border border-blue-600 rounded-full shadow-sm hover:scale-125 transition-transform" />
    ),
    bottom: (
      <div className="w-4 h-1 bg-white border border-blue-600 rounded-full shadow-sm hover:scale-125 transition-transform" />
    ),
    left: (
      <div className="w-1 h-4 bg-white border border-blue-600 rounded-full shadow-sm hover:scale-125 transition-transform" />
    ),
    right: (
      <div className="w-1 h-4 bg-white border border-blue-600 rounded-full shadow-sm hover:scale-125 transition-transform" />
    ),
  };

  return (
    <Rnd
      size={{ width, height }}
      position={{ x, y }}
      scale={scale}
      bounds="parent"
      minWidth={minWidth}
      minHeight={minHeight}
      onDragStart={(e) => {
        e.stopPropagation();
        onSelect?.();
      }}
      onDragStop={(_e, d) => {
        onChange({ x: Math.round(d.x), y: Math.round(d.y), width, height });
      }}
      onResizeStart={(e) => {
        e.stopPropagation();
        onSelect?.();
      }}
      onResizeStop={(_e, _direction, ref, _delta, position) => {
        onChange({
          width: Math.round(parseFloat(ref.style.width)),
          height: Math.round(parseFloat(ref.style.height)),
          x: Math.round(position.x),
          y: Math.round(position.y),
        });
      }}
      className={`cursor-move box-border select-none transition-shadow pointer-events-auto ${
        isSelected
          ? 'outline-[1.5px] outline-blue-600 outline-offset-0'
          : 'hover:outline-[1px] hover:outline-dashed hover:outline-blue-400'
      }`}
      style={{
        zIndex: isSelected ? 99 : zIndex,
      }}
      onClick={(e: React.MouseEvent) => {
        e.stopPropagation();
        onSelect?.();
      }}
      enableResizing={
        isSelected
          ? {
              top: true,
              right: true,
              bottom: true,
              left: true,
              topRight: true,
              bottomRight: true,
              bottomLeft: true,
              topLeft: true,
            }
          : false
      }
      resizeHandleStyles={resizeHandleStyles}
      resizeHandleComponent={resizeHandleComponents}
    >
      {/* Canva Floating Mini Action Toolbar */}
      {isSelected && (
        <div
          className="absolute -top-8 left-0 flex items-center gap-2 bg-neutral-900/95 backdrop-blur text-white px-2.5 py-1 rounded-md shadow-lg text-[11px] font-sans z-50 select-none whitespace-nowrap"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <span className="font-semibold text-sky-400">{label || 'Element'}</span>
          <span className="text-neutral-400 font-mono text-[10px]">
            {Math.round(width)} × {Math.round(height)} px
          </span>
          {onDelete && (
            <button
              type="button"
              className="ml-1 p-0.5 text-neutral-400 hover:text-red-400 hover:bg-neutral-800 rounded transition-colors"
              title="Delete element"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
            >
              <Trash2 size={12} />
            </button>
          )}
        </div>
      )}

      {/* Actual Content (Image or Ad) */}
      <div className="w-full h-full relative overflow-hidden flex items-center justify-center pointer-events-none">
        {children}
      </div>
    </Rnd>
  );
};
