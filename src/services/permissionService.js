// Purpose: Centralized permission logic based on Flow Spec
// Used by: HomeScreen, AccountDashboard, ProfileDashboard

export const ROLES = {
    OWNER: 'Owner',
    PARTNER: 'Partner',
    BASIC: 'Basic'
};

export const PERMISSIONS = {
    VIEW_ACCOUNT_DASHBOARD: [ROLES.OWNER, ROLES.PARTNER],
    EDIT_BUDGET: [ROLES.OWNER],
    VIEW_ALL_PROFILES: [ROLES.OWNER, ROLES.PARTNER],
};

export const canViewAccountDashboard = (role) => {
    return PERMISSIONS.VIEW_ACCOUNT_DASHBOARD.includes(role);
};

export const canEditBudget = (role) => {
    return PERMISSIONS.EDIT_BUDGET.includes(role);
};

export const canViewProfile = (userRole, profileId, currentProfileId) => {
    // Owner/Partner can view all
    if (PERMISSIONS.VIEW_ALL_PROFILES.includes(userRole)) return true;
    // Basic can only view their own
    return profileId === currentProfileId;
};
