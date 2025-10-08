/**
 * @fileoverview Utility functions for debounced animations to improve performance
 */

/**
 * Debounces animation functions to prevent excessive re-renders during rapid interactions
 * @param {Function} func - The animation function to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {Function} Debounced function
 */
export const debounceAnimation = (func, delay = 150) => {
  let timeoutId;
  let animationFrameId;
  
  return function debouncedAnimation(...args) {
    // Cancel previous timeout and animation frame
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
    }
    
    // Set new timeout
    timeoutId = setTimeout(() => {
      // Use requestAnimationFrame for smooth animations
      animationFrameId = requestAnimationFrame(() => {
        func.apply(this, args);
      });
    }, delay);
  };
};

/**
 * Throttles animation functions to limit execution frequency
 * @param {Function} func - The animation function to throttle
 * @param {number} limit - Time limit in milliseconds
 * @returns {Function} Throttled function
 */
export const throttleAnimation = (func, limit = 16) => { // ~60fps
  let inThrottle;
  
  return function throttledAnimation(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
};

/**
 * Creates a smooth transition manager for expand/collapse animations
 */
export class TransitionManager {
  constructor() {
    this.activeTransitions = new Map();
  }
  
  /**
   * Starts a transition for a node
   * @param {string} nodeId - ID of the node
   * @param {boolean} isExpanding - Whether the node is expanding
   * @param {Function} onComplete - Callback when transition completes
   */
  startTransition(nodeId, isExpanding, onComplete) {
    // Cancel existing transition for this node
    this.cancelTransition(nodeId);
    
    const transition = {
      nodeId,
      isExpanding,
      startTime: performance.now(),
      duration: 200, // 200ms transition
      onComplete
    };
    
    this.activeTransitions.set(nodeId, transition);
    this._animateTransition(transition);
  }
  
  /**
   * Cancels a transition for a node
   * @param {string} nodeId - ID of the node
   */
  cancelTransition(nodeId) {
    const transition = this.activeTransitions.get(nodeId);
    if (transition && transition.animationId) {
      cancelAnimationFrame(transition.animationId);
    }
    this.activeTransitions.delete(nodeId);
  }
  
  /**
   * Cancels all active transitions
   */
  cancelAllTransitions() {
    for (const [nodeId] of this.activeTransitions) {
      this.cancelTransition(nodeId);
    }
  }
  
  /**
   * Private method to animate a transition
   * @private
   */
  _animateTransition(transition) {
    const animate = (currentTime) => {
      const elapsed = currentTime - transition.startTime;
      const progress = Math.min(elapsed / transition.duration, 1);
      
      // Easing function (ease-out)
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      
      // Apply animation (this would be handled by CSS transitions in practice)
      // The actual animation is handled by CSS, this is just for timing
      
      if (progress < 1) {
        transition.animationId = requestAnimationFrame(animate);
      } else {
        // Transition complete
        this.activeTransitions.delete(transition.nodeId);
        if (transition.onComplete) {
          transition.onComplete();
        }
      }
    };
    
    transition.animationId = requestAnimationFrame(animate);
  }
  
  /**
   * Checks if a node is currently transitioning
   * @param {string} nodeId - ID of the node
   * @returns {boolean} True if the node is transitioning
   */
  isTransitioning(nodeId) {
    return this.activeTransitions.has(nodeId);
  }
}

// Global transition manager instance
export const globalTransitionManager = new TransitionManager();