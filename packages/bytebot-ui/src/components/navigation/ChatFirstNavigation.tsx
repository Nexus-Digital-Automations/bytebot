/**
 * Chat-First Navigation System
 * 
 * Revolutionary navigation system that transforms traditional menu-driven interfaces
 * into natural language command processing. Users can navigate and control the entire
 * application through conversational commands, making complex enterprise operations
 * as intuitive as having a conversation.
 * 
 * Key Features:
 * - Natural Language Understanding (NLU) for navigation commands
 * - Context-aware command processing
 * - Intent recognition and parameter extraction
 * - Voice-enabled navigation commands
 * - Accessibility-first design with screen reader support
 * - Real-time command suggestions and auto-completion
 * - Enterprise command templates and shortcuts
 * - Multi-modal interaction (text, voice, gestures)
 * 
 * @fileoverview Chat-first navigation and command processing system
 * @version 1.0.0
 * @author Frontend Chat-First Interface Agent #9
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
// Removed unused UI components: ScrollArea, Popover, PopoverContent, PopoverTrigger
import { Badge } from '@/components/ui/badge';
import { 
  AnalyticsIcon,
  HelpIcon,
  HomeIcon,
  HugeiconsIcon,
  KeyboardIcon,
  MicrophoneIcon,
  NavigationIcon,
  SearchIcon,
  SettingsIcon,
  TaskIcon,
  UserIcon
} from '@hugeicons/core-free-icons';
import { logDebug, logInfo, logWarning } from '@/utils/logger';

// ===========================
// TYPE DEFINITIONS
// ===========================

/**
 * Navigation command intent types
 */
export enum NavigationIntent {
  NAVIGATE = 'navigate',
  SEARCH = 'search',
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  FILTER = 'filter',
  SORT = 'sort',
  EXPORT = 'export',
  HELP = 'help',
  SETTINGS = 'settings',
  LOGOUT = 'logout',
  UNKNOWN = 'unknown'
}

/**
 * Navigation entities that can be referenced in commands
 */
export enum NavigationEntity {
  DASHBOARD = 'dashboard',
  TASKS = 'tasks',
  TASK = 'task',
  PROJECTS = 'projects',
  PROJECT = 'project',
  USERS = 'users',
  USER = 'user',
  SETTINGS = 'settings',
  REPORTS = 'reports',
  ANALYTICS = 'analytics',
  HELP = 'help',
  PROFILE = 'profile'
}

/**
 * Command processing result
 */
interface CommandResult {
  /** Recognized intent */
  intent: NavigationIntent;
  
  /** Target entity */
  entity?: NavigationEntity;
  
  /** Extracted parameters */
  parameters: Record<string, unknown>;
  
  /** Confidence score (0-1) */
  confidence: number;
  
  /** Parsed command text */
  parsedCommand: string;
  
  /** Suggested action */
  suggestedAction?: NavigationAction;
  
  /** Alternative suggestions */
  alternatives?: CommandResult[];
}

/**
 * Navigation action definition
 */
interface NavigationAction {
  /** Action identifier */
  id: string;
  
  /** Display label */
  label: string;
  
  /** Action description */
  description: string;
  
  /** Navigation path */
  path?: string;
  
  /** Action handler */
  handler?: () => void | Promise<void>;
  
  /** Required parameters */
  requiredParams?: string[];
  
  /** Action icon */
  icon?: React.ComponentType;
  
  /** Keyboard shortcut */
  shortcut?: string;
  
  /** Voice command patterns */
  voicePatterns?: string[];
  
  /** Category */
  category: NavigationCategory;
}

/**
 * Navigation categories
 */
export enum NavigationCategory {
  CORE = 'core',
  CONTENT = 'content',
  ADMINISTRATION = 'administration',
  HELP = 'help',
  PERSONAL = 'personal'
}

/**
 * Command suggestion
 */
interface CommandSuggestion {
  /** Suggestion text */
  text: string;
  
  /** Completion text */
  completion: string;
  
  /** Suggestion type */
  type: 'command' | 'entity' | 'parameter';
  
  /** Confidence score */
  confidence: number;
  
  /** Associated action */
  action?: NavigationAction;
  
  /** Usage frequency */
  frequency: number;
}

/**
 * Voice recognition state
 */
