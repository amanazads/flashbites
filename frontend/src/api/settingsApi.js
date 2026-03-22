import axios from './axios';

export const getPlatformSettings = async () => {
  const response = await axios.get('/settings');
  return response.data;
};
