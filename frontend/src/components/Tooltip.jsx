import React, { useState, useRef, useEffect, useCallback, memo } from 'react';
import PropTypes from 'prop-types';
import { createPortal } from 'react-dom';
import './Tooltip.css';

/**
 * Tooltip component for showing additional node information
 * Supports positioning, collision detection, and accessibility
 */
const Tooltip = memo(({ 
  children, 
  content, 
  position = 'top',
  delay = 500,
  disabled = false,
  className = '',
  maxWidth = 300,
  showArrow = true,
  interactive = false,
  onShow,
  onHide
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [actualPosition, setActualPosition] = useState(position);
  const [tooltipStyle, setTooltipStyle] = useState({});
  const triggerRef = useRef(null);
  const tooltipRef = useRef(null);
  const timeoutRef = useRef(null);
  const isHoveringTooltip = useRef(false);

  // Calculate optimal tooltip position with collision detection
  const calculatePosition = useCallback(() => {
    if (!triggerRef.current || !tooltipRef.current) return;

    const trigger = triggerRef.current.getBoundingClientRect();
    const tooltip = tooltipRef.current.getBoundingClientRect();
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight,
      scrollX: window.scrollX,
      scrollY: window.scrollY
    };

    const spacing = 8; // Gap between trigger and tooltip
    const arrowSize = showArrow ? 6 : 0;

    // Calculate positions for all directions
    const positions = {
      top: {
        x: trigger.left + trigger.width / 2 - tooltip.width / 2,
        y: trigger.top - tooltip.height - spacing - arrowSize
      },
      bottom: {
        x: trigger.left + trigger.width / 2 - tooltip.width / 2,
        y: trigger.bottom + spacing + arrowSize
      },
      left: {
        x: trigger.left - tooltip.width - spacing - arrowSize,
        y: trigger.top + trigger.height / 2 - tooltip.height / 2
      },
      right: {
        x: trigger.right + spacing + arrowSize,
        y: trigger.top + trigger.height / 2 - tooltip.height / 2
      }
    };

    // Check which positions fit in viewport
    const fitsInViewport = (pos) => {
      return pos.x >= 0 && 
             pos.y >= 0 && 
             pos.x + tooltip.width <= viewport.width && 
             pos.y + tooltip.height <= viewport.height;
    };

    // Priority order for position fallback
    const fallbackOrder = {
      top: ['top', 'bottom', 'right', 'left'],
      bottom: ['bottom', 'top', 'right', 'left'],
      left: ['left', 'right', 'top', 'bottom'],
      right: ['right', 'left', 'top', 'bottom']
    };

    // Find the best position
    let bestPosition = position;
    for (const pos of fallbackOrder[position] || ['top', 'bottom', 'right', 'left']) {
      if (fitsInViewport(positions[pos])) {
        bestPosition = pos;
        break;
      }
    }

    // If no position fits perfectly, use the original and adjust
    let finalPosition = positions[bestPosition];
    
    // Adjust for viewport boundaries
    if (finalPosition.x < 0) {
      finalPosition.x = spacing;
    } else if (finalPosition.x + tooltip.width > viewport.width) {
      finalPosition.x = viewport.width - tooltip.width - spacing;
    }

    if (finalPosition.y < 0) {
      finalPosition.y = spacing;
    } else if (finalPosition.y + tooltip.height > viewport.height) {
      finalPosition.y = viewport.height - tooltip.height - spacing;
    }

    // Add scroll offset
    finalPosition.x += viewport.scrollX;
    finalPosition.y += viewport.scrollY;

    setActualPosition(bestPosition);
    setTooltipStyle({
      position: 'absolute',
      left: `${finalPosition.x}px`,
      top: `${finalPosition.y}px`,
      maxWidth: `${maxWidth}px`,
      zIndex: 9999
    });
  }, [position, maxWidth, showArrow]);

  // Show tooltip with delay
  const showTooltip = useCallback(() => {
    if (disabled || !content) return;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
      onShow?.();
    }, delay);
  }, [disabled, content, delay, onShow]);

  // Hide tooltip
  const hideTooltip = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // If tooltip is interactive and user is hovering it, don't hide
    if (interactive && isHoveringTooltip.current) {
      return;
    }

    setIsVisible(false);
    onHide?.();
  }, [interactive, onHide]);

  // Handle mouse events
  const handleMouseEnter = useCallback(() => {
    showTooltip();
  }, [showTooltip]);

  const handleMouseLeave = useCallback(() => {
    hideTooltip();
  }, [hideTooltip]);

  // Handle focus events for keyboard accessibility
  const handleFocus = useCallback(() => {
    showTooltip();
  }, [showTooltip]);

  const handleBlur = useCallback(() => {
    hideTooltip();
  }, [hideTooltip]);

  // Handle tooltip mouse events for interactive tooltips
  const handleTooltipMouseEnter = useCallback(() => {
    if (interactive) {
      isHoveringTooltip.current = true;
    }
  }, [interactive]);

  const handleTooltipMouseLeave = useCallback(() => {
    if (interactive) {
      isHoveringTooltip.current = false;
      hideTooltip();
    }
  }, [interactive, hideTooltip]);

  // Calculate position when tooltip becomes visible
  useEffect(() => {
    if (isVisible) {
      // Small delay to ensure tooltip is rendered
      const timer = setTimeout(calculatePosition, 0);
      return () => clearTimeout(timer);
    }
  }, [isVisible, calculatePosition]);

  // Recalculate position on window resize or scroll
  useEffect(() => {
    if (!isVisible) return;

    const handleResize = () => calculatePosition();
    const handleScroll = () => calculatePosition();

    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleScroll, true);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [isVisible, calculatePosition]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Generate unique IDs for accessibility
  const tooltipId = `tooltip-${Math.random().toString(36).substr(2, 9)}`;

  // Render tooltip content
  const renderTooltipContent = () => {
    if (typeof content === 'string') {
      return <div className="tooltip-text">{content}</div>;
    }
    
    if (React.isValidElement(content)) {
      return content;
    }

    // Handle object content (node metadata)
    if (typeof content === 'object' && content !== null) {
      return (
        <div className="tooltip-metadata">
          {content.title && (
            <div className="tooltip-title">{content.title}</div>
          )}
          {content.items && content.items.length > 0 && (
            <div className="tooltip-items">
              {content.items.map((item, index) => (
                <div key={index} className="tooltip-item">
                  <span className="tooltip-item-label">{item.label}:</span>
                  <span className="tooltip-item-value">{item.value}</span>
                </div>
              ))}
            </div>
          )}
          {content.description && (
            <div className="tooltip-description">{content.description}</div>
          )}
        </div>
      );
    }

    return null;
  };

  const tooltipContent = (
    <div
      ref={tooltipRef}
      id={tooltipId}
      className={`tooltip tooltip-${actualPosition} ${className} ${showArrow ? 'tooltip-with-arrow' : ''}`}
      style={tooltipStyle}
      role="tooltip"
      aria-hidden={!isVisible}
      onMouseEnter={handleTooltipMouseEnter}
      onMouseLeave={handleTooltipMouseLeave}
    >
      {renderTooltipContent()}
      {showArrow && <div className="tooltip-arrow" />}
    </div>
  );

  return (
    <>
      <div
        ref={triggerRef}
        className="tooltip-trigger"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onFocus={handleFocus}
        onBlur={handleBlur}
        aria-describedby={isVisible ? tooltipId : undefined}
      >
        {children}
      </div>
      {isVisible && createPortal(tooltipContent, document.body)}
    </>
  );
});

Tooltip.propTypes = {
  children: PropTypes.node.isRequired,
  content: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.node,
    PropTypes.shape({
      title: PropTypes.string,
      items: PropTypes.arrayOf(PropTypes.shape({
        label: PropTypes.string.isRequired,
        value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired
      })),
      description: PropTypes.string
    })
  ]).isRequired,
  position: PropTypes.oneOf(['top', 'bottom', 'left', 'right']),
  delay: PropTypes.number,
  disabled: PropTypes.bool,
  className: PropTypes.string,
  maxWidth: PropTypes.number,
  showArrow: PropTypes.bool,
  interactive: PropTypes.bool,
  onShow: PropTypes.func,
  onHide: PropTypes.func
};

Tooltip.displayName = 'Tooltip';

export default Tooltip;