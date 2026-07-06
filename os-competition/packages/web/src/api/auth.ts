import client from './client';

export async function login(phone: string, password: string) {
  const res = await client.post('/auth/login', { phone, password });
  localStorage.setItem('token', res.data.token);
  localStorage.setItem('user', JSON.stringify(res.data.user));
  return res.data;
}

export async function getMe() {
  const res = await client.get('/auth/me');
  return res.data;
}
