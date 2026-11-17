/* Routes reflect the native server-backed access state; they never create identity. */
export function destination(state = {}, { invitationPending = false, invitationType = 'generic' } = {}) {
  if (state.phase === 'active') {
    if (!state.verified || !state.userId || !state.householdId || !state.memberId) return 'access-unavailable';
    if (invitationPending) return 'access-join';
    return state.pendingCeremony ? 'traverse' : 'ritual';
  }
  if (state.phase === 'rejected' || state.phase === 'unavailable') return 'access-unavailable';
  if (state.phase === 'email-confirmation') return 'access-confirmation';
  if (state.authenticated && state.userId && state.phase === 'profile') return invitationPending && invitationType === 'child-account' ? 'access-join' : 'access-profile';
  if (state.authenticated && state.userId && state.phase === 'household') return invitationPending ? 'access-join' : 'access-create';
  return 'access-welcome';
}

// The existing entry parser strips the whole bearer value from the URL.
// A typed prefix distinguishes a targeted existing child from a new adult.
export function invitationReference(value) {
  let text=String(value||'').trim();
  if(text.startsWith('child:'))return{type:'child-account',token:text.slice(6)};
  try {const url=new URL(text);text=url.searchParams.get('invite')||url.searchParams.get('invitation')||'';} catch {}
  return text.startsWith('child:') ? {type:'child-account',token:text.slice(6)} : {type:'generic',token:text};
}
export function childInvitationReference(token) { return 'child:'+token; }

// Native pages share one public entry, including after the static root relay.
export function authReturnURL(nativeURL) { return new URL('../', nativeURL).href; }
export function canonicalAuthCallback(value, nativeURL) {
  const callback = new URL(value), root = new URL(authReturnURL(nativeURL));
  if (callback.origin !== root.origin) throw Error('Origine de retour Auth incohérente.');
  root.search = callback.search; root.hash = callback.hash;
  return root.href;
}
