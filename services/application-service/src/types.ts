export interface JWTPayload {
  username: string;
  sessionId: string;
  exp: number;
  iat?: number;
}

export interface SessionInvalidationEvent {
  sessionId: string;
  expiration: number;
}

export interface WhoAmIResponse {
  serviceName: string;
  sessionId: string;
  jwtExp: number;
}

export interface ErrorResponse {
  error: string;
  message: string;
}
