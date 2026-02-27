export const EXTRACT_AUTH_JS = `
(function() {
  const accessToken = localStorage.getItem('access_token');
  const refreshToken = localStorage.getItem('refresh_token');

  let expiresAt = null;
  if (accessToken) {
    try {
      const payload = JSON.parse(atob(accessToken.split('.')[1]));
      if (payload.exp) {
        expiresAt = new Date(payload.exp * 1000).toISOString();
      }
    } catch (e) {
      // Not a valid JWT, ignore
    }
  }

  return JSON.stringify({
    access_token: accessToken,
    refresh_token: refreshToken ? '(present)' : null,
    expires_at: expiresAt,
  });
})()
`;

export const GET_AUTH_HEADER_JS = `localStorage.getItem('access_token')`;
