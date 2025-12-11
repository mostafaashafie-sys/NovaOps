import { App } from 'antd';

/**
 * Message utility wrapper for Ant Design messages
 * Uses App component's message hook for context-aware notifications
 * Provides consistent notification patterns across the app
 */
let messageApi = null;

// Initialize message API (called from App component)
export const initMessageApi = (api) => {
  messageApi = api;
};

export const showMessage = {
  success: (content, duration = 3) => {
    if (messageApi) {
      messageApi.success({
        content,
        duration,
        className: 'custom-message-success'
      });
    }
  },
  
  error: (content, duration = 4) => {
    if (messageApi) {
      messageApi.error({
        content,
        duration,
        className: 'custom-message-error'
      });
    }
  },
  
  warning: (content, duration = 3) => {
    if (messageApi) {
      messageApi.warning({
        content,
        duration,
        className: 'custom-message-warning'
      });
    }
  },
  
  info: (content, duration = 3) => {
    if (messageApi) {
      messageApi.info({
        content,
        duration,
        className: 'custom-message-info'
      });
    }
  }
};

export default showMessage;

