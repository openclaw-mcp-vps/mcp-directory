import { differenceInDays } from "date-fns";

export type TrustScoreInput = {
  stars: number;
  forks: number;
  openIssues: number;
  hasHomepage: boolean;
  hasLicense: boolean;
  archived: boolean;
  ownerType: "User" | "Organization" | string;
  pushedAt: string;
  createdAt: string;
};

export function calculateTrustScore(input: TrustScoreInput): number {
  if (input.archived) {
    return 10;
  }

  const starsScore = Math.min(32, Math.log10(input.stars + 1) * 12);
  const forksScore = Math.min(15, Math.log10(input.forks + 1) * 8);
  const issuePenalty = Math.min(12, input.openIssues * 0.35);

  const activeDays = Math.max(0, differenceInDays(new Date(), new Date(input.pushedAt)));
  const freshnessScore = Math.max(0, 22 - activeDays / 6);

  const repoAgeDays = Math.max(1, differenceInDays(new Date(), new Date(input.createdAt)));
  const maturityScore = Math.min(9, Math.log10(repoAgeDays) * 3.2);

  const ownerScore = input.ownerType === "Organization" ? 8 : 4;
  const homepageScore = input.hasHomepage ? 6 : 0;
  const licenseScore = input.hasLicense ? 6 : 0;

  const raw =
    starsScore +
    forksScore +
    freshnessScore +
    maturityScore +
    ownerScore +
    homepageScore +
    licenseScore -
    issuePenalty;

  return Math.max(1, Math.min(100, Math.round(raw)));
}

export function trustTier(score: number): "High" | "Medium" | "Low" {
  if (score >= 75) {
    return "High";
  }
  if (score >= 45) {
    return "Medium";
  }
  return "Low";
}
