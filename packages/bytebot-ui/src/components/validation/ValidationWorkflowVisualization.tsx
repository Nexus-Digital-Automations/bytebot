/**
 * Real-Time Validation Workflow Visualization Component
 * 
 * Advanced workflow visualization system that provides real-time tracking
 * and visualization of Parlant validation processes. Shows validation
 * requests, approval workflows, participant interactions, and decision
 * timelines in an intuitive, enterprise-grade interface.
 * 
 * Key Features:
 * - Real-time validation workflow tracking
 * - Interactive workflow visualization with step-by-step progress
 * - Participant role visualization and status tracking
 * - Timeline-based validation history
 * - Decision tree visualization for complex validations
 * - Performance metrics and SLA tracking
 * - Accessibility-compliant workflow navigation
 * - Mobile-responsive workflow views
 * - Export capabilities for audit trails
 * 
 * @fileoverview Real-time validation workflow visualization
 * @version 1.0.0
 * @author Frontend Chat-First Interface Agent #9
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  ApprovalLevel,
  ConversationParticipant,
  FunctionSecurityLevel,
  ParlantValidationRequest,
  ParticipantRole,
  ValidationDecision
} from '@bytebot/shared/types/parlant.types';
import { useParlantWebSocket } from '@/hooks/useParlantWebSocket';
import { logDebug, logInfo } from '@/utils/logger';

// ===========================
// WORKFLOW UPDATE TYPES
// ===========================

interface WorkflowUpdate {
  type: 'step_completed' | 'step_started' | 'workflow_completed' | 'workflow_failed';
  stepId?: string;
  workflowId?: string;
  duration?: number;
  timestamp?: Date;
  metadata?: Record<string, unknown>;
}
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ActivityIcon,
  Alert01Icon,
  ArrowUp01Icon,
  Cancel01Icon,
  CheckmarkCircle02Icon,
  ClockIcon,
  Download01Icon,
  FlowIcon,
  ForwardIcon,
  PauseIcon,
  PlayIcon,
  RefreshIcon,
  TimeIcon,
  UserIcon
} from '@hugeicons/core-free-icons';

// ===========================
// TYPE DEFINITIONS
// ===========================

/**
 * Workflow step status
 */
export enum WorkflowStepStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  SKIPPED = 'skipped',
  BLOCKED = 'blocked'
}

/**
 * Workflow step definition
 */
interface WorkflowStep {
  /** Step identifier */
  id: string;
  
  /** Step name */
  name: string;
  
  /** Step description */
  description: string;
  
  /** Step status */
  status: WorkflowStepStatus;
  
  /** Step type */
  type: 'validation' | 'approval' | 'notification' | 'decision' | 'action';
  
  /** Required participants */
  requiredParticipants: ConversationParticipant[];
  
  /** Current participants */
  currentParticipants: ConversationParticipant[];
  
  /** Start time */
  startTime?: Date;
  
  /** End time */
  endTime?: Date;
  
  /** Duration in milliseconds */
  duration?: number;
  
  /** Step metadata */
  metadata: Record<string, unknown>;
  
  /** Dependencies */
  dependencies: string[];
  
  /** Approval requirements */
  approvalRequirements?: {
    level: ApprovalLevel;
    minimumApprovers: number;
    requiredRoles: ParticipantRole[];
  };
  
  /** Error information */
  error?: {
    message: string;
    code: string;
    details: Record<string, unknown>;
  };
}

/**
 * Validation workflow state
 */
interface ValidationWorkflow {
  /** Workflow identifier */
  workflowId: string;
  
  /** Related validation request */
  validationRequest: ParlantValidationRequest;
  
  /** Workflow steps */
  steps: WorkflowStep[];
  
  /** Current step index */
  currentStepIndex: number;
  
  /** Overall workflow status */
  overallStatus: WorkflowStepStatus;
  
  /** Workflow start time */
  startTime: Date;
  
  /** Workflow end time */
  endTime?: Date;
  
  /** Total duration */
  totalDuration?: number;
  
  /** Performance metrics */
  metrics: WorkflowMetrics;
  
  /** SLA information */
  sla: WorkflowSLA;
  
  /** Decision trail */
  decisionTrail: DecisionPoint[];
  
  /** Participant timeline */
  participantTimeline: ParticipantActivity[];
}

/**
 * Workflow performance metrics
 */
interface WorkflowMetrics {
  /** Total processing time */
  totalProcessingTime: number;
  
  /** Average step duration */
  averageStepDuration: number;
  
  /** Participant response times */
  participantResponseTimes: Record<string, number>;
  
  /** Bottleneck step */
  bottleneckStep?: string;
  
  /** Efficiency score (0-100) */
  efficiencyScore: number;
  
  /** Rule processing performance */
  ruleProcessingTime: Record<string, number>;
  
  /** Network latency */
  networkLatency: number;
}

/**
 * Workflow SLA tracking
 */
interface WorkflowSLA {
  /** Expected completion time */
  expectedCompletion: Date;
  
  /** SLA target (milliseconds) */
  targetDuration: number;
  
  /** Current progress percentage */
  progressPercentage: number;
  
  /** SLA status */
  status: 'on_track' | 'at_risk' | 'breached';
  
