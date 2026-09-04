/** Public surface of the API layer. Consumers import from `@/lib/api`. */

export * from "./client";
export { API_BASE_URL, serverApiBaseUrl, serverGet } from "./base-url";

export { waitlistApi, toQuery } from "./waitlist";
export type { WaitlistSignupPayload, WaitlistListParams } from "./waitlist";

export { launchApi } from "./launch";

export { authApi, setToken, clearToken, getToken } from "./auth";
export type { AdminUser, AuthenticatedUser, ProfilePatch } from "./auth";

export { analyticsApi } from "./analytics";
export type {
  AnalyticsPeriod,
  DashboardStats,
  DigestDraft,
  DigestMetrics,
  DigestPreview,
  TrendPoint,
  Slice,
  CityRow,
  FunnelStep,
} from "./analytics";

export { dashboardApi } from "./dashboard";

export { referralsApi } from "./referrals";
export type { ReferralDetail, RewardResult, ReferralProgram, PendingReward } from "./referrals";

export { downloadEndpoint } from "./download";

export { campaignsApi } from "./campaigns";
export type { CampaignInput, CampaignStats } from "./campaigns";

export { templatesApi } from "./templates";
export type { EmailTemplateDetail, EmailTemplateInput } from "./templates";

export { cmsApi } from "./cms";
export type { CmsSection, CmsSectionPatch, Faq, Testimonial } from "./cms";

export { mediaApi } from "./media";
export type { MediaFile, MediaListParams } from "./media";

export { usersApi } from "./users";
export type { AdminUserDetail, AdminUserInput, AdminUserListParams } from "./users";

export { rolesApi } from "./roles";
export type { PermissionGroup, PermissionItem, RoleDetail, RoleInput } from "./roles";
// `Role` lives in `@/lib/types` but is re-exported here so route files can take
// the API and its row shape from one import.
export type { Role } from "@/lib/types";

export { notificationsApi } from "./notifications";
export type { Notification, NotificationType, NotificationListParams } from "./notifications";

export { auditApi } from "./audit";
export type { AuditEntry, AuditListParams } from "./audit";

export { settingsApi } from "./settings";
export type {
  SettingsGroup,
  SmtpSettings,
  ApiKeyRecord,
  CachePurgeResult,
  SystemSettings,
  PublicBranding,
} from "./settings";

export { healthApi } from "./health";
export type { SystemHealth, HealthCheck, HealthSample, QueuedJob } from "./health";

export { cronApi } from "./cron";
export type { CronStatus, CronRunRow, CronRunNowResult, CronPaths } from "./cron";

// Data room. The visitor client has its own transport and its own token
// namespace on purpose; see the docblock in `./dataroom`.
export {
  dataRoomApi,
  getDataRoomToken,
  setDataRoomToken,
  clearDataRoomToken,
} from "./dataroom";
export type {
  DataRoomGate,
  DataRoomSessionInfo,
  DataRoomVisitor,
  DataRoomAuthResult,
  DataRoomMe,
  DataRoomDocumentCard,
  DataRoomDocumentDetail,
  DataRoomFolderCard,
  DataRoomDashboard,
  DataRoomActivityRow,
} from "./dataroom";

export { dataRoomAdminApi, DATA_ROOM_EMERGENCY_PHRASES } from "./dataroom-admin";
export type {
  DataRoomPolicySnapshot,
  DataRoomOverview,
  DataRoomAnalytics,
  DataRoomAuditRow,
  DataRoomAuditPage,
  DataRoomAuditParams,
  DataRoomAdminFolder,
  DataRoomAdminDocument,
  DataRoomAdminDocumentDetail,
  DataRoomDocumentVersionRow,
  DataRoomDocumentMetadataPatch,
  DataRoomDocumentStatus,
  DataRoomConfidentiality,
  DataRoomAdminGrant,
  DataRoomGrantDetail,
  DataRoomGrantStatus,
  DataRoomGrantDuration,
  DataRoomGrantInput,
  DataRoomGrantPatch,
  DataRoomGrantScope,
  DataRoomGrantCreated,
  DataRoomGrantRegenerated,
  DataRoomDurationOptions,
  DataRoomMatrixCell,
  DataRoomPermissionMatrix,
  DataRoomAccessTemplate,
  DataRoomTemplateInput,
  DataRoomSettingsPatch,
  DataRoomEmergencyAction,
  DataRoomEmergencyResult,
} from "./dataroom-admin";
