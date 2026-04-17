const STORAGE_KEY = "bulldogfinance.auth.session";

function getStorage() {
    if (typeof window === "undefined") {
        return null;
    }

    return window.sessionStorage;
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
        authMethod: session.authMethod || null,
        user,
    };

    storage.setItem(STORAGE_KEY, JSON.stringify(normalizedSession));

    return normalizedSession;
}

export function clearStoredAuthSession() {
    const storage = getStorage();

    storage?.removeItem(STORAGE_KEY);
}

export function getStoredAccessToken() {
    return getStoredAuthSession()?.accessToken || null;
}

export function getStoredUser() {
    return getStoredAuthSession()?.user || null;
}
