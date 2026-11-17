/** Lot 1 DB contract. No service client, secret, Auth HTTP or business writer. */
export type DobbyAccessStatus = 'unapproved' | 'active' | 'suspended';
export type DobbyAdmissionPurpose = 'new-household' | 'family-parent' | 'family-child';
export type DobbyAdmissionState = 'requested' | 'approved' | 'delivering' | 'sent' | 'accepted' | 'rejected' | 'revoked';
export interface DobbyAccessContext {
 protocol: 1;
 status: DobbyAccessStatus;
 isOwner: boolean;
 canCreateHousehold: boolean;
 revision: number;
}
export interface DobbyAccessStatusRequest {
 p_user_id: string;
 p_status: 'active' | 'suspended';
 p_expected_revision: number;
 p_operation_id: string;
 p_confirmed: true;
}
export interface DobbyAccessStatusResult {
 status: 'active' | 'suspended';
 revision: number;
 replayed: boolean;
 /** True after phase 1: commit, then call finalize in a separate transaction. */
 sessionBoundaryPending: boolean;
}
export interface DobbyFinalizeReactivationRequest {
 p_user_id: string;
 p_expected_revision: number;
}
/** Privileged bootstrap input. Supply privately, never save a real instance in Git. */
export interface DobbyBootstrapManifest {
 ownerUserId: string;
 preservedAccounts: [DobbyCanonicalAccount, DobbyCanonicalAccount];
}
export interface DobbyCanonicalAccount {
 userId: string;
 householdId: string;
 memberId: string;
}
