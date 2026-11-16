/* Remove bearer invitations and Auth callbacks before assets/navigation can retain them. */
(function (root, factory) {
  'use strict';
  const parser = factory();
  if (typeof module === 'object' && module.exports) module.exports = parser;
  if (!root?.location) return;
  let incoming = parser.capture(root.location.href);
  if (incoming.cleanURL !== root.location.href) root.history.replaceState(null, '', incoming.cleanURL);
  root.DobbyAccessEntry = Object.freeze({
    consume() { const value = incoming; incoming = null; return value; }
  });
})(typeof window === 'undefined' ? null : window, function () {
  'use strict';
  function capture(value) {
    const url = new URL(value), clean = new URL(value);
    const hash = url.hash.slice(1), split = hash.indexOf('?');
    const parameters = new URLSearchParams(split >= 0 ? hash.slice(split + 1) : hash);
    const invitation = url.searchParams.get('invite') || url.searchParams.get('invitation') ||
      (split >= 0 ? parameters.get('invite') || parameters.get('invitation') : null);
    const callback = url.searchParams.has('code') || parameters.has('access_token') || parameters.has('refresh_token');
    const providerError = ['error','error_description','error_code'].some(key=>url.searchParams.has(key)||parameters.has(key));
    const recovery = url.searchParams.get('type') === 'recovery' || parameters.get('type') === 'recovery';
    const sensitive = ['invite', 'invitation', 'code', 'dobby_flow', 'token', 'token_hash', 'access_token', 'refresh_token', 'expires_in', 'expires_at', 'token_type', 'type', 'error', 'error_description', 'error_code'];
    for (const name of sensitive) clean.searchParams.delete(name);
    if (callback || providerError || invitation && split >= 0) clean.hash = 'access';
    return { cleanURL: clean.href, callbackURL: callback && !providerError ? url.href : null, invitation, recovery, providerError };
  }
  return Object.freeze({ capture });
});
