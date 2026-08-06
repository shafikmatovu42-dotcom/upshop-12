import { handleMockRequest } from './api-mock';

export function setupFetchInterceptor() {
  if (typeof window === 'undefined') return;

  const originalFetch = window.fetch;

  window.fetch = async function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    let url = '';
    if (typeof input === 'string') {
      url = input;
    } else if (input instanceof URL) {
      url = input.toString();
    } else if (input && typeof input === 'object' && 'url' in input) {
      url = (input as Request).url;
    }

    // Intercept local /api/ requests
    if (url.includes('/api/')) {
      console.log(`[Fetch Interceptor] Intercepted fetch to: ${url}`);
      return handleMockRequest(url, init);
    }

    // Pass through other requests (e.g. external images or resources)
    return originalFetch.apply(this, [input, init]);
  };

  console.log('Global fetch interceptor installed successfully.');
}
