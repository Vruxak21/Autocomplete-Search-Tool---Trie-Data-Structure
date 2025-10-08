/**
 * @fileoverview VirtualScrollContainer component for efficient rendering of large tree structures
 */

import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import PropTypes from 'prop-types';

/**
 * VirtualScrollContainer component that implements virtual scrolling for performance
 * Only renders visible items plus a buffer to improve scrolling performance
 */
const VirtualScrollContainer = memo(({
  items = [],
  itemHeight = 40,
  containerHeight = 400,
  overscan = 5,
  renderItem,
  className = '',
  onScroll
}) => {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef(null);

  // Calculate visible range
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    items.length - 1,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
  );

  // Calculate total height and visible items
  const totalHeight = items.length * itemHeight;
  const visibleItems = items.slice(startIndex, endIndex + 1);

  // Handle scroll events
  const handleScroll = useCallback((event) => {
    const newScrollTop = event.target.scrollTop;
    setScrollTop(newScrollTop);
    
    if (onScroll) {
      onScroll(event);
    }
  }, [onScroll]);

  // Scroll to specific item
  const scrollToItem = useCallback((index) => {
    if (containerRef.current) {
      const scrollTop = index * itemHeight;
      containerRef.current.scrollTop = scrollTop;
      setScrollTop(scrollTop);
    }
  }, [itemHeight]);

  // Expose scrollToItem method via ref
  React.useImperativeHandle(containerRef, () => ({
    scrollToItem
  }));

  return (
    <div
      ref={containerRef}
      className={`virtual-scroll-container ${className}`}
      style={{
        height: containerHeight,
        overflow: 'auto',
        position: 'relative'
      }}
      onScroll={handleScroll}
    >
      {/* Total height spacer */}
      <div style={{ height: totalHeight, position: 'relative' }}>
        {/* Visible items container */}
        <div
          style={{
            position: 'absolute',
            top: startIndex * itemHeight,
            left: 0,
            right: 0
          }}
        >
          {visibleItems.map((item, index) => {
            const actualIndex = startIndex + index;
            return (
              <div
                key={item.id || actualIndex}
                style={{
                  height: itemHeight,
                  position: 'relative'
                }}
              >
                {renderItem(item, actualIndex)}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
});

VirtualScrollContainer.displayName = 'VirtualScrollContainer';

VirtualScrollContainer.propTypes = {
  items: PropTypes.array.isRequired,
  itemHeight: PropTypes.number,
  containerHeight: PropTypes.number,
  overscan: PropTypes.number,
  renderItem: PropTypes.func.isRequired,
  className: PropTypes.string,
  onScroll: PropTypes.func
};

export default VirtualScrollContainer;