/** Shared guide types. */
export type GuideAudience = "Buyer" | "Seller" | "Renter" | "Landlord";

export interface AudienceMeta {
  audience: GuideAudience;
  label: string;
  color: string;
  bg: string;
  emoji: string;
}

export interface GuideMeta {
  id: string;
  audience: GuideAudience;
  tag: string;
  title: string;
  subtitle: string;
  intro: string;
  emoji: string;
  color: string;
  seoTitle: string;
  seoDescription: string;
}

export interface GuideSection {
  heading: string;
  paragraphs: string[];
  checklist: string[];
}