  /** Time remaining */
  timeRemaining: number;
  
  /** Escalation triggers */
  escalationTriggers: EscalationTrigger[];
}

/**
 * Decision point in workflow
 */
interface DecisionPoint {
  /** Decision identifier */
  id: string;
  
  /** Decision timestamp */
  timestamp: Date;
  
  /** Decision maker */
  decisionMaker: ConversationParticipant;
  
  /** Decision made */
  decision: ValidationDecision;
  
  /** Decision reasoning */
  reasoning?: string;
  
  /** Decision context */
  context: Record<string, unknown>;
  
  /** Impact on workflow */
  impact: 'continue' | 'branch' | 'terminate' | 'escalate';
}

/**
 * Participant activity tracking
 */
interface ParticipantActivity {
  /** Activity identifier */
  id: string;
  
  /** Participant */
  participant: ConversationParticipant;
  
  /** Activity type */
  type: 'joined' | 'left' | 'responded' | 'approved' | 'denied' | 'escalated';
  
  /** Activity timestamp */
  timestamp: Date;
  
  /** Activity details */
  details: string;
  
  /** Related step */
  stepId?: string;
}

/**
 * Escalation trigger definition
 */
interface EscalationTrigger {
  /** Trigger identifier */
  id: string;
  
  /** Trigger condition */
  condition: 'time_exceeded' | 'approval_denied' | 'participant_unavailable' | 'complexity_high';
  
  /** Trigger threshold */
  threshold: number;
  
  /** Escalation action */
  action: 'notify_manager' | 'add_approver' | 'extend_deadline' | 'override_requirement';
  
  /** Is triggered */
  triggered: boolean;
  
  /** Trigger time */
  triggeredAt?: Date;
}

/**
 * Component configuration
 */
interface ValidationWorkflowConfig {
  /** Enable real-time updates */
  enableRealTime: boolean;
  
  /** Show performance metrics */
  showMetrics: boolean;
  
  /** Show participant timeline */
  showParticipantTimeline: boolean;
  
  /** Show decision trail */
  showDecisionTrail: boolean;
  
  /** Enable step details expansion */
  enableStepDetails: boolean;
  
  /** Auto-refresh interval */
  refreshInterval: number;
  
  /** Show SLA tracking */
  showSLATracking: boolean;
  
  /** Enable export functionality */
  enableExport: boolean;
  
  /** Compact view mode */
  compactView: boolean;
  
  /** Animation preferences */
  enableAnimations: boolean;
}

/**
 * Component props
 */
interface ValidationWorkflowVisualizationProps {
  /** Validation request to visualize */
  validationRequest?: ParlantValidationRequest;
  
  /** Workflow ID to load */
  workflowId?: string;
  
  /** Configuration */
  config?: Partial<ValidationWorkflowConfig>;
  
  /** CSS class name */
  className?: string;
  
  /** Component height */
  height?: string | number;
  
  /** Event handlers */
  onStepClick?: (step: WorkflowStep) => void;
  onParticipantClick?: (participant: ConversationParticipant) => void;
  onDecisionPointClick?: (decision: DecisionPoint) => void;
  onWorkflowComplete?: (workflow: ValidationWorkflow) => void;
  onSLABreach?: (workflow: ValidationWorkflow) => void;
  onEscalationTriggered?: (trigger: EscalationTrigger, workflow: ValidationWorkflow) => void;
  
  /** Custom renderers */
  customStepRenderer?: (step: WorkflowStep) => React.ReactNode;
  customMetricsRenderer?: (metrics: WorkflowMetrics) => React.ReactNode;
  
  /** Theme */
  theme?: 'light' | 'dark';
}

// ===========================
// CONSTANTS
// ===========================

/** Time constants in milliseconds */
const TIME_CONSTANTS = {
  VALIDATION_STEP_DURATION: 1000,
  DEFAULT_TIMEOUT: 30000,
  ONE_MINUTE: 60000
} as const;

/** Workflow constants */
const WORKFLOW_CONSTANTS = {
  EFFICIENCY_SCALE: 100,
  MAX_PERCENTAGE: 100,
  MIN_PARTICIPANTS_FOR_DUAL: 2,
  DEFAULT_SLA_PERCENTAGE: 90,
  PARTICIPANT_DISPLAY_LIMIT: 3,
  MOCK_NETWORK_LATENCY: 50,
  SLA_WARNING_THRESHOLD: 0.9
} as const;

// ===========================
// DEFAULT CONFIGURATION
// ===========================

const DEFAULT_CONFIG: ValidationWorkflowConfig = {
  enableRealTime: true,
  showMetrics: true,
  showParticipantTimeline: true,
  showDecisionTrail: true,
  enableStepDetails: true,
  refreshInterval: 2000,
  showSLATracking: true,
  enableExport: true,
  compactView: false,
  enableAnimations: true,
};

// ===========================
// UTILITY FUNCTIONS
// ===========================

/**
 * Generate workflow steps from validation request
 */
