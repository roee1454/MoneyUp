import { motion, useReducedMotion } from 'motion/react';
import React, { useMemo } from 'react';

export type ShapeType = 'circle' | 'square' | 'triangle' | 'hexagon' | 'pentagon';

export interface BackgroundShapeConfig {
  type: ShapeType;
  top?: string;
  bottom?: string;
  left?: string;
  right?: string;
  sizeClass?: string; // custom size class e.g., 'w-48 h-48 md:w-64 md:h-64'
  colorClass?: string; // custom color class e.g., 'bg-primary/10 border-primary/30'
  duration?: number;
  interactive?: boolean;
}

export interface PremiumAnimatedBackgroundProps {
  shapes?: BackgroundShapeConfig[];
  count?: number;
  types?: ShapeType[];
  className?: string;
}

const DEFAULT_POSITIONS = [
  { top: '15%', right: '10%' },     // Position 1: Top-Right
  { bottom: '20%', left: '8%' },     // Position 2: Bottom-Left
  { top: '40%', left: '25%' },     // Position 3: Center-Left
  { bottom: '15%', right: '30%' },   // Position 4: Bottom-Right
  { top: '20%', left: '40%' },     // Position 5: Top-Center
  { bottom: '30%', left: '45%' },    // Position 6: Bottom-Center
];

const DEFAULT_SHAPE_TYPES: ShapeType[] = ['circle', 'square', 'triangle'];

const defaultSizes: Record<ShapeType, string> = {
  circle: 'w-56 h-56 md:w-80 md:h-80',
  square: 'w-32 h-32 md:w-48 md:h-48',
  triangle: 'w-24 h-24 md:w-36 md:h-36',
  hexagon: 'w-28 h-28 md:w-40 md:h-40',
  pentagon: 'w-24 h-24 md:w-36 md:h-36',
};

const defaultColors: Record<ShapeType, string> = {
  circle: 'bg-primary/5 border border-primary/20 rounded-full',
  square: 'bg-accent/5 border border-accent/30 rounded-none',
  triangle: 'stroke-primary/30 fill-primary/5',
  hexagon: 'stroke-accent/30 fill-accent/5',
  pentagon: 'stroke-primary/30 fill-primary/5',
};

