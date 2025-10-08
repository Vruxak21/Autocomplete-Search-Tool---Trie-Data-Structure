/**
 * @fileoverview Integration tests for view switching and state preservation
 * Tests the complete flow of switching between tree and list views
 */

import React, { useState, useEffect } from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import SuggestionsDropdown from '../SuggestionsDropdown';
import { ViewStateManager } from '../../utils/ViewStateManager.js';
import { TreeBuilder } from '../../utils/TreeBuilder.js';
import { VIEW_MODES, NODE_TYPES } from '../../types/tree.js';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Test wrapper component that manages view state
const ViewSwitchingTestWrapper = ({ 
  suggestions = [],
  onSelect = vi.fn(),
  onViewChange = vi.fn(),
  initialViewMode = VIEW_MODES