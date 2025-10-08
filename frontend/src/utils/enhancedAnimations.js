/**
 * @fileoverview Enhanced animation utilities for tree components
 * Provides smooth transitions, visual feedback, and performance optimizations
 */

/**
 * Animation configuration constants
 */
export const ANIMATION_CONFIG = {
  // Duration constants
  FAST: 150,
  NORMAL: 250,
  SLOW: 400,
  
  // Easing functions
  EASE_OUT: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
  EASE_IN_OUT: 'cubic-bezier(0.645, 0.045, 0.355, 1)',
  BOUNCE: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  
  // Performance thresholds
  MAX_CONCURRENT_ANIMATIONS: 10,
  ANIMATION_FRAME_BUDGET: 16, // 60fps
};

/**
 * Enhanced transition manager with performance optimizations
 */
export class EnhancedTransitionManager {
  constructor() {
    this.activeAnimations = new Map();
    this.animationQueue = [];
    this.isProcessingQueue = false;
    this.performanceMonitor = new AnimationPerformanceMonitor();
  }

  /**
   * Animate expand/collapse with smooth height transition
   * @param {HTMLElement} element - Element to animate
   * @param {boolean} isExpanding - Whether expanding or collapsing
   * @param {Object} options - Animation options
   * @returns {Promise} Promise that resolves when animation completes
   */
  async animateExpandCollapse(element, isExpanding, options = {}) {
    const {
      duration = ANIMATION_CONFIG.NORMAL,
      easing = ANIMATION_CONFIG.EASE_OUT,
      onProgress = null,
      onComplete = null
    } = options;

    if (!element) return Promise.resolve();

    // Cancel existing animation for this element
    this.cancelAnimation(element);

    return new Promise((resolve) => {
      const startTime = performance.now();
      const startHeight = element.scrollHeight;
      const targetHeight = isExpanding ? startHeight : 0;
      const initialHeight = isExpanding ? 0 : startHeight;

      // Set initial state
      element.style.height = `${initialHeight}px`;
      element.style.overflow = 'hidden';
      element.style.transition = 'none';

      // Force reflow
      element.offsetHeight;

      // Start animation
      const animate = (currentTime) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Apply easing
        const easedProgress = this.applyEasing(progress, easing);
        
        // Calculate current height
        const currentHeight = initialHeight + (targetHeight - initialHeight) * easedProgress;
        element.style.height = `${currentHeight}px`;

        // Call progress callback
        if (onProgress) {
          onProgress(progress, currentHeight);
        }

        if (progress < 1) {
          const animationId = requestAnimationFrame(animate);
          this.activeAnimations.set(element, { animationId, type: 'expand-collapse' });
        } else {
          // Animation complete
          element.style.height = isExpanding ? 'auto' : '0px';
          element.style.overflow = '';
          element.style.transition = '';
          
          this.activeAnimations.delete(element);
          
          if (onComplete) onComplete();
          resolve();
        }
      };

      requestAnimationFrame(animate);
    });
  }

  /**
   * Animate selection with visual feedback
   * @param {HTMLElement} element - Element to animate
   * @param {Object} options - Animation options
   * @returns {Promise} Promise that resolves when animation completes
   */
  async animateSelection(element, options = {}) {
    const {
      duration = ANIMATION_CONFIG.FAST,
      highlightColor = '#3b82f6',
      pulseIntensity = 0.1
    } = options;

    if (!element) return Promise.resolve();

    return new Promise((resolve) => {
      const originalBoxShadow = element.style.boxShadow;
      const startTime = performance.now();

      const animate = (currentTime) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Create pulsing effect
        const intensity = Math.sin(progress * Math.PI) * pulseIntensity;
        const shadowIntensity = Math.max(0, intensity);
        
        element.style.boxShadow = `0 0 ${shadowIntensity * 20}px ${highlightColor}${Math.round(shadowIntensity * 255).toString(16).padStart(2, '0')}`;

        if (progress < 1) {
          const animationId = requestAnimationFrame(animate);
          this.activeAnimations.set(element, { animationId, type: 'selection' });
        } else {
          // Restore original state
          element.style.boxShadow = originalBoxShadow;
          this.activeAnimations.delete(element);
          resolve();
        }
      };

      requestAnimationFrame(animate);
    });
  }

  /**
   * Animate hover state with smooth scaling
   * @param {HTMLElement} element - Element to animate
   * @param {boolean} isHovering - Whether hovering or not
   * @param {Object} options - Animation options
   */
  animateHover(element, isHovering, options = {}) {
    const {
      scale = 1.02,
      duration = ANIMATION_CONFIG.FAST,
      easing = ANIMATION_CONFIG.EASE_OUT
    } = options;

    if (!element) return;

    const targetScale = isHovering ? scale : 1;
    
    element.style.transition = `transform ${duration}ms ${easing}`;
    element.style.transform = `scale(${targetScale})`;
  }

  /**
   * Animate focus state with ring effect
   * @param {HTMLElement} element - Element to animate
   * @param {boolean} isFocused - Whether focused or not
   * @param {Object} options - Animation options
   */
  animateFocus(element, isFocused, options = {}) {
    const {
      ringColor = '#3b82f6',
      ringWidth = 2,
      duration = ANIMATION_CONFIG.FAST
    } = options;

    if (!element) return;

    if (isFocused) {
      element.style.transition = `box-shadow ${duration}ms ${ANIMATION_CONFIG.EASE_OUT}`;
      element.style.boxShadow = `0 0 0 ${ringWidth}px ${ringColor}40`;
    } else {
      element.style.transition = `box-shadow ${duration}ms ${ANIMATION_CONFIG.EASE_OUT}`;
      element.style.boxShadow = 'none';
    }
  }

  /**
   * Animate loading state with skeleton shimmer
   * @param {HTMLElement} element - Element to animate
   * @param {boolean} isLoading - Whether loading or not
   */
  animateLoading(element, isLoading) {
    if (!element) return;

    if (isLoading) {
      element.classList.add('skeleton-animate');
    } else {
      element.classList.remove('skeleton-animate');
    }
  }

  /**
   * Smooth scroll to element with easing
   * @param {HTMLElement} element - Element to scroll to
   * @param {Object} options - Scroll options
   * @returns {Promise} Promise that resolves when scroll completes
   */
  async smoothScrollToElement(element, options = {}) {
    const {
      container = window,
      duration = ANIMATION_CONFIG.NORMAL,
      offset = 0,
      behavior = 'smooth'
    } = options;

    if (!element) return Promise.resolve();

    // Use native smooth scrolling if supported and preferred
    if (behavior === 'smooth' && 'scrollBehavior' in document.documentElement.style) {
      element.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'nearest',
        inline: 'nearest'
      });
      return Promise.resolve();
    }

    // Custom smooth scrolling implementation
    return new Promise((resolve) => {
      const rect = element.getBoundingClientRect();
      const containerRect = container === window ? 
        { top: 0, left: 0 } : 
        container.getBoundingClientRect();
      
      const targetY = rect.top - containerRect.top + offset;
      const startY = container === window ? window.scrollY : container.scrollTop;
      const distance = targetY - startY;
      const startTime = performance.now();

      const animate = (currentTime) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easedProgress = this.applyEasing(progress, ANIMATION_CONFIG.EASE_OUT);
        
        const currentY = startY + distance * easedProgress;
        
        if (container === window) {
          window.scrollTo(0, currentY);
        } else {
          container.scrollTop = currentY;
        }

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          resolve();
        }
      };

      requestAnimationFrame(animate);
    });
  }

  /**
   * Apply easing function to progress value
   * @private
   */
  applyEasing(progress, easing) {
    switch (easing) {
      case ANIMATION_CONFIG.EASE_OUT:
        return 1 - Math.pow(1 - progress, 3);
      case ANIMATION_CONFIG.EASE_IN_OUT:
        return progress < 0.5 
          ? 2 * progress * progress 
          : 1 - Math.pow(-2 * progress + 2, 3) / 2;
      case ANIMATION_CONFIG.BOUNCE:
        const c1 = 1.70158;
        const c3 = c1 + 1;
        return c3 * progress * progress * progress - c1 * progress * progress;
      default:
        return progress;
    }
  }

  /**
   * Cancel animation for specific element
   * @param {HTMLElement} element - Element to cancel animation for
   */
  cancelAnimation(element) {
    const animation = this.activeAnimations.get(element);
    if (animation && animation.animationId) {
      cancelAnimationFrame(animation.animationId);
      this.activeAnimations.delete(element);
    }
  }

  /**
   * Cancel all active animations
   */
  cancelAllAnimations() {
    for (const [element, animation] of this.activeAnimations) {
      if (animation.animationId) {
        cancelAnimationFrame(animation.animationId);
      }
    }
    this.activeAnimations.clear();
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics() {
    return this.performanceMonitor.getMetrics();
  }
}

