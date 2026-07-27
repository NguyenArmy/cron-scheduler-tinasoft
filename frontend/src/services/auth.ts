export interface User {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'USER';
}

export interface AuthResponse {
  accessToken: string;
  tokenType: string;
  expiresIn: string;
  user: User;
}

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3003';

export const authService = {
  async login(email: string, password: string): Promise<AuthResponse> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.message || 'Đăng nhập thất bại');
    }
    return res.json();
  },

  async register(email: string, name: string, password: string): Promise<AuthResponse> {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, name, password }),
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.message || 'Đăng ký thất bại');
    }
    return res.json();
  },

  async getMe(): Promise<User> {
    const res = await fetch(`${API_BASE}/auth/me`, {
      credentials: 'include',
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.message || 'Phiên đăng nhập hết hạn');
    }
    return res.json();
  },

  async logout(): Promise<void> {
    await fetch(`${API_BASE}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    });
  },
};
