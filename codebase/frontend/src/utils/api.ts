const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';


class ApiClient {
  private getTokens() {
    if (typeof window === 'undefined') return { accessToken: null, refreshToken: null };
    const accessToken = localStorage.getItem('cp_access_token');
    const refreshToken = localStorage.getItem('cp_refresh_token');
    return { accessToken, refreshToken };
  }

  setTokens(accessToken: string, refreshToken: string) {
    if (typeof window !== 'undefined') {
      localStorage.setItem('cp_access_token', accessToken);
      localStorage.setItem('cp_refresh_token', refreshToken);
    }
  }

  clearTokens() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('cp_access_token');
      localStorage.removeItem('cp_refresh_token');
      localStorage.removeItem('cp_current_workspace');
    }
  }

  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const { accessToken } = this.getTokens();
    const headers = new Headers(options.headers || {});

    if (accessToken) {
      headers.set('Authorization', `Bearer ${accessToken}`);
    }

    if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    const config = {
      ...options,
      headers,
    };

    const response = await fetch(`${BASE_URL}${endpoint}`, config);

    // Auto JWT Token Rotation
    if (response.status === 401 && endpoint !== '/auth/login' && endpoint !== '/auth/register') {
      const refreshed = await this.tryRefreshToken();
      if (refreshed) {
        // Retry original request with new access token
        const newTokens = this.getTokens();
        headers.set('Authorization', `Bearer ${newTokens.accessToken}`);
        const retryResponse = await fetch(`${BASE_URL}${endpoint}`, {
          ...options,
          headers,
        });
        return this.handleResponse<T>(retryResponse);
      } else {
        this.clearTokens();
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        throw new Error('Session expired. Please log in again.');
      }
    }

    return this.handleResponse<T>(response);
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    const text = await response.text();
    let data;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { message: text };
    }

    if (!response.ok) {
      const errorMsg = data.message || `Request failed with status ${response.status}`;
      throw new Error(Array.isArray(errorMsg) ? errorMsg.join(', ') : errorMsg);
    }

    return data as T;
  }

  private async tryRefreshToken(): Promise<boolean> {
    const { refreshToken } = this.getTokens();
    if (!refreshToken) return false;

    try {
      const response = await fetch(`${BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) return false;

      const data = await response.json();
      if (data.accessToken && data.refreshToken) {
        this.setTokens(data.accessToken, data.refreshToken);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  // HTTP Helper Methods
  get<T>(endpoint: string, options?: RequestInit) {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  post<T>(endpoint: string, body?: any, options?: RequestInit) {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body),
    });
  }

  patch<T>(endpoint: string, body?: any, options?: RequestInit) {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: body instanceof FormData ? body : JSON.stringify(body),
    });
  }

  delete<T>(endpoint: string, options?: RequestInit) {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
}

export const api = new ApiClient();
