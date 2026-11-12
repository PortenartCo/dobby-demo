/* Routes reflect the native server-backed access state; they never create identity. */
export function destination(state = {}, { invitationPending = false } = {}) {
  if (state.phase === 'active') {
    if (!state.verified || !state.userId || !state.householdId || !state.memberId) return 'access-unavailable';
    if (invitationPending) return 'access-join';
    return state.pendingCeremony ? 'traverse' : 'ritual';
  }
  if (state.phase === 'rejected' || state.phase === 'unavailable') return 'access-unavailable';
  if (state.phase === 'email-confirmation') return 'access-confirmation';
  if (state.authenticated && state.userId && state.phase === 'profile') return 'access-profile';
  if (state.authenticated && state.userId && state.phase === 'household') return invitationPending ? 'access-join' : 'access-create';
  return 'access-welcome';
}

// Native pages share one public entry, including after the static root relay.
export function authReturnURL(nativeURL) { return new URL('../', nativeURL).href; }
export function canonicalAuthCallback(value, nativeURL) {
  const callback = new URL(value), root = new URL(authReturnURL(nativeURL));
  if (callback.origin !== root.origin) throw Error('Origine de retour Auth incohérente.');
  root.search = callback.search; root.hash = callback.hash;
  return root.href;
}
