// Module-level pending-request counter plus a pub/sub channel so TopProgressBar
// can react to in-flight API requests without threading state through every
// component. apiClient calls begin()/end() around each fetch.

let pendingCount = 0;
const listeners = new Set();

function emit() {
    for (const listener of listeners) {
        listener(pendingCount);
    }
}

export function begin() {
    pendingCount += 1;
    emit();
}

export function end() {
    pendingCount = Math.max(0, pendingCount - 1);
    emit();
}

export function subscribe(listener) {
    listeners.add(listener);
    listener(pendingCount);
    return () => listeners.delete(listener);
}
