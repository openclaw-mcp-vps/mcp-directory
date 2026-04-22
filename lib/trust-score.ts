interface TrustScoreInput {
  stars: number;
  forks: number;
  openIssues: number;
  ownerType: "User" | "Organization";
  ownerFollowers: number;
  hasLicense: boolean;
  archived: boolean;
  pushedAt: string;
  createdAt: string;
}

function clamp(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, value));
}

function logScore(value: number, maxValue: number): number {
  if (value <= 0) return 0;
  return (Math.log10(value + 1) / Math.log10(maxValue + 1)) * 100;
}

export function calculateTrustScore(input: TrustScoreInput): number {
  const starScore = logScore(input.stars, 50_000) * 0.4;
  const forkScore = logScore(input.forks, 10_000) * 0.1;
  const followerScore = logScore(input.ownerFollowers, 100_000) * 0.2;
  const ownerTypeBoost = input.ownerType === "Organization" ? 8 : 0;

  const issuePenaltyBase = input.stars > 0 ? (input.openIssues / Math.max(input.stars, 1)) * 100 : input.openIssues;
  const issuePenalty = Math.min(issuePenaltyBase, 20);

  const now = Date.now();
  const pushedDeltaDays = Math.round((now - new Date(input.pushedAt).getTime()) / (1000 * 60 * 60 * 24));
  const createdDeltaDays = Math.round((now - new Date(input.createdAt).getTime()) / (1000 * 60 * 60 * 24));

  const recencyBoost = pushedDeltaDays <= 30 ? 12 : pushedDeltaDays <= 90 ? 8 : pushedDeltaDays <= 180 ? 4 : 0;
  const maturityBoost = createdDeltaDays >= 365 ? 6 : createdDeltaDays >= 90 ? 3 : 0;
  const licenseBoost = input.hasLicense ? 6 : 0;
  const archivePenalty = input.archived ? 20 : 0;

  return Math.round(
    clamp(starScore + forkScore + followerScore + ownerTypeBoost + recencyBoost + maturityBoost + licenseBoost - issuePenalty - archivePenalty)
  );
}

export function trustLabel(score: number): string {
  if (score >= 80) return "High trust";
  if (score >= 60) return "Trusted";
  if (score >= 40) return "Watchlist";
  return "Unverified";
}
