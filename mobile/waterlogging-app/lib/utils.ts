import { API_BASE_URL } from './config';

export const getErrorMessage = (error: any): string => {
    if (!error) return 'An unknown error occurred';

    // Network errors (often empty objects or specific messages in React Native)
    if (error.message === 'Network request failed' || error.message?.includes('Network')) {
        return `Unable to connect to server at ${API_BASE_URL}.\n\nPlease check:\n1. Your internet connection.\n2. Verify the backend server is running.\n3. Ensure your device/emulator is on the same network.`;
    }

    // Server errors with response data
    if (error.response) {
        // Try to extra detail from backend JSON response
        if (error.response.data && error.response.data.detail) {
            return `Server Error: ${error.response.data.detail}`;
        }
        return `Server Error (${error.response.status}): ${error.message}`;
    }

    // Standard JS errors
    return error.message || 'An unexpected error occurred';
};
