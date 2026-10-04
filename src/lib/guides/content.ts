import type { GuideSection } from "./types";
import { GUIDE_CONTENT_A } from "./content-a";
import { GUIDE_CONTENT_B } from "./content-b";

/** Merged guide content (split for push size limits). */
export const GUIDE_CONTENT: Record<string, GuideSection[]> = {
  ...GUIDE_CONTENT_A,
  ...GUIDE_CONTENT_B,
};
