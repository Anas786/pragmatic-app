import axios, { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { APIResponse } from 'src/types';
import { BASE_URL } from 'src/utils';
import { useUserStore } from 'src/hooks/useUserStore';

export const appAxios = axios.create({
  baseURL: BASE_URL,
});

export const setAuthToken = (token: string) =>
  (appAxios.defaults.headers.Authorization = token);

export const deleteToken = () =>
  delete appAxios.defaults.headers.Authorization;

// Global logout function that can be called from anywhere
let globalLogout: (() => void) | null = null;

export const setGlobalLogout = (logoutFn: () => void) => {
  globalLogout = logoutFn;
};

export const executeLogout = async () => {
  try {
    // Clear the authentication token from AsyncStorage
    await AsyncStorage.removeItem('token');

    // Remove the token from axios headers
    deleteToken();

    // Clear user data from the store
    useUserStore.getState().removeUser();

    // Call global logout function if set (handles navigation)
    if (globalLogout) {
      globalLogout();
    }
  } catch (error) {
    console.error('Error during logout:', error);
    // Even if there's an error, try to execute logout steps
    deleteToken();
    useUserStore.getState().removeUser();
    if (globalLogout) {
      globalLogout();
    }
  }
};

// Add request interceptor to include language parameter in all API requests
appAxios.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const token = await AsyncStorage.getItem('token');
    if(token) {
      config.headers.Authorization = token;
    }

    // Get current language from i18n (defaults to 'en' if not set)
    // Note: We need to import i18n here, but since it's initialized synchronously,
    // we can safely access it. For async access, we'll use AsyncStorage as fallback.
    let lang = 'en';
    try {
      const storedLang = await AsyncStorage.getItem('language');
      lang = storedLang === 'ar' ? 'ar' : 'en';
    } catch {
      // Fallback to 'en' if AsyncStorage fails
      lang = 'en';
    }

    // Add lang parameter to all requests
    if (config.params) {
      // If params already exist, add lang to them
      config.params.lang = lang;
    } else {
      // If no params exist, create params object with lang
      config.params = { lang };
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle authentication-related status codes
// 401: Unauthorized - Invalid or missing authentication
// 403: Forbidden - Valid authentication but insufficient permissions
// 419: CSRF token mismatch - Session expired or invalid
appAxios.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401 || error.response?.status === 403 || error.response?.status === 419) {
      // Execute logout when authentication-related errors are received
      executeLogout();
    }
    return Promise.reject(error);
  }
);

export const callAPI = async <T>(
  axiosPromise: Promise<AxiosResponse<APIResponse<T>>>,
): Promise<APIResponse<T>> => {
  try {
    const data = (await axiosPromise).data as APIResponse<T>;
    if (data.status === 'error') {
      throw new Error('An error occured');
    } else {
      return data;
    }
  } catch (err) {
    if (err instanceof AxiosError) {
      // Check for authentication-related status codes
      if (err.response?.status === 401 || err.response?.status === 403 || err.response?.status === 419) {
        executeLogout();
        throw new Error('Unauthorized access. Please login again.');
      }
      throw err.response?.data.message || err?.message;
    }
    if (err instanceof Error) {
      throw err.message;
    }
    throw err;
  }
};
