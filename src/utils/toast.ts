import { showMessage } from 'react-native-flash-message';

export interface ToastOptions {
  type?: 'success' | 'danger' | 'warning' | 'info';
  duration?: number;
  position?: 'top' | 'bottom' | 'center';
}

export const showToast = (
  message: string,
  options: ToastOptions = {}
) => {
  const {
    type = 'info',
    duration = 3000,
    position = 'top',
  } = options;

  showMessage({
    message,
    type,
    duration,
    position,
    animated: true,
    hideStatusBar: false,
  });
};

export const showSuccessToast = (message: string, options?: Omit<ToastOptions, 'type'>) => {
  showToast(message, { ...options, type: 'success' });
};

export const showErrorToast = (message: string, options?: Omit<ToastOptions, 'type'>) => {
  showToast(message, { ...options, type: 'danger' });
};

export const showWarningToast = (message: string, options?: Omit<ToastOptions, 'type'>) => {
  showToast(message, { ...options, type: 'warning' });
};

export const showInfoToast = (message: string, options?: Omit<ToastOptions, 'type'>) => {
  showToast(message, { ...options, type: 'info' });
}; 