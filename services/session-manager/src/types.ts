export interface JWTPayload {
  username: string;
  sessionId: string;
  exp: number;
  iat?: number;
}

export interface SessionRecord {
  sessionId: string;
  username: string;
  expiration: number;
  isSessionInvalidated: boolean;
  createdAt: number;
}

export interface SessionInvalidationEvent {
  sessionId: string;
  expiration: number;
}

export interface LoginRequest {
  username?: string;
  password?: string;
}

export interface LoginResponse {
  token: string;
}

export interface HandlerResponse {
  statusCode: number;
  body: string;
}

export interface ErrorResponse {
  error: string;
  message: string;
}
