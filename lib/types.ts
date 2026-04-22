export type ServerSort = "stars" | "updated" | "trust" | "uptime";

export interface DirectoryServer {
  id: string;
  repoFullName: string;
  name: string;
  description: string;
  ownerLogin: string;
  ownerType: "User" | "Organization";
  ownerFollowers: number;
  stars: number;
  forks: number;
  openIssues: number;
  topics: string[];
  language: string | null;
  repositoryUrl: string;
  homepageUrl: string | null;
  healthcheckUrl: string | null;
  installCommand: string;
  trustScore: number;
  verifiedAuthor: boolean;
  createdAt: string;
  updatedAt: string;
  lastCommitAt: string;
  uptime30d: number;
  averageResponseMs: number;
}

export interface UptimeCheck {
  id: number;
  serverId: string;
  checkedAt: string;
  responseTimeMs: number;
  statusCode: number;
  success: boolean;
}

export interface AccessPurchase {
  email: string;
  orgSlug: string;
  seatCount: number;
  status: "active" | "cancelled" | "past_due";
  source: "stripe" | "lemon-squeezy";
  updatedAt: string;
}
