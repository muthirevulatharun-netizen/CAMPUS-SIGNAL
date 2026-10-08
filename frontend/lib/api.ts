import { Complaint, Analytics, User, Notification, Sector } from './types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const getHeaders = () => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const handleResponse = async (response: Response) => {
  if (!response.ok) {
    if (response.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        window.location.href = '/auth/login';
      }
    }
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || 'An error occurred');
  }
  return response.json();
};

const withQuery = (base: string, filters?: Record<string, string | undefined>) => {
  if (!filters) return base;
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v) params.set(k, v);
  });
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
};

export const api = {
  auth: {
    googleLogin: (token: string) => fetch(`${API_URL}/auth/google`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }) }).then(handleResponse),
    devLogin: (email: string) => fetch(`${API_URL}/auth/dev-login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) }).then(handleResponse),
    getMe: () => fetch(`${API_URL}/auth/me`, { headers: getHeaders() }).then(handleResponse),
  },
  complaints: {
    classify: (title: string, description: string) =>
      fetch(`${API_URL}/complaints/classify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description }),
      }).then(handleResponse),
    create: (data: Partial<Complaint>) => fetch(`${API_URL}/complaints`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(data) }).then(handleResponse),
    list: (filters?: Record<string, string | undefined>) =>
      fetch(withQuery(`${API_URL}/complaints`, filters), { headers: getHeaders() }).then(handleResponse),
    options: () => fetch(`${API_URL}/complaints/options`, { headers: getHeaders() }).then(handleResponse),
    get: (id: string) => fetch(`${API_URL}/complaints/${id}`, { headers: getHeaders() }).then(handleResponse),
    updateStatus: (id: string, status: string, comment?: string) =>
      fetch(`${API_URL}/complaints/${id}/status`, { method: 'PATCH', headers: getHeaders(), body: JSON.stringify({ status, comment }) }).then(handleResponse),
    assign: (id: string, staffId: string) =>
      fetch(`${API_URL}/complaints/${id}/assign`, { method: 'PATCH', headers: getHeaders(), body: JSON.stringify({ staff_id: staffId }) }).then(handleResponse),
    updatePriority: (id: string, priority: string, reason: string) =>
      fetch(`${API_URL}/complaints/${id}/priority`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({ priority, reason }),
      }).then(handleResponse),
    attachments: (id: string) =>
      fetch(`${API_URL}/complaints/${id}/attachments`, { headers: getHeaders() }).then(handleResponse),
    uploadAttachment: (id: string, file: File) => {
      const form = new FormData();
      form.append('file', file);
      const headers = new Headers(getHeaders());
      headers.delete('Content-Type');
      return fetch(`${API_URL}/complaints/${id}/attachments`, {
        method: 'POST',
        headers,
        body: form,
      }).then(handleResponse);
    },    downloadAttachment: async (complaintId: string, attachmentId: string): Promise<Blob> => {
      const response = await fetch(`${API_URL}/complaints/${complaintId}/attachments/${attachmentId}`, {
        headers: getHeaders(),
      });
      if (!response.ok) throw new Error('Unable to download the complaint attachment');
      return response.blob();
    },
  },
  issues: {
    list: () => fetch(`${API_URL}/issues`, { headers: getHeaders() }).then(handleResponse),
    get: (id: string) => fetch(`${API_URL}/issues/${id}`, { headers: getHeaders() }).then(handleResponse),
    detect: () => fetch(`${API_URL}/issues/detect`, { method: 'POST', headers: getHeaders() }).then(handleResponse),
    assign: (id: string, staffId: string) =>
      fetch(`${API_URL}/issues/${id}/assign`, { method: 'PATCH', headers: getHeaders(), body: JSON.stringify({ staff_id: staffId }) }).then(handleResponse),
    notifyTeam: (id: string) =>
      fetch(`${API_URL}/issues/${id}/notify`, { method: 'POST', headers: getHeaders() }).then(handleResponse),
    updateStatus: (id: string, status: string) =>
      fetch(`${API_URL}/issues/${id}/status`, { method: 'PATCH', headers: getHeaders(), body: JSON.stringify({ status }) }).then(handleResponse),
  },
  analytics: {
    get: (): Promise<Analytics> => fetch(`${API_URL}/analytics`, { headers: getHeaders() }).then(handleResponse),
  },
  audit: {
    list: (limit = 100) => fetch(`${API_URL}/audit?limit=${limit}`, { headers: getHeaders() }).then(handleResponse),
  },
  search: {
    query: (q: string) => fetch(`${API_URL}/search?q=${encodeURIComponent(q)}`, { headers: getHeaders() }).then(handleResponse),
  },
  notifications: {
    list: () => fetch(`${API_URL}/notifications`, { headers: getHeaders() }).then(handleResponse),
    markRead: (id: string) => fetch(`${API_URL}/notifications/${id}/read`, { method: 'PATCH', headers: getHeaders() }).then(handleResponse),
    markAllRead: () => fetch(`${API_URL}/notifications/read-all`, { method: 'POST', headers: getHeaders() }).then(handleResponse),
  },
  sectors: {
    list: () => fetch(`${API_URL}/sectors`, { headers: getHeaders() }).then(handleResponse),
    create: (data: Partial<Sector>) => fetch(`${API_URL}/sectors`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(data) }).then(handleResponse),
  },
  users: {
    list: () => fetch(`${API_URL}/users`, { headers: getHeaders() }).then(handleResponse),
    update: (id: string, data: Partial<User>) => fetch(`${API_URL}/users/${id}`, { method: 'PATCH', headers: getHeaders(), body: JSON.stringify(data) }).then(handleResponse),
    getStaff: () => fetch(`${API_URL}/users/staff`, { headers: getHeaders() }).then(handleResponse),
    createStaff: (data: { full_name: string; email: string; department?: string }) =>
      fetch(`${API_URL}/users/staff`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(data) }).then(handleResponse),
    assignStaff: (staffUserId: string, sectorId: string) =>
      fetch(`${API_URL}/users/staff/assign`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ staff_user_id: staffUserId, sector_id: sectorId }),
      }).then(handleResponse),
  },
  demo: {
    inject: () => fetch(`${API_URL}/demo/inject`, { method: 'POST', headers: getHeaders() }).then(handleResponse),
  },
};
