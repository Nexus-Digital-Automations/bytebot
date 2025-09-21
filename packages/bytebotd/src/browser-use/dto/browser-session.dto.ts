export interface BrowserSessionDto {
  sessionId: string;
  options?: Record<string, any>;
}

export interface CreateBrowserSessionResponseDto {
  success: boolean;
  sessionId: string;
}