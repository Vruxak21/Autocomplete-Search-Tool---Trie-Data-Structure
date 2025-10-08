import {
  ANIMATION_CONFIG,
  EnhancedTransitionManager,
  AnimationUtils,
  globalEnhancedTransitionManager,
  shouldDisableAnimations
} from './enhancedAnimations.js';

// Mock requestAnimationFrame and cancelAnimationFrame
global.requestAnimationFrame = jest.fn((cb) => setTimeout(cb, 16));
global.cancelAnimationFrame = jest.fn((id) => clearTimeout(id));

// Mock performance.now
global.performance = {
  now: jest.fn(() => Date.now())
};

describe('Enhanced Animations', () => {
  let mockElement;
  let transitionManager;

  beforeEach(() => {
    // Create mock DOM element
    mockElement = {
      style: {},
      offsetHeight: 100,
      scrollHeight: 200,
      getBoundingClientRect: () => ({
        top: 100,
        left: 100,
        bottom: 120,
        right: 200,
        width: 100,
        height: 20
      }),
      scrollIntoView: jest.fn(),
      classList: {
        add: jest.fn(),
        remove: jest.fn(),
        contains: jest.fn()
      },
      setAttribute: jest.fn(),
      hasAttribute: jest.fn(() => false)
    };

    transitionManager = new EnhancedTransitionManager();
    
    // Reset mocks
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    transitionManager.cancelAllAnimations();
  });

  describe('ANIMATION_CONFIG', () => {
    it('has correct duration constants', () => {
      expect(ANIMATION_CONFIG.FAST).toBe(150);
      expect(ANIMATION_CONFIG.NORMAL).toBe(250);
      expect(ANIMATION_CONFIG.SLOW).toBe(400);
    });

    it('has correct easing functions', () => {
      expect(ANIMATION_CONFIG.EASE_OUT).toBe('cubic-bezier(0.25, 0.46, 0.45, 0.94)');
      expect(ANIMATION_CONFIG.EASE_IN_OUT).toBe('cubic-bezier(0.645, 0.045, 0.355, 1)');
      expect(ANIMATION_CONFIG.BOUNCE).toBe('cubic-bezier(0.68, -0.55, 0.265, 1.55)');
    });

    it('has performance thresholds', () => {
      expect(ANIMATION_CONFIG.MAX_CONCURRENT_ANIMATIONS).toBe(10);
      expect(ANIMATION_CONFIG.ANIMATION_FRAME_BUDGET).toBe(16);
    });
  });

  describe('EnhancedTransitionManager', () => {
    describe('animateExpandCollapse', () => {
      it('animates expand correctly', async () => {
        const promise = transitionManager.animateExpandCollapse(mockElement, true, {
          duration: 100
        });

        // Fast-forward time
        jest.advanceTimersByTime(100);
        await promise;

        expect(mockElement.style.height).toBe('auto');
        expect(mockElement.style.overflow).toBe('');
      });

      it('animates collapse correctly', async () => {
        const promise = transitionManager.animateExpandCollapse(mockElement, false, {
          duration: 100
        });

        // Fast-forward time
        jest.advanceTimersByTime(100);
        await promise;

        expect(mockElement.style.height).toBe('0px');
      });

      it('calls progress callback during animation', async () => {
        const onProgress = jest.fn();
        
        const promise = transitionManager.animateExpandCollapse(mockElement, true, {
          duration: 100,
          onProgress
        });

        // Advance time partially
        jest.advanceTimersByTime(50);
        
        // Progress callback should have been called
        expect(onProgress).toHaveBeenCalled();
        
        // Complete animation
        jest.advanceTimersByTime(50);
        await promise;
      });

      it('calls completion callback', async () => {
        const onComplete = jest.fn();
        
        const promise = transitionManager.animateExpandCollapse(mockElement, true, {
          duration: 100,
          onComplete
        });

        jest.advanceTimersByTime(100);
        await promise;

        expect(onComplete).toHaveBeenCalled();
      });

      it('handles null element gracefully', async () => {
        const promise = transitionManager.animateExpandCollapse(null, true);
        await expect(promise).resolves.toBeUndefined();
      });
    });

    describe('animateSelection', () => {
      it('animates selection with pulsing effect', async () => {
        const promise = transitionManager.animateSelection(mockElement, {
          duration: 100
        });

        jest.advanceTimersByTime(100);
        await promise;

        // Should restore original box shadow
        expect(mockElement.style.boxShadow).toBe('');
      });

      it('uses custom highlight color', async () => {
        const promise = transitionManager.animateSelection(mockElement, {
          duration: 50,
          highlightColor: '#ff0000'
        });

        // Check that custom color is used during animation
        jest.advanceTimersByTime(25);
        expect(mockElement.style.boxShadow).toContain('#ff0000');

        jest.advanceTimersByTime(25);
        await promise;
      });
    });

    describe('animateHover', () => {
      it('scales element on hover', () => {
        transitionManager.animateHover(mockElement, true, { scale: 1.05 });
        
        expect(mockElement.style.transform).toBe('scale(1.05)');
        expect(mockElement.style.transition).toContain('transform');
      });

      it('resets scale on hover out', () => {
        transitionManager.animateHover(mockElement, false);
        
        expect(mockElement.style.transform).toBe('scale(1)');
      });

      it('handles null element gracefully', () => {
        expect(() => {
          transitionManager.animateHover(null, true);
        }).not.toThrow();
      });
    });

    describe('animateFocus', () => {
      it('adds focus ring when focused', () => {
        transitionManager.animateFocus(mockElement, true);
        
        expect(mockElement.style.boxShadow).toContain('#3b82f6');
        expect(mockElement.style.transition).toContain('box-shadow');
      });

      it('removes focus ring when blurred', () => {
        transitionManager.animateFocus(mockElement, false);
        
        expect(mockElement.style.boxShadow).toBe('none');
      });

      it('uses custom ring color', () => {
        transitionManager.animateFocus(mockElement, true, {
          ringColor: '#ff0000'
        });
        
        expect(mockElement.style.boxShadow).toContain('#ff0000');
      });
    });

    describe('animateLoading', () => {
      it('adds skeleton animation class when loading', () => {
        transitionManager.animateLoading(mockElement, true);
        
        expect(mockElement.classList.add).toHaveBeenCalledWith('skeleton-animate');
      });

      it('removes skeleton animation class when not loading', () => {
        transitionManager.animateLoading(mockElement, false);
        
        expect(mockElement.classList.remove).toHaveBeenCalledWith('skeleton-animate');
      });
    });

    describe('smoothScrollToElement', () => {
      beforeEach(() => {
        // Mock window properties
        Object.defineProperty(window, 'scrollY', { value: 0, writable: true });
        Object.defineProperty(window, 'scrollTo', { value: jest.fn(), writable: true });
      });

      it('uses native smooth scrolling when supported', async () => {
        // Mock smooth scrolling support
        Object.defineProperty(document.documentElement.style, 'scrollBehavior', {
          value: '',
          writable: true
        });

        await transitionManager.smoothScrollToElement(mockElement, {
          behavior: 'smooth'
        });

        expect(mockElement.scrollIntoView).toHaveBeenCalledWith({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'nearest'
        });
      });

      it('uses custom smooth scrolling when native not supported', async () => {
        const promise = transitionManager.smoothScrollToElement(mockElement, {
          duration: 100,
          behavior: 'custom'
        });

        jest.advanceTimersByTime(100);
        await promise;

        expect(window.scrollTo).toHaveBeenCalled();
      });
    });

    describe('easing functions', () => {
      it('applies ease-out easing correctly', () => {
        const result = transitionManager.applyEasing(0.5, ANIMATION_CONFIG.EASE_OUT);
        expect(result).toBeGreaterThan(0.5); // Ease-out should accelerate early
      });

      it('applies ease-in-out easing correctly', () => {
        const result1 = transitionManager.applyEasing(0.25, ANIMATION_CONFIG.EASE_IN_OUT);
        const result2 = transitionManager.applyEasing(0.75, ANIMATION_CONFIG.EASE_IN_OUT);
        expect(result1).toBeLessThan(0.25); // Slow start
        expect(result2).toBeGreaterThan(0.75); // Slow end
      });

      it('applies bounce easing correctly', () => {
        const result = transitionManager.applyEasing(0.5, ANIMATION_CONFIG.BOUNCE);
        expect(typeof result).toBe('number');
      });

      it('returns linear progress for unknown easing', () => {
        const result = transitionManager.applyEasing(0.5, 'unknown');
        expect(result).toBe(0.5);
      });
    });

    describe('animation management', () => {
      it('cancels specific animation', () => {
        transitionManager.activeAnimations.set(mockElement, {
          animationId: 123,
          type: 'test'
        });

        transitionManager.cancelAnimation(mockElement);

        expect(transitionManager.activeAnimations.has(mockElement)).toBe(false);
        expect(cancelAnimationFrame).toHaveBeenCalledWith(123);
      });

      it('cancels all animations', () => {
        transitionManager.activeAnimations.set(mockElement, {
          animationId: 123,
          type: 'test'
        });

        transitionManager.cancelAllAnimations();

        expect(transitionManager.activeAnimations.size).toBe(0);
        expect(cancelAnimationFrame).toHaveBeenCalledWith(123);
      });
    });
  });

  describe('AnimationUtils', () => {
    describe('staggerAnimation', () => {
      it('staggers animations with delay', async () => {
        const elements = [mockElement, { ...mockElement }, { ...mockElement }];
        const animationFn = jest.fn(() => Promise.resolve());

        const promise = AnimationUtils.staggerAnimation(elements, animationFn, 50);

        // Fast-forward time to trigger all animations
        jest.advanceTimersByTime(150);
        await promise;

        expect(animationFn).toHaveBeenCalledTimes(3);
      });
    });

    describe('animateEntrance', () => {
      it('animates element entrance', async () => {
        const promise = AnimationUtils.animateEntrance(mockElement, 'up');

        // Check initial state
        expect(mockElement.style.opacity).toBe('0');
        expect(mockElement.style.transform).toBe('translateY(20px)');

        jest.advanceTimersByTime(250);
        await promise;

        // Check final state
        expect(mockElement.style.opacity).toBe('1');
        expect(mockElement.style.transform).toBe('translateY(0) translateX(0) scale(1)');
      });

      it('handles different directions', async () => {
        await AnimationUtils.animateEntrance(mockElement, 'left');
        expect(mockElement.style.transform).toContain('translateX');

        await AnimationUtils.animateEntrance(mockElement, 'scale');
        expect(mockElement.style.transform).toContain('scale');
      });

      it('handles null element gracefully', async () => {
        const promise = AnimationUtils.animateEntrance(null, 'up');
        await expect(promise).resolves.toBeUndefined();
      });
    });

    describe('animateExit', () => {
      it('animates element exit', async () => {
        const promise = AnimationUtils.animateExit(mockElement, 'up');

        expect(mockElement.style.opacity).toBe('0');
        expect(mockElement.style.transform).toBe('translateY(-20px)');

        jest.advanceTimersByTime(150);
        await promise;
      });

      it('handles different directions', async () => {
        await AnimationUtils.animateExit(mockElement, 'right');
        expect(mockElement.style.transform).toBe('translateX(20px)');
      });
    });
  });

  describe('shouldDisableAnimations', () => {
    beforeEach(() => {
      // Reset navigator mocks
      Object.defineProperty(navigator, 'hardwareConcurrency', {
        value: 8,
        writable: true
      });
      Object.defineProperty(navigator, 'connection', {
        value: { effectiveType: '4g' },
        writable: true
      });
    });

    it('disables animations for reduced motion preference', () => {
      // Mock matchMedia for reduced motion
      Object.defineProperty(window, 'matchMedia', {
        value: jest.fn(() => ({
          matches: true
        })),
        writable: true
      });

      expect(shouldDisableAnimations()).toBe(true);
    });

    it('disables animations for low-end devices', () => {
      Object.defineProperty(navigator, 'hardwareConcurrency', {
        value: 2,
        writable: true
      });

      expect(shouldDisableAnimations()).toBe(true);
    });

    it('disables animations for slow connections', () => {
      Object.defineProperty(navigator, 'connection', {
        value: { effectiveType: '2g' },
        writable: true
      });

      expect(shouldDisableAnimations()).toBe(true);
    });

    it('enables animations for capable devices', () => {
      Object.defineProperty(window, 'matchMedia', {
        value: jest.fn(() => ({
          matches: false
        })),
        writable: true
      });

      expect(shouldDisableAnimations()).toBe(false);
    });

    it('handles missing APIs gracefully', () => {
      Object.defineProperty(window, 'matchMedia', {
        value: undefined,
        writable: true
      });
      Object.defineProperty(navigator, 'hardwareConcurrency', {
        value: undefined,
        writable: true
      });
      Object.defineProperty(navigator, 'connection', {
        value: undefined,
        writable: true
      });

      expect(() => shouldDisableAnimations()).not.toThrow();
    });
  });

  describe('Global Instance', () => {
    it('exports global enhanced transition manager', () => {
      expect(globalEnhancedTransitionManager).toBeInstanceOf(EnhancedTransitionManager);
    });
  });
});