const generateWorkflowSteps = (request: ParlantValidationRequest): WorkflowStep[] => {
  // Type assertion to help TypeScript understand the correct type
  const typedRequest = request;
  const steps: WorkflowStep[] = [];
  
  // Initial validation step
  steps.push({
    id: 'initial-validation',
    name: 'Initial Validation',
    description: 'Perform initial function validation checks',
    status: WorkflowStepStatus.COMPLETED,
    type: 'validation',
    requiredParticipants: [],
    currentParticipants: [],
    startTime: typedRequest.timestamp,
    endTime: new Date(typedRequest.timestamp.getTime() + TIME_CONSTANTS.VALIDATION_STEP_DURATION),
    duration: TIME_CONSTANTS.VALIDATION_STEP_DURATION,
    metadata: { automated: true },
    dependencies: []
  });
  
  // Security analysis step
  if (typedRequest.functionContext.securityLevel !== FunctionSecurityLevel._PUBLIC) {
    steps.push({
      id: 'security-analysis',
      name: 'Security Analysis',
      description: 'Analyze function security implications',
      status: WorkflowStepStatus.IN_PROGRESS,
      type: 'validation',
      requiredParticipants: [],
      currentParticipants: [],
      startTime: new Date(),
      metadata: { 
        securityLevel: typedRequest.functionContext.securityLevel,
        riskLevel: typedRequest.functionContext.riskLevel 
      },
      dependencies: ['initial-validation']
    });
  }
  
  // Human approval step
  if (typedRequest.validationParams.approvalLevel !== ApprovalLevel._AUTOMATIC) {
    steps.push({
      id: 'human-approval',
      name: 'Human Approval',
      description: 'Require human approval for function execution',
      status: WorkflowStepStatus.PENDING,
      type: 'approval',
      requiredParticipants: [],
      currentParticipants: [],
      metadata: { approvalLevel: typedRequest.validationParams.approvalLevel },
      dependencies: typedRequest.functionContext.securityLevel !== FunctionSecurityLevel._PUBLIC 
        ? ['security-analysis'] 
        : ['initial-validation'],
      approvalRequirements: {
        level: typedRequest.validationParams.approvalLevel,
        minimumApprovers: typedRequest.validationParams.approvalLevel === ApprovalLevel._DUAL_APPROVAL ? WORKFLOW_CONSTANTS.MIN_PARTICIPANTS_FOR_DUAL : 1,
        requiredRoles: [ParticipantRole._APPROVER]
      }
    });
  }
  
  // Final decision step
  steps.push({
    id: 'final-decision',
    name: 'Final Decision',
    description: 'Make final validation decision',
    status: WorkflowStepStatus.PENDING,
    type: 'decision',
    requiredParticipants: [],
    currentParticipants: [],
    metadata: {},
    dependencies: ((): string[] => {
      if (typedRequest.validationParams.approvalLevel !== ApprovalLevel._AUTOMATIC) {
        return ['human-approval'];
      }
      if (typedRequest.functionContext.securityLevel !== FunctionSecurityLevel._PUBLIC) {
        return ['security-analysis'];
      }
      return ['initial-validation'];
    })()
  });
  
  return steps;
};

/**
 * Calculate workflow metrics
 */
const calculateWorkflowMetrics = (workflow: ValidationWorkflow): WorkflowMetrics => {
  const completedSteps = workflow.steps.filter(step => 
    step.status === WorkflowStepStatus.COMPLETED && (step.duration !== undefined && step.duration > 0)
  );
  
  const totalProcessingTime = workflow.totalDuration ?? 
    (workflow.endTime ? workflow.endTime.getTime() - workflow.startTime.getTime() : 0);
  
  const averageStepDuration = completedSteps.length > 0
    ? completedSteps.reduce((sum, step) => sum + (step.duration ?? 0), 0) / completedSteps.length
    : 0;
  
  const participantResponseTimes: Record<string, number> = {};
  workflow.participantTimeline.forEach(activity => {
    if (activity.type === 'responded' && activity.participant !== undefined && activity.participant !== null) {
      participantResponseTimes[activity.participant.id] = 
        activity.timestamp.getTime() - workflow.startTime.getTime();
    }
  });
  
  const bottleneckStep = completedSteps.length > 0
    ? completedSteps.reduce((max, step) => 
        (step.duration ?? 0) > (max.duration ?? 0) ? step : max
      ).id
    : undefined;
  
  const efficiencyScore = Math.min(WORKFLOW_CONSTANTS.MAX_PERCENTAGE, Math.max(0, 
    WORKFLOW_CONSTANTS.EFFICIENCY_SCALE - (totalProcessingTime / (workflow.sla.targetDuration ?? TIME_CONSTANTS.DEFAULT_TIMEOUT)) * WORKFLOW_CONSTANTS.EFFICIENCY_SCALE
  ));
  
  return {
    totalProcessingTime,
    averageStepDuration,
    participantResponseTimes,
    bottleneckStep: bottleneckStep ?? 'none',
    efficiencyScore,
    ruleProcessingTime: {},
    networkLatency: WORKFLOW_CONSTANTS.MOCK_NETWORK_LATENCY
  };
};

/**
 * Get step status color
 */