export function PremiumAnimatedBackground({
  shapes,
  count = 3,
  types = DEFAULT_SHAPE_TYPES,
  className = '',
}: PremiumAnimatedBackgroundProps) {
  const shouldReduceMotion = useReducedMotion();

  // Generate shapes deterministically based on index if not explicitly provided
  const computedShapes = useMemo(() => {
    if (shapes) return shapes;

    const generated: BackgroundShapeConfig[] = [];
    for (let i = 0; i < count; i++) {
      const type = types[i % types.length];
      const position = DEFAULT_POSITIONS[i % DEFAULT_POSITIONS.length];
      generated.push({
        type,
        ...position,
        interactive: type === 'square', // Make square interactive by default as in the original designs
      });
    }
    return generated;
  }, [shapes, count, types]);

  const renderShapeSvgContent = (type: ShapeType, strokeFillClass: string) => {
    switch (type) {
      case 'triangle':
        return (
          <svg viewBox="0 0 100 100" className={`w-full h-full stroke-[1.5] ${strokeFillClass}`}>
            <polygon points="50,5 95,90 5,90" />
          </svg>
        );
      case 'hexagon':
        return (
          <svg viewBox="0 0 100 100" className={`w-full h-full stroke-[1.5] ${strokeFillClass}`}>
            <polygon points="50,5 93,25 93,75 50,95 7,75 7,25" />
          </svg>
        );
      case 'pentagon':
        return (
          <svg viewBox="0 0 100 100" className={`w-full h-full stroke-[1.5] ${strokeFillClass}`}>
            <polygon points="50,5 95,38 78,90 22,90 5,38" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div className={`absolute inset-0 z-0 pointer-events-none overflow-hidden ${className}`}>
      {computedShapes.map((shape, index) => {
        const {
          type,
          top,
          bottom,
          left,
          right,
          sizeClass,
          colorClass,
          duration = 1,
          interactive,
        } = shape;

        const size = sizeClass || defaultSizes[type];
        const colors = colorClass || defaultColors[type];

        // Layout styles
        const positionStyle: React.CSSProperties = {
          position: 'absolute',
          top,
          bottom,
          left,
          right,
        };

        // Determine float range and timing using stable formulas based on index
        const rangeY = 15 + (index * 7) % 15; // float range y: 15px - 30px
        const rangeX = 10 + (index * 5) % 15; // float range x: 10px - 25px
        
        const durationY = (8 + (index * 3) % 7) * duration;
        const durationX = (9 + (index * 2) % 7) * duration;
        const durationRotate = (16 + (index * 4) % 9) * duration;

        // Base variants and animations
        let animateProps: any = {};
        let transitionProps: any = {};
        let whileHoverProps: any = {};

        if (shouldReduceMotion) {
          animateProps = {
            opacity: type === 'circle' ? 0.7 : type === 'square' ? 0.6 : 0.5,
            scale: 1,
            rotate: type === 'square' ? 45 : type === 'triangle' ? 15 : 0,
          };
          transitionProps = { duration: 0.5 };
        } else {
          switch (type) {
            case 'circle':
              animateProps = {
                opacity: 0.7,
                scale: 1,
                y: [0, -rangeY, 0],
                x: [0, rangeX, 0],
              };
              transitionProps = {
                y: { repeat: Infinity, duration: durationY, ease: 'easeInOut' },
                x: { repeat: Infinity, duration: durationX, ease: 'easeInOut' },
                scale: { duration: 0.5 },
                opacity: { duration: 0.5 },
              };
              break;
            case 'square':
              animateProps = {
                opacity: 0.6,
                scale: 1,
                rotate: [45, 225, 405],
                y: [0, rangeY, 0],
              };
              transitionProps = {
                rotate: { repeat: Infinity, duration: durationRotate, ease: 'linear' },
                y: { repeat: Infinity, duration: durationY, ease: 'easeInOut' },
                scale: { duration: 0.5 },
                opacity: { duration: 0.5 },
              };
              if (interactive) {
                whileHoverProps = { scale: 1.15, rotate: 135 };
              }
              break;
            case 'triangle':
            case 'hexagon':
            case 'pentagon':
              animateProps = {
                opacity: 0.5,
                scale: 1,
                y: [0, -rangeY, 0],
                x: [0, -rangeX, 0],
                rotate: [15, -15, 15],
              };
              transitionProps = {
                y: { repeat: Infinity, duration: durationY, ease: 'easeInOut' },
                x: { repeat: Infinity, duration: durationX, ease: 'easeInOut' },
                rotate: { repeat: Infinity, duration: durationRotate, ease: 'easeInOut' },
                scale: { duration: 0.5 },
                opacity: { duration: 0.5 },
              };
              break;
          }
        }

        const initialProps = {
          opacity: 0,
          scale: 0.5,
          rotate: type === 'square' ? 45 : type === 'triangle' ? 15 : 0,
        };

        const isSvgShape = type === 'triangle' || type === 'hexagon' || type === 'pentagon';

        return (
          <motion.div
            key={index}
            className={`pointer-events-none ${size} ${!isSvgShape ? colors : ''} ${
              interactive ? 'pointer-events-auto cursor-pointer' : ''
            }`}
            style={positionStyle}
            initial={initialProps}
            animate={animateProps}
            whileHover={whileHoverProps}
            transition={{
              ...transitionProps,
              default: { type: 'spring', stiffness: 250, damping: 20 },
            }}
          >
            {isSvgShape && renderShapeSvgContent(type, colors)}
          </motion.div>
        );
      })}
    </div>
  );
}
