interface Campaign {
  id: string;
  projectName: string;
  projectIcon: string;
  chain: string;
  questType: string;
  reward: CampaignReward;
  participants: CampaignParticipants;
  status: CampaignStatus;
  startDate: Date;
  endDate: Date;
  goals: CampaignGoal[];
}

interface CampaignReward {
  amount: number;
  currency: string;
  type: string;
}

interface CampaignParticipants {
  current: number;
  max: number;
}

type CampaignStatus = 'LIVE' | 'ONGOING' | 'ENDED';

interface CampaignGoal {
  type: CampaignGoalType;
  name: string;
  description?: string;
}

type CampaignGoalType =
  | 'COMMUNITY_GROWTH'
  | 'CONTENT_CREATION'
  | 'DAPP_USAGE'
  | 'ONCHAIN_ACTIVITY'
  | 'LEADERBOARD';