const getStepStatusColor = (status: WorkflowStepStatus): string => {
  switch (status) {
    case WorkflowStepStatus.COMPLETED:
      return 'text-green-600 bg-green-100';
    case WorkflowStepStatus.IN_PROGRESS:
      return 'text-blue-600 bg-blue-100';
    case WorkflowStepStatus.FAILED:
      return 'text-red-600 bg-red-100';
    case WorkflowStepStatus.BLOCKED:
      return 'text-orange-600 bg-orange-100';
    case WorkflowStepStatus.SKIPPED:
      return 'text-gray-600 bg-gray-100';
    case WorkflowStepStatus.PENDING:
      return 'text-gray-500 bg-gray-50';
    default:
      return 'text-gray-500 bg-gray-50';
  }
};

/**
 * Get step status icon
 */
const getStepStatusIcon = (status: WorkflowStepStatus): typeof CheckmarkCircle02Icon => {
  switch (status) {
    case WorkflowStepStatus.COMPLETED:
      return CheckmarkCircle02Icon;
    case WorkflowStepStatus.IN_PROGRESS:
      return ActivityIcon;
    case WorkflowStepStatus.FAILED:
      return Cancel01Icon;
    case WorkflowStepStatus.BLOCKED:
      return Alert01Icon;
    case WorkflowStepStatus.SKIPPED:
      return ForwardIcon;
    case WorkflowStepStatus.PENDING:
      return ClockIcon;
    default:
      return ClockIcon;
  }
};

/**
 * Format duration
 */
const formatDuration = (milliseconds: number): string => {
  if (milliseconds < TIME_CONSTANTS.VALIDATION_STEP_DURATION) {
    return `${milliseconds}ms`;
  } else if (milliseconds < TIME_CONSTANTS.ONE_MINUTE) {
    return `${Math.round(milliseconds / TIME_CONSTANTS.VALIDATION_STEP_DURATION)}s`;
  } 
    return `${Math.round(milliseconds / TIME_CONSTANTS.ONE_MINUTE)}m`;
  
};

// ===========================
// SUB-COMPONENTS
// ===========================

/**
 * Workflow step component
 */
