import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:8000',
});

// Intercept requests to attach the JWT token if the user is logged in
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export default api;