/**
 * Performance monitor for animations
 */
class AnimationPerformanceMonitor {
  constructor() {
    this.metrics = {
      totalAnimations: 0,
      averageFrameTime: 0,
      droppedFrames: 0,
      memoryUsage: 0
    };
    this.frameTimes = [];
    this.maxFrameTimeHistory = 100;
  }

  recordFrameTime(frameTime) {
    this.frameTimes.push(frameTime);
    
    if (this.frameTimes.length > this.maxFrameTimeHistory) {
      this.frameTimes.shift();
    }

    // Calculate average
    this.metrics.averageFrameTime = 
      this.frameTimes.reduce((sum, time) => sum + time, 0) / this.frameTimes.length;

    // Count dropped frames (> 16.67ms for 60fps)
    if (frameTime > 16.67) {
      this.metrics.droppedFrames++;
    }
  }

  recordAnimation() {
    this.metrics.totalAnimations++;
  }

  getMetrics() {
    return { ...this.metrics };
  }

  reset() {
    this.metrics = {
      totalAnimations: 0,
      averageFrameTime: 0,
      droppedFrames: 0,
      memoryUsage: 0
    };
    this.frameTimes = [];
  }
}

/**
 * Utility functions for common animation patterns
 */
export const AnimationUtils = {
  /**
   * Create staggered animations for multiple elements
   * @param {HTMLElement[]} elements - Elements to animate
   * @param {Function} animationFn - Animation function
   * @param {number} staggerDelay - Delay between each animation
   */
  staggerAnimation: async (elements, animationFn, staggerDelay = 50) => {
    const promises = elements.map((element, index) => {
      return new Promise((resolve) => {
        setTimeout(() => {
          animationFn(element).then(resolve);
        }, index * staggerDelay);
      });
    });

    return Promise.all(promises);
  },

  /**
   * Create entrance animation for new elements
   * @param {HTMLElement} element - Element to animate
   * @param {string} direction - Animation direction
   */
  animateEntrance: (element, direction = 'up') => {
    if (!element) return Promise.resolve();

    const transforms = {
      up: 'translateY(20px)',
      down: 'translateY(-20px)',
      left: 'translateX(20px)',
      right: 'translateX(-20px)',
      scale: 'scale(0.9)'
    };

    element.style.opacity = '0';
    element.style.transform = transforms[direction] || transforms.up;
    element.style.transition = `opacity ${ANIMATION_CONFIG.NORMAL}ms ${ANIMATION_CONFIG.EASE_OUT}, transform ${ANIMATION_CONFIG.NORMAL}ms ${ANIMATION_CONFIG.EASE_OUT}`;

    // Force reflow
    element.offsetHeight;

    // Animate to final state
    element.style.opacity = '1';
    element.style.transform = 'translateY(0) translateX(0) scale(1)';

    return new Promise((resolve) => {
      setTimeout(() => {
        element.style.transition = '';
        resolve();
      }, ANIMATION_CONFIG.NORMAL);
    });
  },

  /**
   * Create exit animation for removing elements
   * @param {HTMLElement} element - Element to animate
   * @param {string} direction - Animation direction
   */
  animateExit: (element, direction = 'up') => {
    if (!element) return Promise.resolve();

    const transforms = {
      up: 'translateY(-20px)',
      down: 'translateY(20px)',
      left: 'translateX(-20px)',
      right: 'translateX(20px)',
      scale: 'scale(0.9)'
    };

    element.style.transition = `opacity ${ANIMATION_CONFIG.FAST}ms ${ANIMATION_CONFIG.EASE_OUT}, transform ${ANIMATION_CONFIG.FAST}ms ${ANIMATION_CONFIG.EASE_OUT}`;
    element.style.opacity = '0';
    element.style.transform = transforms[direction] || transforms.up;

    return new Promise((resolve) => {
      setTimeout(() => {
        resolve();
      }, ANIMATION_CONFIG.FAST);
    });
  }
};

// Global enhanced transition manager instance
export const globalEnhancedTransitionManager = new EnhancedTransitionManager();

// Utility function to check if animations should be disabled
export const shouldDisableAnimations = () => {
  // Check for reduced motion preference
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return true;
  }

  // Check for low-end device indicators
  if (navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4) {
    return true;
  }

  // Check for slow connection
  if (navigator.connection && navigator.connection.effectiveType && 
      ['slow-2g', '2g'].includes(navigator.connection.effectiveType)) {
    return true;
  }

  return false;
};