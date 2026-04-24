// Singleton in-memory token store.
// Token is loaded once at app start → all interceptors read sync, zero disk I/O per request.
let _token = null;
let _onForceLogout = null;

export const setToken = (token) => { _token = token; };
export const getToken = () => _token;
export const clearToken = () => { _token = null; };

// AuthContext mount olunca bu callback'i set eder.
// api.js interceptor'u token expire/invalid durumunda bunu cagirir.
export const setForceLogoutHandler = (fn) => { _onForceLogout = fn; };
export const forceLogout = () => { if (_onForceLogout) _onForceLogout(); };
