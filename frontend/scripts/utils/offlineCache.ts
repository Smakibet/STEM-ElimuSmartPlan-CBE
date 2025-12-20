export const cacheSession = (session: any) => {
    localStorage.setItem(`tpad_${session.id}`, JSON.stringify(session));
};

export const loadCachedSession = (_userId: string) => {
    const key = Object.keys(localStorage).find(k => k.startsWith('tpad_'));
    if (!key) return null;
    return JSON.parse(localStorage.getItem(key)!);
};