interface VoiceRecognitionState {
  isListening: boolean;
  isProcessing: boolean;
  transcript: string;
  confidence: number;
  error?: string;
}

/**
 * Navigation context
 */
interface NavigationContext {
  /** Current route */
  currentRoute: string;
  
  /** Route parameters */
  routeParams: Record<string, string>;
  
  /** User context */
  user?: {
    id: string;
    name: string;
    role: string;
    permissions: string[];
  };
  
  /** Recent commands */
  recentCommands: string[];
  
  /** Preferred shortcuts */
  shortcuts: Record<string, string>;
  
  /** Accessibility preferences */
  a11y: {
    screenReader: boolean;
    keyboardOnly: boolean;
    highContrast: boolean;
    reducedMotion: boolean;
  };
}

/**
 * Component props
 */
interface ChatFirstNavigationProps {
  /** CSS class name */
  className?: string;
  
  /** Show as compact mode */
  compact?: boolean;
  
  /** Enable voice commands */
  enableVoice?: boolean;
  
  /** Enable keyboard shortcuts */
  enableKeyboard?: boolean;
  
  /** Show command suggestions */
  showSuggestions?: boolean;
  
  /** Maximum suggestions to show */
  maxSuggestions?: number;
  
  /** Custom navigation actions */
  customActions?: NavigationAction[];
  
  /** Navigation context */
  context?: Partial<NavigationContext>;
  
  /** Event handlers */
  onCommandExecuted?: (command: string, result: CommandResult) => void;
  onNavigate?: (path: string, params?: Record<string, unknown>) => void;
  onError?: (error: string) => void;
  
  /** Styling */
  theme?: 'light' | 'dark' | 'auto';
  position?: 'top' | 'bottom' | 'floating';
}

// ===========================
// NAVIGATION ACTIONS
// ===========================

const DEFAULT_ACTIONS: NavigationAction[] = [
  // Core Navigation
  {
    id: 'nav-dashboard',
    label: 'Go to Dashboard',
    description: 'Navigate to the main dashboard',
    path: '/',
    icon: HomeIcon,
    shortcut: 'Ctrl+H',
    voicePatterns: ['go to dashboard', 'show dashboard', 'home', 'main page'],
    category: NavigationCategory.CORE
  },
  {
    id: 'nav-tasks',
    label: 'View Tasks',
    description: 'Navigate to tasks list',
    path: '/tasks',
    icon: TaskIcon,
    shortcut: 'Ctrl+T',
    voicePatterns: ['show tasks', 'go to tasks', 'task list', 'my tasks'],
    category: NavigationCategory.CONTENT
  },
  {
    id: 'nav-analytics',
    label: 'View Analytics',
    description: 'Navigate to analytics dashboard',
    path: '/analytics',
    icon: AnalyticsIcon,
    shortcut: 'Ctrl+A',
    voicePatterns: ['show analytics', 'go to analytics', 'reports', 'statistics'],
    category: NavigationCategory.CONTENT
  },
  {
    id: 'nav-settings',
    label: 'Open Settings',
    description: 'Navigate to application settings',
    path: '/settings',
    icon: SettingsIcon,
    shortcut: 'Ctrl+,',
    voicePatterns: ['open settings', 'go to settings', 'preferences', 'configuration'],
    category: NavigationCategory.ADMINISTRATION
  },
  {
    id: 'nav-help',
    label: 'Get Help',
    description: 'Open help and documentation',
    path: '/help',
    icon: HelpIcon,
    shortcut: 'F1',
    voicePatterns: ['help', 'documentation', 'support', 'how to'],
    category: NavigationCategory.HELP
  },
  {
    id: 'nav-profile',
    label: 'View Profile',
    description: 'Navigate to user profile',
    path: '/profile',
    icon: UserIcon,
    shortcut: 'Ctrl+P',
    voicePatterns: ['my profile', 'user profile', 'account', 'profile settings'],
    category: NavigationCategory.PERSONAL
  },
  
  // Action Commands
  {
    id: 'create-task',
    label: 'Create New Task',
    description: 'Create a new task',
    handler: async (): Promise<void> => {
      // TODO: Implement task creation
      logInfo('Create task command executed', null, 'ChatFirstNavigation');
    },
    icon: TaskIcon,
    shortcut: 'Ctrl+N',
    voicePatterns: ['create task', 'new task', 'add task'],
    category: NavigationCategory.CONTENT
  },
  {
    id: 'search-global',
    label: 'Global Search',
    description: 'Search across all content',
    handler: async (): Promise<void> => {
      // TODO: Implement global search
      logInfo('Global search command executed', null, 'ChatFirstNavigation');
    },
    icon: SearchIcon,
    shortcut: 'Ctrl+K',
    voicePatterns: ['search', 'find', 'look for'],
    category: NavigationCategory.CORE,
    requiredParams: ['query']
  }
];

