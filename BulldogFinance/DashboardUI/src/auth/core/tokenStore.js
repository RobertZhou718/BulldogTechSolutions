const STORAGE_KEY = "bulldogfinance.auth.session";
const REMEMBER_KEY = "bulldogfinance.auth.remember";
const REMEMBER_DURATION_MS = 30 * 24 * 60 * 60 * 1000;

export function getRememberMe() {
    try {
        return window.localStorage?.getItem(REMEMBER_KEY) === "1";
    } catch {
        return false;
    }
}

export function setRememberMe(value) {
    try {
        if (value) {
            window.localStorage?.setItem(REMEMBER_KEY, "1");
        } else {
            window.localStorage?.removeItem(REMEMBER_KEY);
        }
    } catch {
        // ignore
    }
}

function getStorage() {
    if (typeof window === "undefined") {
        return null;
    }

    return getRememberMe() ? window.localStorage : window.sessionStorage;
}

function getOtherStorage() {
    if (typeof window === "undefined") {
        return null;
    }

    return getRememberMe() ? window.sessionStorage : window.localStorage;
}

function buildInitials(name = "", givenName = "", surname = "") {
    const parts = [givenName, surname].filter(Boolean);

    if (parts.length > 0) {
        return parts.map((part) => part[0]?.toUpperCase() || "").join("").slice(0, 2);
    }

    return name
        .split(" ")
        .filter(Boolean)
        .map((part) => part[0]?.toUpperCase() || "")
        .join("")
        .slice(0, 2);
}

function normalizeUser(user) {
    if (!user) {
        return null;
    }

    const name = user.name || user.username || "User";
    const givenName = user.givenName || "";
    const surname = user.surname || "";

    return {
        id: user.id || user.localAccountId || user.homeAccountId || "",
        name,
        email: user.email || user.username || "",
        username: user.username || user.email || "",
        givenName,
        surname,
        initials: user.initials || buildInitials(name, givenName, surname) || "U",
    };
}

export function getStoredAuthSession() {
    const storage = getStorage();

    if (!storage) {
        return null;
    }

    const rawSession = storage.getItem(STORAGE_KEY);

    if (!rawSession) {
        return null;
    }

    try {
        const parsed = JSON.parse(rawSession);
        const user = normalizeUser(parsed.user);

        if (!parsed.accessToken || !user) {
            return null;
        }

        return {
            accessToken: parsed.accessToken,
            refreshToken: parsed.refreshToken || null,
            expiresAt: Number.isFinite(parsed.expiresAt) ? parsed.expiresAt : null,
            rememberUntil: Number.isFinite(parsed.rememberUntil) ? parsed.rememberUntil : null,
            authMethod: parsed.authMethod || null,
            user,
        };
    } catch {
        return null;
    }
}

export function bootstrapStoredAuthSession() {
    return getStoredAuthSession();
}

export function saveStoredAuthSession(session) {
    const storage = getStorage();
    const user = normalizeUser(session?.user);

    if (!storage || !session?.accessToken || !user) {
        return null;
    }

    const normalizedSession = {
        accessToken: session.accessToken,
        refreshToken: session.refreshToken || null,
        expiresAt: Number.isFinite(session.expiresAt) ? session.expiresAt : null,
        rememberUntil: getRememberMe()
            ? Number.isFinite(session.rememberUntil)
                ? session.rememberUntil
                : Date.now() + REMEMBER_DURATION_MS
            : null,
        authMethod: session.authMethod || null,
        user,
    };

    storage.setItem(STORAGE_KEY, JSON.stringify(normalizedSession));
    // Clear any orphan from the opposite storage so toggling rememberMe never
    // leaves two sessions in parallel.
    getOtherStorage()?.removeItem(STORAGE_KEY);

    return normalizedSession;
}

export function clearStoredAuthSession() {
    try {
        window.localStorage?.removeItem(STORAGE_KEY);
    } catch {
        // ignore
    }
    try {
        window.sessionStorage?.removeItem(STORAGE_KEY);
    } catch {
        // ignore
    }
}

export function getStoredAccessToken() {
    return getStoredAuthSession()?.accessToken || null;
}

export function getStoredRefreshToken() {
    return getStoredAuthSession()?.refreshToken || null;
}

export function isStoredRememberWindowActive(session = getStoredAuthSession()) {
    if (!session?.rememberUntil) {
        return false;
    }

    return Date.now() < session.rememberUntil;
}

export function hasRefreshableStoredSession(session = getStoredAuthSession()) {
    return Boolean(session?.refreshToken && isStoredRememberWindowActive(session));
}

export function getStoredUser() {
    return getStoredAuthSession()?.user || null;
}