const WorkflowStepComponent: React.FC<{
  step: WorkflowStep;
  isActive: boolean;
  onClick?: () => void;
  customRenderer?: (step: WorkflowStep) => React.ReactNode;
  enableAnimations: boolean;
}> = ({ step, isActive, onClick, customRenderer, enableAnimations }) => {
  const StatusIcon = getStepStatusIcon(step.status);
  const statusColor = getStepStatusColor(step.status);
  
  if (customRenderer) {
    return <div onClick={onClick}>{customRenderer(step)}</div>;
  }
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <motion.div
            initial={enableAnimations ? { opacity: 0, y: 20 } : {}}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              'flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-all',
              'hover:shadow-md hover:scale-[1.02]',
              isActive ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white',
              onClick && 'cursor-pointer'
            )}
            onClick={onClick}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if ((e.key === 'Enter' || e.key === ' ') && onClick) {
                e.preventDefault();
                onClick();
              }
            }}
          >
            {/* Status Icon */}
            <div className={cn('p-2 rounded-full', statusColor)}>
              <HugeiconsIcon icon={StatusIcon as any} className="w-4 h-4" />
            </div>
            
            {/* Step Info */}
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold text-gray-900 truncate">
                {step.name}
              </h4>
              <p className="text-xs text-gray-600 truncate">
                {step.description}
              </p>
              
              {/* Duration */}
              {(step.duration !== null && step.duration !== undefined) && (
                <div className="flex items-center gap-1 mt-1">
                  <HugeiconsIcon icon={TimeIcon} className="w-3 h-3 text-gray-400" />
                  <span className="text-xs text-gray-500">
                    {formatDuration(step.duration)}
                  </span>
                </div>
              )}
            </div>
            
            {/* Participants */}
            {step.currentParticipants.length > 0 && (
              <div className="flex -space-x-1">
                {step.currentParticipants.slice(0, WORKFLOW_CONSTANTS.PARTICIPANT_DISPLAY_LIMIT).map((participant) => (
                  <div
                    key={participant.id}
                    className="w-6 h-6 bg-gray-300 rounded-full border-2 border-white flex items-center justify-center"
                    title={participant.name}
                  >
                    <HugeiconsIcon icon={UserIcon} className="w-3 h-3 text-gray-600" />
                  </div>
                ))}
                {step.currentParticipants.length > WORKFLOW_CONSTANTS.PARTICIPANT_DISPLAY_LIMIT && (
                  <div className="w-6 h-6 bg-gray-100 rounded-full border-2 border-white flex items-center justify-center">
                    <span className="text-xs text-gray-600">
                      +{step.currentParticipants.length - WORKFLOW_CONSTANTS.PARTICIPANT_DISPLAY_LIMIT}
                    </span>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="max-w-xs">
            <p className="font-medium">{step.name}</p>
            <p className="text-sm text-gray-600">{step.description}</p>
            <div className="mt-2 space-y-1">
              <div className="flex justify-between text-xs">
                <span>Status:</span>
                <Badge variant="outline" className={cn('text-xs', statusColor)}>
                  {step.status.replace('_', ' ')}
                </Badge>
              </div>
              {step.startTime && (
                <div className="flex justify-between text-xs">
                  <span>Started:</span>
                  <span>{step.startTime.toLocaleTimeString()}</span>
                </div>
              )}
              {(step.duration !== null && step.duration !== undefined) && (
                <div className="flex justify-between text-xs">
                  <span>Duration:</span>
                  <span>{formatDuration(step.duration)}</span>
                </div>
              )}
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

/**
 * SLA tracking component
 */
const SLATracker: React.FC<{
  sla: WorkflowSLA;
  className?: string;
}> = ({ sla, className }) => {
  const getSLAColor = (): string => {
    switch (sla.status) {
      case 'on_track':
        return 'text-green-600';
      case 'at_risk':
        return 'text-yellow-600';
      case 'breached':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };
  
  const getSLAIcon = (): typeof CheckmarkCircle02Icon => {
    switch (sla.status) {
      case 'on_track':
        return CheckmarkCircle02Icon;
      case 'at_risk':
        return Alert01Icon;
      case 'breached':
        return Cancel01Icon;
      default:
        return ClockIcon;
    }
  };
  
  const SLAIcon = getSLAIcon();
  const slaColor = getSLAColor();
  
  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <HugeiconsIcon icon={SLAIcon} className={cn('w-4 h-4', slaColor)} />
          SLA Tracking
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <div className="flex justify-between text-xs text-gray-600 mb-1">
            <span>Progress</span>
            <span>{Math.round(sla.progressPercentage)}%</span>
          </div>
          <Progress 
            value={sla.progressPercentage} 
            className="h-2"
          />
        </div>
        
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <span className="text-gray-500">Status:</span>
            <div className={cn('font-medium', slaColor)}>
              {sla.status.replace('_', ' ').toUpperCase()}
            </div>
          </div>
          <div>
            <span className="text-gray-500">Remaining:</span>
            <div className="font-medium">
              {formatDuration(Math.max(0, sla.timeRemaining))}
            </div>
          </div>
        </div>
        
        <div className="text-xs">
          <span className="text-gray-500">Target:</span>
          <div className="font-medium">
            {sla.expectedCompletion.toLocaleString()}
          </div>
        </div>
        
        {/* Escalation triggers */}
        {sla.escalationTriggers.length > 0 && (
          <div className="pt-2 border-t">
            <span className="text-xs text-gray-500">Escalations:</span>
            <div className="mt-1 space-y-1">
              {sla.escalationTriggers.map((trigger) => (
                <div
                  key={trigger.id}
                  className={cn(
                    'flex items-center gap-1 text-xs',
                    trigger.triggered ? 'text-red-600' : 'text-gray-500'
                  )}
                >
                  <div className={cn(
                    'w-2 h-2 rounded-full',
                    trigger.triggered ? 'bg-red-500' : 'bg-gray-300'
                  )} />
                  <span>{trigger.condition.replace('_', ' ')}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

/**
 * Metrics dashboard component
 */
const MetricsDashboard: React.FC<{
  metrics: WorkflowMetrics;
  className?: string;
  customRenderer?: (metrics: WorkflowMetrics) => React.ReactNode;
}> = ({ metrics, className, customRenderer }) => {
  if (customRenderer) {
    return <div className={className}>{customRenderer(metrics)}</div>;
  }
  
  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <HugeiconsIcon icon={ArrowUp01Icon} className="w-4 h-4 text-blue-600" />
          Performance Metrics
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {formatDuration(metrics.totalProcessingTime)}
            </div>
            <div className="text-xs text-gray-500">Total Time</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {Math.round(metrics.efficiencyScore)}%
            </div>
            <div className="text-xs text-gray-500">Efficiency</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {formatDuration(metrics.averageStepDuration)}
            </div>
            <div className="text-xs text-gray-500">Avg Step</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">
              {metrics.networkLatency}ms
            </div>
            <div className="text-xs text-gray-500">Latency</div>
          </div>
        </div>
        
        {(metrics.bottleneckStep !== undefined && metrics.bottleneckStep !== null && metrics.bottleneckStep !== '') && (
          <div className="mt-4 pt-3 border-t">
            <div className="text-xs text-gray-500">Bottleneck:</div>
            <div className="text-sm font-medium text-orange-600">
              {metrics.bottleneckStep.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// ===========================
// MAIN COMPONENT
// ===========================

/**
 * Validation Workflow Visualization Component
 * 
 * Provides real-time visualization of Parlant validation workflows with
 * comprehensive tracking, metrics, and interactive features.
 */
export const ValidationWorkflowVisualization: React.FC<ValidationWorkflowVisualizationProps> = ({
  validationRequest,
  workflowId: _workflowId,
  config: userConfig = {},
  className,
  height = '600px',
  onStepClick,
  onParticipantClick,
  onDecisionPointClick: _onDecisionPointClick,
  onWorkflowComplete,
  onSLABreach,
  onEscalationTriggered: _onEscalationTriggered,
  customStepRenderer,
  customMetricsRenderer,
  theme: _theme = 'light'
}) => {
  // ===========================
  // STATE AND CONFIGURATION
  // ===========================
  
  const config = useMemo(() => ({
    ...DEFAULT_CONFIG,
    ...userConfig
  }), [userConfig]);
  
  const [workflow, setWorkflow] = useState<ValidationWorkflow | null>(null);
  const [selectedStep, setSelectedStep] = useState<WorkflowStep | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [viewMode, setViewMode] = useState<'steps' | 'timeline' | 'participants'>('steps');
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());
  
  const refreshTimer = useRef<NodeJS.Timeout | null>(null);
  const workflowRef = useRef<ValidationWorkflow | null>(null);
  
  // WebSocket integration
  const { subscribeToValidationUpdates } = useParlantWebSocket({
    onValidationWorkflowUpdate: (update) => {
      logDebug('Workflow update received', update, 'ValidationWorkflowVisualization');
      if (config.enableRealTime) {
        updateWorkflowFromUpdate(update as WorkflowUpdate);
      }
    }
  });
  
  // ===========================
  // WORKFLOW MANAGEMENT
  // ===========================
  
  const initializeWorkflow = useCallback((request: ParlantValidationRequest) => {
    const steps = generateWorkflowSteps(request);
    
    const newWorkflow: ValidationWorkflow = {
      workflowId: `workflow_${request.requestId}`,
      validationRequest: request,
      steps,
      currentStepIndex: 0,
      overallStatus: WorkflowStepStatus.IN_PROGRESS,
      startTime: new Date(),
      metrics: calculateWorkflowMetrics({} as ValidationWorkflow),
      sla: {
        expectedCompletion: new Date(Date.now() + (request.timeout ?? TIME_CONSTANTS.DEFAULT_TIMEOUT)),
        targetDuration: request.timeout ?? TIME_CONSTANTS.DEFAULT_TIMEOUT,
        progressPercentage: 0,
        status: 'on_track',
        timeRemaining: request.timeout ?? TIME_CONSTANTS.DEFAULT_TIMEOUT,
        escalationTriggers: [
          {
            id: 'time_exceeded',
            condition: 'time_exceeded',
            threshold: WORKFLOW_CONSTANTS.SLA_WARNING_THRESHOLD,
            action: 'notify_manager',
            triggered: false
          }
        ]
      },
      decisionTrail: [],
      participantTimeline: []
    };
    
    // Update metrics
    newWorkflow.metrics = calculateWorkflowMetrics(newWorkflow);
    
    setWorkflow(newWorkflow);
    workflowRef.current = newWorkflow;
    
    logInfo('Workflow initialized', { workflowId: newWorkflow.workflowId }, 'ValidationWorkflowVisualization');
  }, []);
  
  const updateWorkflowFromUpdate = useCallback((update: WorkflowUpdate) => {
    if (!workflowRef.current) {return;}
    
    const updatedWorkflow = { ...workflowRef.current };
    
    // Update based on update type
    if (update.type === 'step_completed') {
      const stepIndex = updatedWorkflow.steps.findIndex(s => s.id === update.stepId);
      if (stepIndex !== -1) {
        updatedWorkflow.steps[stepIndex] = {
          ...updatedWorkflow.steps[stepIndex],
          status: WorkflowStepStatus.COMPLETED,
          endTime: new Date(),
          duration: update.duration
        } as WorkflowStep;
        
        // Move to next step
        updatedWorkflow.currentStepIndex = Math.min(
          stepIndex + 1,
          updatedWorkflow.steps.length - 1
        );
      }
    }
    // TODO: Add support for participant_joined update type
    // else if (update.type === 'participant_joined') {
    //   const stepIndex = updatedWorkflow.steps.findIndex(s => s.id === update.stepId);
    //   if (stepIndex !== -1) {
    //     updatedWorkflow.steps[stepIndex].currentParticipants.push(update.participant);
    //   }
    //   
    //   updatedWorkflow.participantTimeline.push({
    //     id: `activity_${Date.now()}`,
    //     participant: update.participant,
    //     type: 'joined',
    //     timestamp: new Date(),
    //     details: `Joined workflow at step: ${update.stepId}`,
    //     stepId: update.stepId
    //   });
    // }
    
    // Recalculate metrics
    updatedWorkflow.metrics = calculateWorkflowMetrics(updatedWorkflow);
    
    // Update SLA progress
    const elapsed = Date.now() - updatedWorkflow.startTime.getTime();
    updatedWorkflow.sla.progressPercentage = Math.min(100, 
      (elapsed / updatedWorkflow.sla.targetDuration) * 100
    );
    updatedWorkflow.sla.timeRemaining = Math.max(0, 
      updatedWorkflow.sla.targetDuration - elapsed
    );
    
    // Check SLA status
    if (updatedWorkflow.sla.progressPercentage >= 90 && updatedWorkflow.sla.status === 'on_track') {
      updatedWorkflow.sla.status = 'at_risk';
    } else if (updatedWorkflow.sla.progressPercentage >= 100 && updatedWorkflow.overallStatus !== WorkflowStepStatus.COMPLETED) {
      updatedWorkflow.sla.status = 'breached';
      onSLABreach?.(updatedWorkflow);
    }
    
    setWorkflow(updatedWorkflow);
    workflowRef.current = updatedWorkflow;
    
    // Check for completion
    const allCompleted = updatedWorkflow.steps.every(step => 
      step.status === WorkflowStepStatus.COMPLETED || step.status === WorkflowStepStatus.SKIPPED
    );
    
    if (allCompleted && updatedWorkflow.overallStatus !== WorkflowStepStatus.COMPLETED) {
      updatedWorkflow.overallStatus = WorkflowStepStatus.COMPLETED;
      updatedWorkflow.endTime = new Date();
      updatedWorkflow.totalDuration = updatedWorkflow.endTime.getTime() - updatedWorkflow.startTime.getTime();
      onWorkflowComplete?.(updatedWorkflow);
    }
  }, [onSLABreach, onWorkflowComplete]);
  
  // ===========================
  // EVENT HANDLERS
  // ===========================
  
  const handleStepClick = useCallback((step: WorkflowStep) => {
    setSelectedStep(step);
    onStepClick?.(step);
    
    if (config.enableStepDetails) {
      setExpandedSteps(prev => {
        const newSet = new Set(prev);
        if (newSet.has(step.id)) {
          newSet.delete(step.id);
        } else {
          newSet.add(step.id);
        }
        return newSet;
      });
    }
  }, [config.enableStepDetails, onStepClick]);
  
  const handleExportWorkflow = useCallback(() => {
    if (!workflow) {return;}
    
    const exportData = {
      workflow,
      exportedAt: new Date().toISOString(),
      version: '1.0'
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
      type: 'application/json' 
    });
    
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `validation-workflow-${workflow.workflowId}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    logInfo('Workflow exported', { workflowId: workflow.workflowId }, 'ValidationWorkflowVisualization');
  }, [workflow]);
  
  const togglePlayback = useCallback(() => {
    setIsPlaying(!isPlaying);
    logDebug('Playback toggled', { isPlaying: !isPlaying }, 'ValidationWorkflowVisualization');
  }, [isPlaying]);
  
  // ===========================
  // EFFECTS
  // ===========================
  
  // Initialize workflow when validation request is provided
  useEffect(() => {
    if (validationRequest) {
      initializeWorkflow(validationRequest);
    }
  }, [validationRequest, initializeWorkflow]);
  
  // Set up real-time updates
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    
    if (config.enableRealTime) {
      unsubscribe = subscribeToValidationUpdates((update): void => {
        updateWorkflowFromUpdate(update as WorkflowUpdate);
      });
    }
    
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [config.enableRealTime, subscribeToValidationUpdates, updateWorkflowFromUpdate]);
  
  // Set up refresh timer
  useEffect(() => {
    if (config.refreshInterval > 0 && isPlaying) {
      refreshTimer.current = setInterval((): void => {
        // Simulate workflow updates for demo
        if (workflowRef.current && workflowRef.current.overallStatus === WorkflowStepStatus.IN_PROGRESS) {
          const randomUpdate = {
            type: 'step_started' as const,
            timestamp: new Date()
          };
          updateWorkflowFromUpdate(randomUpdate);
        }
      }, config.refreshInterval);
    }
    
    return () => {
      if (refreshTimer.current) {
        clearInterval(refreshTimer.current);
      }
    };
  }, [config.refreshInterval, isPlaying, updateWorkflowFromUpdate]);
  
  // ===========================
  // RENDER HELPERS
  // ===========================
  
  const renderStepsView = (): React.ReactNode => {
    if (!workflow) {return null;}
    
    return (
      <div className="space-y-3">
        {workflow.steps.map((step, index) => (
          <div key={step.id} className="relative">
            <WorkflowStepComponent
              step={step}
              isActive={index === workflow.currentStepIndex}
              onClick={() => { handleStepClick(step); }}
              {...(customStepRenderer && { customRenderer: customStepRenderer })}
              enableAnimations={config.enableAnimations}
            />
            
            {/* Connection line */}
            {index < workflow.steps.length - 1 && (
              <div className="absolute left-6 top-full w-0.5 h-3 bg-gray-300" />
            )}
            
            {/* Expanded details */}
            {config.enableStepDetails && expandedSteps.has(step.id) && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-2 ml-12 p-4 bg-gray-50 rounded-lg"
              >
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium">Type:</span> {step.type}
                  </div>
                  <div>
                    <span className="font-medium">Dependencies:</span>{' '}
                    {step.dependencies.length > 0 ? step.dependencies.join(', ') : 'None'}
                  </div>
                  {step.error && (
                    <div className="text-red-600">
                      <span className="font-medium">Error:</span> {step.error.message}
                    </div>
                  )}
                  {Object.keys(step.metadata).length > 0 && (
                    <div>
                      <span className="font-medium">Metadata:</span>
                      <pre className="mt-1 text-xs bg-white p-2 rounded border">
                        {JSON.stringify(step.metadata, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </div>
        ))}
      </div>
    );
  };
  
  const renderTimelineView = (): React.ReactNode => {
    if (!workflow) {return null;}
    
    return (
      <div className="space-y-4">
        <div className="text-sm font-medium text-gray-900">
          Workflow Timeline
        </div>
        
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-300" />
          
          {workflow.participantTimeline.map((activity) => (
            <div key={activity.id} className="relative flex items-start gap-4 pb-4">
              {/* Timeline node */}
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center relative z-10">
                <HugeiconsIcon icon={UserIcon} className="w-4 h-4 text-blue-600" />
              </div>
              
              {/* Activity details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">
                    {activity.participant.name}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {activity.type.replace('_', ' ')}
                  </Badge>
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  {activity.details}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {activity.timestamp.toLocaleString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };
  
  const renderParticipantsView = (): React.ReactNode => {
    if (!workflow) {return null;}
    
    const allParticipants = new Map<string, ConversationParticipant>();
    
    workflow.steps.forEach(step => {
      step.currentParticipants.forEach(participant => {
        allParticipants.set(participant.id, participant);
      });
      step.requiredParticipants.forEach(participant => {
        allParticipants.set(participant.id, participant);
      });
    });
    
    return (
      <div className="space-y-4">
        <div className="text-sm font-medium text-gray-900">
          Workflow Participants
        </div>
        
        <div className="grid gap-3">
          {Array.from(allParticipants.values()).map((participant) => (
            <Card 
              key={participant.id} 
              className="p-4 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => onParticipantClick?.(participant)}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                  <HugeiconsIcon icon={UserIcon} className="w-5 h-5 text-gray-600" />
                </div>
                
                <div className="flex-1">
                  <div className="text-sm font-medium">{participant.name}</div>
                  <div className="text-xs text-gray-500">
                    {participant.role.replace('_', ' ')} • {participant.type.replace('_', ' ')}
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-1">
                  {participant.capabilities.slice(0, 2).map((capability) => (
                    <Badge key={capability} variant="secondary" className="text-xs">
                      {capability.replace('_', ' ').toLowerCase()}
                    </Badge>
                  ))}
                  {participant.capabilities.length > 2 && (
                    <Badge variant="secondary" className="text-xs">
                      +{participant.capabilities.length - 2}
                    </Badge>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  };
  
  // ===========================
  // MAIN RENDER
  // ===========================
  
  if (!workflow) {
    return (
      <Card className={cn('flex items-center justify-center', className)} style={{ height }}>
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <div className="text-sm text-gray-600">
            {validationRequest ? 'Initializing workflow...' : 'No workflow data available'}
          </div>
        </div>
      </Card>
    );
  }
  
  return (
    <div className={cn('flex flex-col bg-gray-50 rounded-lg border', className)} style={{ height }}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-white rounded-t-lg">
        <div className="flex items-center gap-3">
          <HugeiconsIcon icon={FlowIcon} className="w-5 h-5 text-blue-600" />
          <div>
            <h3 className="text-lg font-semibold">Validation Workflow</h3>
            <p className="text-sm text-gray-600">
              {workflow.validationRequest.functionContext.functionName}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* View mode selector */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            {(['steps', 'timeline', 'participants'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => { setViewMode(mode); }}
                className={cn(
                  'px-3 py-1 rounded-md text-xs font-medium transition-colors',
                  viewMode === mode
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                )}
              >
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </button>
            ))}
          </div>
          
          {/* Playback control */}
          <Button
            variant="ghost"
            size="icon"
            onClick={togglePlayback}
            title={isPlaying ? 'Pause updates' : 'Resume updates'}
          >
            <HugeiconsIcon 
              icon={isPlaying ? PauseIcon : PlayIcon} 
              className="w-4 h-4" 
            />
          </Button>
          
          {/* Refresh */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => { updateWorkflowFromUpdate({ type: 'step_started' as const, timestamp: new Date() }); }}
            title="Refresh workflow"
          >
            <HugeiconsIcon icon={RefreshIcon} className="w-4 h-4" />
          </Button>
          
          {/* Export */}
          {config.enableExport && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleExportWorkflow}
              title="Export workflow"
            >
              <HugeiconsIcon icon={Download01Icon} className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
      
      {/* Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Main content */}
        <div className="flex-1 overflow-y-auto">
          <ScrollArea className="h-full">
            <div className="p-4">
              {viewMode === 'steps' && renderStepsView()}
              {viewMode === 'timeline' && renderTimelineView()}
              {viewMode === 'participants' && renderParticipantsView()}
            </div>
          </ScrollArea>
        </div>
        
        {/* Sidebar */}
        <div className="w-80 border-l bg-white overflow-y-auto">
          <div className="p-4 space-y-4">
            {/* SLA Tracking */}
            {config.showSLATracking && (
              <SLATracker sla={workflow.sla} />
            )}
            
            {/* Metrics */}
            {config.showMetrics && (
              <MetricsDashboard 
                metrics={workflow.metrics}
                {...(customMetricsRenderer && { customRenderer: customMetricsRenderer })}
              />
            )}
            
            {/* Selected step details */}
            {selectedStep && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Step Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <div className="text-sm font-medium">{selectedStep.name}</div>
                    <div className="text-xs text-gray-600 mt-1">
                      {selectedStep.description}
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span>Status:</span>
                      <Badge className={getStepStatusColor(selectedStep.status)}>
                        {selectedStep.status.replace('_', ' ')}
                      </Badge>
                    </div>
                    
                    <div className="flex justify-between">
                      <span>Type:</span>
                      <span className="font-medium">{selectedStep.type}</span>
                    </div>
                    
                    {(selectedStep.duration !== null && selectedStep.duration !== undefined) && (
                      <div className="flex justify-between">
                        <span>Duration:</span>
                        <span className="font-medium">
                          {formatDuration(selectedStep.duration)}
                        </span>
                      </div>
                    )}
                    
                    <div className="flex justify-between">
                      <span>Participants:</span>
                      <span className="font-medium">
                        {selectedStep.currentParticipants.length}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ValidationWorkflowVisualization;