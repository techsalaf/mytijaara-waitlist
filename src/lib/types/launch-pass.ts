/**
 * Types for the MyTijaara Launch Pass and TAA NATCON 2026 campaign.
 */

export type LaunchPassData = {
  name: string;
  firstName: string;
  city: string;
  role?: string;
  launchPassNumber: string;
  launchPassToken: string;
  referralCode?: string;
  attendingNatcon: boolean;
  position: number;
  joinedAt: string;
};

export type LaunchPassCmsData = {
  campaignTitle: string;
  eventName: string;
  eventDate: string;
  eventDateShort: string;
  headlineGeneral: string;
  headlineAttendee: string;
  supportingCopyGeneral: string;
  supportingCopyAttendee: string;
  liveHeadlineGeneral: string;
  liveHeadlineAttendee: string;
  taaLogoUrl: string;
  sharingMessage: string;
  sharingMessageAttendee: string;
  referralCta: string;
  cardFooterText: string;
  enableAttendeeQuestion: boolean;
  enablePostFormat: boolean;
  enableStoryFormat: boolean;
};

export const DEFAULT_LAUNCH_PASS_CMS: LaunchPassCmsData = {
  campaignTitle: "My Launch Pass",
  eventName: "TAA NATCON 2026",
  eventDate: "October 2, 2026",
  eventDateShort: "02 • 10 • 26",
  headlineGeneral: "I'M ON THE LIST",
  headlineAttendee: "I'LL BE THERE",
  supportingCopyGeneral: "I'm getting ready for MyTijaara. Officially launching October 2, 2026 at TAA NATCON 2026. Something big is coming.",
  supportingCopyAttendee: "I'll be witnessing the official launch of MyTijaara LIVE at TAA NATCON 2026. 02 • 10 • 26.",
  liveHeadlineGeneral: "MYTIJAARA IS LIVE",
  liveHeadlineAttendee: "I WAS THERE",
  taaLogoUrl: "/images/taa-natcon-partner-logo.png",
  sharingMessage: "I'm on the MyTijaara Launch List! Officially launching Oct 2 at TAA NATCON 2026. Join with me:",
  sharingMessageAttendee: "I'll be witnessing the official launch of MyTijaara LIVE at TAA NATCON 2026! Join the waitlist before launch:",
  referralCta: "Join the Waitlist",
  cardFooterText: "MyTijaara × TAA NATCON 2026 • Nigeria's Everyday Super App",
  enableAttendeeQuestion: true,
  enablePostFormat: true,
  enableStoryFormat: true,
};