// ===========================
// COMMAND PROCESSING
// ===========================

/**
 * Natural Language Understanding engine for navigation commands
 */
class NavigationNLU {
  private actions: NavigationAction[];
  private context: NavigationContext;
  
  constructor(actions: NavigationAction[], context: NavigationContext) {
    this.actions = actions;
    this.context = context;
  }
  
  /**
   * Process natural language command and extract intent/entities
   */
  processCommand(command: string): CommandResult {
    const normalizedCommand = command.toLowerCase().trim();
    
    // Intent classification
    const intent = this.classifyIntent(normalizedCommand);
    
    // Entity extraction
    const entity = this.extractEntity(normalizedCommand);
    
    // Parameter extraction
    const parameters = this.extractParameters(normalizedCommand, intent);
    
    // Find matching action
    const suggestedAction = this.findBestAction(intent, entity, parameters);
    
    // Calculate confidence
    const confidence = this.calculateConfidence(normalizedCommand, intent, entity, suggestedAction);
    
    // Generate alternatives
    const alternatives = this.generateAlternatives(normalizedCommand, intent);
    
    return {
      intent,
      entity,
      parameters,
      confidence,
      parsedCommand: normalizedCommand,
      suggestedAction,
      alternatives
    };
  }
  
  /**
   * Classify command intent using pattern matching and ML-like scoring
   */
  private classifyIntent(command: string): NavigationIntent {
    const intentPatterns = {
      [NavigationIntent.NAVIGATE]: [
        'go to', 'navigate to', 'show', 'open', 'visit', 'switch to', 'take me to'
      ],
      [NavigationIntent.SEARCH]: [
        'search', 'find', 'look for', 'query', 'locate'
      ],
      [NavigationIntent.CREATE]: [
        'create', 'new', 'add', 'make', 'build', 'generate'
      ],
      [NavigationIntent.UPDATE]: [
        'update', 'edit', 'modify', 'change', 'alter'
      ],
      [NavigationIntent.DELETE]: [
        'delete', 'remove', 'destroy', 'eliminate'
      ],
      [NavigationIntent.FILTER]: [
        'filter', 'show only', 'display only', 'limit to'
      ],
      [NavigationIntent.SORT]: [
        'sort', 'order', 'arrange', 'organize'
      ],
      [NavigationIntent.EXPORT]: [
        'export', 'download', 'save as', 'extract'
      ],
      [NavigationIntent.HELP]: [
        'help', 'how to', 'tutorial', 'guide', 'documentation'
      ],
      [NavigationIntent.SETTINGS]: [
        'settings', 'preferences', 'configuration', 'options'
      ],
      [NavigationIntent.LOGOUT]: [
        'logout', 'sign out', 'log out', 'exit'
      ]
    };
    
    let bestMatch = NavigationIntent.UNKNOWN;
    let bestScore = 0;
    
    for (const [intent, patterns] of Object.entries(intentPatterns)) {
      const score = patterns.reduce((maxScore, pattern) => {
        if (command.includes(pattern)) {
          return Math.max(maxScore, pattern.length / command.length);
        }
        return maxScore;
      }, 0);
      
      if (score > bestScore) {
        bestScore = score;
        bestMatch = intent as NavigationIntent;
      }
    }
    
    return bestMatch;
  }
  
