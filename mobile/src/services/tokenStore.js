// Singleton in-memory token store.
// Token is loaded once at app start → all interceptors read sync, zero disk I/O per request.
let _token = null;

export const setToken = (token) => { _token = token; };
export const getToken = () => _token;
export const clearToken = () => { _token = null; };
