import axios from './axios';

export const submitContactForm = async (payload) => {
  const response = await axios.post('/contact', payload);
  return response.data;
};
