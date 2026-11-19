/* Public application configuration only. Never put a secret/service-role key here.
 * The existing native IndexedDB configuration remains supported.
 * Public key supplied by the user for the family project only.
 * Production accounts/invitations require the separate live-verification gate.
 */
window.DobbyPublicConfig = Object.freeze({
  projectRef: 'pqcdkrwljgvgagzwrcmg',
  // Pilot navigation only. Hosted Auth and invitation permissions are checked separately.
  existingHouseholdOnly: true,
  publicKey: 'sb_publishable_ZIJtdwIFQFFqC7kderuG1A_Itccatg4'
});