  /**
   * Extract navigation entities from command
   */
  private extractEntity(command: string): NavigationEntity | undefined {
    const entityPatterns = {
      [NavigationEntity.DASHBOARD]: ['dashboard', 'home', 'main'],
      [NavigationEntity.TASKS]: ['tasks', 'task list', 'todos'],
      [NavigationEntity.TASK]: ['task'],
      [NavigationEntity.PROJECTS]: ['projects', 'project list'],
      [NavigationEntity.PROJECT]: ['project'],
      [NavigationEntity.USERS]: ['users', 'user list', 'people'],
      [NavigationEntity.USER]: ['user', 'person', 'profile'],
      [NavigationEntity.SETTINGS]: ['settings', 'preferences', 'config'],
      [NavigationEntity.REPORTS]: ['reports', 'reporting'],
      [NavigationEntity.ANALYTICS]: ['analytics', 'stats', 'metrics'],
      [NavigationEntity.HELP]: ['help', 'documentation', 'support']
    };
    
    for (const [entity, patterns] of Object.entries(entityPatterns)) {
      if (patterns.some(pattern => command.includes(pattern))) {
        return entity as NavigationEntity;
      }
    }
    
    return undefined;
  }
  
  /**
   * Extract parameters from command based on intent
   */
  private extractParameters(command: string, intent: NavigationIntent): Record<string, unknown> {
    const parameters: Record<string, unknown> = {};
    
    // Extract common parameters
    const idMatch = command.match(/(?:id|number|#)\s*(\w+)/);
    if (idMatch) {
      parameters.id = idMatch[1];
    }
    
    const nameMatch = command.match(/(?:named|called)\s+["']([^"']+)["']/);
    if (nameMatch) {
      parameters.name = nameMatch[1];
    }
    
    // Intent-specific parameter extraction
    switch (intent) {
      case NavigationIntent.SEARCH: {
        const searchMatch = command.match(/(?:search|find|look for)\s+["']([^"']+)["']/) ||
                           command.match(/(?:search|find|look for)\s+(\w+)/);
        if (searchMatch) {
          parameters.query = searchMatch[1];
        }
        break;
      }
        
      case NavigationIntent.FILTER: {
        const filterMatch = command.match(/(?:by|where)\s+(\w+)\s*(?:is|equals)\s*([^\s]+)/);
        if (filterMatch) {
          parameters.filterField = filterMatch[1];
          parameters.filterValue = filterMatch[2];
        }
        break;
      }
        
      case NavigationIntent.SORT: {
        const sortMatch = command.match(/(?:sort|order)\s+by\s+(\w+)(?:\s+(asc|desc|ascending|descending))?/);
        if (sortMatch) {
          parameters.sortField = sortMatch[1];
          parameters.sortDirection = sortMatch[2] || 'asc';
        }
        break;
      }
      
      case NavigationIntent.NAVIGATE:
      case NavigationIntent.CREATE:
      case NavigationIntent.UPDATE:
      case NavigationIntent.DELETE:
      case NavigationIntent.EXPORT:
      case NavigationIntent.HELP:
      case NavigationIntent.SETTINGS:
      case NavigationIntent.LOGOUT:
      case NavigationIntent.UNKNOWN:
      default:
        // No specific parameter extraction for these intents
        break;
    }
    
    return parameters;
  }
  
  /**
   * Find the best matching action for the processed command
   */
  private findBestAction(
    intent: NavigationIntent,
    entity?: NavigationEntity,
    parameters: Record<string, unknown> = {}
  ): NavigationAction | undefined {
    let bestAction: NavigationAction | undefined;
    let bestScore = 0;
    
    for (const action of this.actions) {
      let score = 0;
      
      // Score based on intent match
      if (intent === NavigationIntent.NAVIGATE && action.path) {
        score += 0.5;
      } else if (intent === NavigationIntent.CREATE && action.id.includes('create')) {
        score += 0.7;
      } else if (intent === NavigationIntent.SEARCH && action.id.includes('search')) {
        score += 0.7;
      }
      
      // Score based on entity match
      if (entity) {
        const entityInPath = action.path?.includes(entity.toLowerCase());
        const entityInId = action.id.includes(entity.toLowerCase());
        if (entityInPath || entityInId) {
          score += 0.4;
        }
      }
      
      // Score based on required parameters
      if (action.requiredParams) {
        const hasAllParams = action.requiredParams.every(param => 
          Object.prototype.hasOwnProperty.call(parameters, param)
        );
        if (hasAllParams) {
          score += 0.3;
        } else {
          score -= 0.2; // Penalize missing required params
        }
      }
      
      if (score > bestScore) {
        bestScore = score;
        bestAction = action;
      }
    }
    
    return bestScore > 0.3 ? bestAction : undefined;
  }
  
  /**
   * Calculate confidence score for the command processing result
   */
  private calculateConfidence(
    command: string,
    intent: NavigationIntent,
    entity?: NavigationEntity,
    action?: NavigationAction
  ): number {
    let confidence = 0;
    
    // Base confidence from intent recognition
    if (intent !== NavigationIntent.UNKNOWN) {
      confidence += 0.3;
    }
    
    // Confidence from entity recognition
    if (entity) {
      confidence += 0.2;
    }
    
    // Confidence from action matching
    if (action) {
      confidence += 0.3;
    }
    
    // Confidence from command completeness (longer, more specific commands)
    const wordCount = command.split(' ').length;
    confidence += Math.min(0.2, wordCount * 0.05);
    
    return Math.min(1, confidence);
  }
  
  /**
   * Generate alternative command interpretations
   */
  private generateAlternatives(_command: string, _primaryIntent: NavigationIntent): CommandResult[] {
    // For now, return empty array - could be enhanced with fuzzy matching
    return [];
  }
  
  /**
   * Generate command suggestions based on partial input
   */
  generateSuggestions(partialCommand: string): CommandSuggestion[] {
    const suggestions: CommandSuggestion[] = [];
    const normalizedInput = partialCommand.toLowerCase();
    
    // Match against action voice patterns
    for (const action of this.actions) {
      if (action.voicePatterns) {
        for (const pattern of action.voicePatterns) {
          if (pattern.toLowerCase().startsWith(normalizedInput)) {
            suggestions.push({
              text: pattern,
              completion: pattern.substring(normalizedInput.length),
              type: 'command',
              confidence: 0.8,
              action,
              frequency: this.getCommandFrequency(pattern)
            });
          }
        }
      }
    }
    
    // Sort by confidence and frequency
    return suggestions
      .sort((a, b) => (b.confidence + b.frequency) - (a.confidence + a.frequency))
      .slice(0, 10);
  }
  
  /**
   * Get command usage frequency (mock implementation)
   */
  private getCommandFrequency(command: string): number {
    // In a real implementation, this would query usage analytics
    const commonCommands = ['go to dashboard', 'show tasks', 'help'];
    return commonCommands.includes(command) ? 0.8 : 0.3;
  }
}

// ===========================
// MAIN COMPONENT
// ===========================

/**
 * Chat-First Navigation Component
 * 
 * Revolutionary navigation system that transforms menu-driven interfaces
 * into natural language command processing.
 */
export const ChatFirstNavigation: React.FC<ChatFirstNavigationProps> = ({
  className,
  compact = false,
  enableVoice = true,
  enableKeyboard = true,
  showSuggestions = true,
  maxSuggestions = 5,
  customActions = [],
  context = {},
  onCommandExecuted,
  onNavigate,
  onError,
  _theme = 'auto',
  position = 'top'
}) => {
  // ===========================
  // STATE AND REFS
  // ===========================
  
  const router = useRouter();
  const [command, setCommand] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [suggestions, setSuggestions] = useState<CommandSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const [recentCommands, setRecentCommands] = useState<string[]>([]);
  const [voiceState, setVoiceState] = useState<VoiceRecognitionState>({
    isListening: false,
    isProcessing: false,
    transcript: '',
    confidence: 0
  });
  
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  
  // ===========================
  // NAVIGATION SETUP
  // ===========================
  
  const navigationContext: NavigationContext = useMemo(() => ({
    currentRoute: window?.location?.pathname || '/',
    routeParams: {},
    recentCommands,
    shortcuts: {},
    a11y: {
      screenReader: false,
      keyboardOnly: false,
      highContrast: false,
      reducedMotion: false
    },
    ...context
  }), [context, recentCommands]);
  
  const allActions = useMemo(() => [
    ...DEFAULT_ACTIONS,
    ...customActions
  ], [customActions]);
  
  const nlu = useMemo(() => 
    new NavigationNLU(allActions, navigationContext),
    [allActions, navigationContext]
  );
  
  // ===========================
  // COMMAND PROCESSING
  // ===========================
  
  const processCommand = useCallback(async (commandText: string) => {
    if (!commandText.trim()) { return; }
    
    setIsProcessing(true);
    
    try {
      logDebug('Processing navigation command', { command: commandText }, 'ChatFirstNavigation');
      
      const result = nlu.processCommand(commandText);
      
      logInfo('Command processed', { 
        intent: result.intent, 
        entity: result.entity, 
        confidence: result.confidence 
      }, 'ChatFirstNavigation');
      
      // Execute the suggested action
      if (result.suggestedAction && result.confidence > 0.5) {
        if (result.suggestedAction.handler) {
          await result.suggestedAction.handler();
        } else if (result.suggestedAction.path) {
          await router.push(result.suggestedAction.path);
          onNavigate?.(result.suggestedAction.path, result.parameters);
        }
        
        // Update recent commands
        setRecentCommands(prev => [commandText, ...prev.slice(0, 9)]);
        
        onCommandExecuted?.(commandText, result);
      } else {
        // Handle low confidence or no action found
        const errorMessage = result.confidence < 0.5 
          ? `I'm not sure what you mean by "${commandText}". Could you try rephrasing?`
          : `I couldn't find an action for "${commandText}".`;
        
        onError?.(errorMessage);
        logWarning('Command not understood', { command: commandText, confidence: result.confidence }, 'ChatFirstNavigation');
      }
      
    } catch (error) {
      logWarning('Command processing failed', error, 'ChatFirstNavigation');
      onError?.('Sorry, there was an error processing your command.');
    } finally {
      setIsProcessing(false);
      setCommand('');
      setShowSuggestions(false);
      setSelectedSuggestionIndex(-1);
    }
  }, [nlu, router, onNavigate, onCommandExecuted, onError]);
  
  const updateSuggestions = useCallback((input: string) => {
    if (!showSuggestions || !input.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    
    const newSuggestions = nlu.generateSuggestions(input);
    setSuggestions(newSuggestions.slice(0, maxSuggestions));
    setShowSuggestions(newSuggestions.length > 0);
    setSelectedSuggestionIndex(-1);
  }, [nlu, maxSuggestions, showSuggestions]);
  
  // ===========================
  // EVENT HANDLERS
  // ===========================
  
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCommand(value);
    updateSuggestions(value);
  }, [updateSuggestions]);
  
  const handleInputKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    switch (e.key) {
      case 'Enter':
        e.preventDefault();
        if (selectedSuggestionIndex >= 0 && suggestions[selectedSuggestionIndex]) {
          setCommand(suggestions[selectedSuggestionIndex].text);
          processCommand(suggestions[selectedSuggestionIndex].text).catch((error) => {
            console.error('Command processing failed:', error);
          });
        } else {
          processCommand(command).catch((error) => {
            console.error('Command processing failed:', error);
          });
        }
        break;
        
      case 'ArrowDown':
        e.preventDefault();
        if (suggestions.length > 0) {
          setSelectedSuggestionIndex(prev => 
            prev < suggestions.length - 1 ? prev + 1 : 0
          );
        }
        break;
        
      case 'ArrowUp':
        e.preventDefault();
        if (suggestions.length > 0) {
          setSelectedSuggestionIndex(prev => 
            prev > 0 ? prev - 1 : suggestions.length - 1
          );
        }
        break;
        
      case 'Escape':
        e.preventDefault();
        setShowSuggestions(false);
        setSelectedSuggestionIndex(-1);
        if (inputRef.current) {
          inputRef.current.blur();
        }
        break;
        
      case 'Tab':
        if (selectedSuggestionIndex >= 0 && suggestions[selectedSuggestionIndex]) {
          e.preventDefault();
          setCommand(suggestions[selectedSuggestionIndex].text);
          setShowSuggestions(false);
        }
        break;
    }
  }, [command, suggestions, selectedSuggestionIndex, processCommand]);
  
  const handleSuggestionClick = useCallback((suggestion: CommandSuggestion) => {
    setCommand(suggestion.text);
    processCommand(suggestion.text).catch((error) => {
      console.error('Command processing failed:', error);
    });
  }, [processCommand]);
  
  // ===========================
  // VOICE RECOGNITION
  // ===========================
  
  const startVoiceRecognition = useCallback(() => {
    if (!enableVoice || !('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      onError?.('Voice recognition is not supported in this browser.');
      return;
    }
    
    const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    
    recognition.onstart = () => {
      setVoiceState(prev => ({ ...prev, isListening: true }));
      logDebug('Voice recognition started', null, 'ChatFirstNavigation');
    };
    
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const results = Array.from(event.results);
      const transcript = results
        .map((result: SpeechRecognitionResult) => result[0].transcript)
        .join('');
      
      setVoiceState(prev => ({
        ...prev,
        transcript,
        confidence: results[results.length - 1][0].confidence
      }));
      
      if (event.results[event.results.length - 1].isFinal) {
        setCommand(transcript);
        processCommand(transcript).catch((error) => {
          console.error('Command processing failed:', error);
        });
      }
    };
    
    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      logWarning('Voice recognition error', event.error, 'ChatFirstNavigation');
      setVoiceState(prev => ({
        ...prev,
        isListening: false,
        error: event.error
      }));
      onError?.(`Voice recognition error: ${event.error}`);
    };
    
    recognition.onend = () => {
      setVoiceState(prev => ({
        ...prev,
        isListening: false,
        isProcessing: false
      }));
      recognitionRef.current = null;
    };
    
    recognition.start();
    recognitionRef.current = recognition;
  }, [enableVoice, onError, processCommand]);
  
  const stopVoiceRecognition = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  }, []);
  
  // ===========================
  // KEYBOARD SHORTCUTS
  // ===========================
  
  useEffect(() => {
    if (!enableKeyboard) { return; }
    
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Global command palette trigger
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
      
      // Individual action shortcuts
      for (const action of allActions) {
        if (action.shortcut && isKeyboardShortcut(e, action.shortcut)) {
          e.preventDefault();
          if (action.handler) {
            action.handler().catch((error) => {
              console.error('Action handler failed:', error);
            });
          } else if (action.path) {
            router.push(action.path).catch((error) => {
              console.error('Navigation failed:', error);
            });
            onNavigate?.(action.path);
          }
        }
      }
    };
    
    document.addEventListener('keydown', handleGlobalKeyDown);
    return (): void => { document.removeEventListener('keydown', handleGlobalKeyDown); };
  }, [enableKeyboard, allActions, router, onNavigate]);
  
  const isKeyboardShortcut = (e: KeyboardEvent, shortcut: string): boolean => {
    const parts = shortcut.toLowerCase().split('+');
    const key = parts[parts.length - 1];
    const modifiers = parts.slice(0, -1);
    
    const hasCtrl = modifiers.includes('ctrl') && e.ctrlKey;
    const hasAlt = modifiers.includes('alt') && e.altKey;
    const hasShift = modifiers.includes('shift') && e.shiftKey;
    const hasMeta = modifiers.includes('cmd') && e.metaKey;
    
    const keyMatches = e.key.toLowerCase() === key || 
                      (key === 'space' && e.code === 'Space') ||
                      (key.startsWith('f') && e.key === key.toUpperCase());
    
    return keyMatches && 
           (modifiers.length === 0 || hasCtrl || hasAlt || hasShift || hasMeta);
  };
  
  // ===========================
  // EFFECTS
  // ===========================
  
  // Auto-focus input on mount
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);
  
  // Update voice transcript in input
  useEffect(() => {
    if (voiceState.transcript && voiceState.isListening) {
      setCommand(voiceState.transcript);
    }
  }, [voiceState.transcript, voiceState.isListening]);
  
  // ===========================
  // RENDER
  // ===========================
  
  return (
    <div
      className={cn(
        'chat-first-navigation',
        'relative z-50',
        position === 'floating' && 'fixed top-4 left-1/2 transform -translate-x-1/2',
        position === 'top' && 'sticky top-0',
        position === 'bottom' && 'sticky bottom-0',
        className
      )}
      role="navigation"
      aria-label="Chat-first navigation"
    >
      <div className={cn(
        'flex items-center gap-2 p-3',
        'bg-white border border-gray-200 rounded-lg shadow-lg',
        'transition-all duration-200',
        compact ? 'max-w-md' : 'max-w-2xl',
        'focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500'
      )}>
        {/* Navigation Icon */}
        <HugeiconsIcon 
          icon={NavigationIcon} 
          className="w-5 h-5 text-gray-400 flex-shrink-0" 
          aria-hidden="true"
        />
        
        {/* Command Input */}
        <div className="flex-1 relative">
          <Input
            ref={inputRef}
            value={command}
            onChange={handleInputChange}
            onKeyDown={handleInputKeyDown}
            placeholder={
              voiceState.isListening
                ? 'Listening...'
                : 'Type a command or say "go to dashboard"...'
            }
            disabled={isProcessing || voiceState.isListening}
            className={cn(
              'border-0 shadow-none focus-visible:ring-0 pl-0',
              'placeholder:text-gray-400',
              voiceState.isListening && 'bg-blue-50'
            )}
            aria-label="Navigation command input"
            aria-describedby="command-help"
            aria-expanded={showSuggestions}
            aria-autocomplete="list"
            role="combobox"
          />
          
          {/* Voice indicator */}
          {voiceState.isListening && (
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="w-1 h-4 bg-blue-500 rounded-full"
                    animate={{ scaleY: [1, 2, 1] }}
                    transition={{
                      duration: 0.5,
                      repeat: Infinity,
                      delay: i * 0.1,
                    }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
        
        {/* Voice Button */}
        {enableVoice && (
          <Button
            variant="ghost"
            size="icon"
            onClick={voiceState.isListening ? stopVoiceRecognition : startVoiceRecognition}
            disabled={isProcessing}
            className={cn(
              'flex-shrink-0',
              voiceState.isListening ? 'bg-red-100 text-red-600' : 'text-gray-500'
            )}
            aria-label={voiceState.isListening ? 'Stop voice input' : 'Start voice input'}
            aria-pressed={voiceState.isListening}
          >
            <HugeiconsIcon icon={MicrophoneIcon} className="w-4 h-4" />
          </Button>
        )}
        
        {/* Keyboard Shortcuts Hint */}
        {enableKeyboard && !compact && (
          <Badge variant="secondary" className="text-xs">
            <HugeiconsIcon icon={KeyboardIcon} className="w-3 h-3 mr-1" />
            Ctrl+K
          </Badge>
        )}
        
        {/* Processing Indicator */}
        {isProcessing && (
          <div className="flex-shrink-0">
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>
      
      {/* Command Suggestions */}
      <AnimatePresence>
        {showSuggestions && suggestions.length > 0 && (
          <motion.div
            ref={suggestionsRef}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className={cn(
              'absolute top-full left-0 right-0 mt-2',
              'bg-white border border-gray-200 rounded-lg shadow-xl',
              'max-h-80 overflow-y-auto',
              'z-50'
            )}
            role="listbox"
            aria-label="Command suggestions"
          >
            {suggestions.map((suggestion, index) => (
              <button
                key={`${suggestion.text}-${index}`}
                onClick={() => { handleSuggestionClick(suggestion); }}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3 text-left',
                  'hover:bg-gray-50 transition-colors',
                  'border-b border-gray-100 last:border-b-0',
                  selectedSuggestionIndex === index && 'bg-blue-50 border-blue-200'
                )}
                role="option"
                aria-selected={selectedSuggestionIndex === index}
              >
                {suggestion.action?.icon && (
                  <HugeiconsIcon
                    icon={suggestion.action.icon}
                    className="w-4 h-4 text-gray-400 flex-shrink-0"
                  />
                )}
                
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">
                    {suggestion.text}
                  </div>
                  {suggestion.action?.description && (
                    <div className="text-xs text-gray-500 truncate">
                      {suggestion.action.description}
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-2 flex-shrink-0">
                  {suggestion.action?.shortcut && (
                    <Badge variant="outline" className="text-xs">
                      {suggestion.action.shortcut}
                    </Badge>
                  )}
                  
                  <div 
                    className="w-2 h-2 rounded-full bg-gray-300" 
                    style={{
                      backgroundColor: (() => {
                        if (suggestion.confidence > 0.7) {return '#10b981';}
                        if (suggestion.confidence > 0.4) {return '#f59e0b';}
                        return '#ef4444';
                      })()
                    }} 
                  />
                </div>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Screen reader help text */}
      <div id="command-help" className="sr-only">
        Use natural language to navigate and control the application. 
        For example, say &quot;go to dashboard&quot; or &quot;show my tasks&quot;. 
        Press Tab to browse suggestions, Enter to execute, Escape to cancel.
      </div>
    </div>
  );
};

export default ChatFirstNavigation;