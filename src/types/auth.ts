export interface DeviceCodeResponse {
  code: string;
  user_code: string;
  verification_uri: string;
  expires_in: number;
  interval: number;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
}

export interface AuthError {
  error: string;
  error_description?: string;
}
