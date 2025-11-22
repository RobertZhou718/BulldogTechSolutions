const tenantSubdomain = import.meta.env.VITE_AUTH_TENANT_NAME;
const clientId = import.meta.env.VITE_SPA_CLIENT_ID;
const redirectUri = import.meta.env.VITE_REDIRECT_URI 
export const msalConfig = {
    auth: {
        clientId,
        authority: `https://${tenantSubdomain}.ciamlogin.com/`,
        knownAuthorities: [`${tenantSubdomain}.ciamlogin.com`],
        redirectUri,
    },
    cache: {
        cacheLocation: "sessionStorage",
        storeAuthStateInCookie: false,
    },
};

const API_APP_ID_URI = `api://${import.meta.env.VITE_API_CLIENT_ID}`;
export const loginRequest = {
    scopes: [
        "openid",
        "profile",
        "email",
        `${API_APP_ID_URI}/api.access`,
    ],
};

export const apiConfig = {
    baseUrl:import.meta.env.VITE_API_BASE_URL,
    scopes: [`${API_APP_ID_URI}/api.access`],
};