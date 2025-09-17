/**
 * Approval Workflow Service
 * 
 * Manages approval workflows, human-in-the-loop processes, and
 * conversational approval through Parlant integration.
 */

import { Injectable, Logger } from '@nestjs/common';
import { ApprovalRequest, ApprovalStatus } from '../types/orchestrator.types';

@Injectable()
export class ApprovalWorkflowService {
  private readonly logger = new Logger(ApprovalWorkflowService.name);
  private readonly approvalRequests = new Map<string, ApprovalRequest>();

  async requestApproval(request: ApprovalRequest): Promise<string> {
    // Store approval request
    this.approvalRequests.set(request.requestId, request);
    
    // Initiate approval workflow (would integrate with Parlant)
    this.logger.log(`Approval requested: ${request.requestId}`);
    
    return request.requestId;
  }

  async getApprovalStatus(requestId: string): Promise<ApprovalStatus | null> {
    const request = this.approvalRequests.get(requestId);
    return request?.status || null;
  }

  async processApproval(requestId: string, approved: boolean, reason: string): Promise<boolean> {
    const request = this.approvalRequests.get(requestId);
    if (!request) {
      return false;
    }

    // Update approval status
    request.status = approved ? ApprovalStatus.APPROVED : ApprovalStatus.REJECTED;
    request.response = { approved, reason, confidence: 1.0 };
    
    this.logger.log(`Approval processed: ${requestId} - ${approved ? 'APPROVED' : 'REJECTED'}`);
    
    return true;
  }

  getApprovalStats(): { totalRequests: number; pending: number; approved: number; rejected: number } {
    const requests = Array.from(this.approvalRequests.values());
    return {
      totalRequests: requests.length,
      pending: requests.filter(r => r.status === ApprovalStatus.PENDING).length,
      approved: requests.filter(r => r.status === ApprovalStatus.APPROVED).length,
      rejected: requests.filter(r => r.status === ApprovalStatus.REJECTED).length
    };
  }
}