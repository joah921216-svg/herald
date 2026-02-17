import { useState } from 'react';
import { useRouter } from 'next/router';

interface FormData {
  projectName: string;
  category: string;
  chain: string;
  startDate: string;
  endDate: string;
  rewardAmount: number;
  rewardCurrency: string;
  rewardType: string;
  maxParticipants: number;
}

const INITIAL_FORM: FormData = {
  projectName: '',
  category: 'DeFi',
  chain: 'Ethereum',
  startDate: '',
  endDate: '',
  rewardAmount: 0,
  rewardCurrency: 'USDT',
  rewardType: '',
  maxParticipants: 500
};

const GOAL_OPTIONS = [
  'COMMUNITY_GROWTH',
  'CONTENT_CREATION',
  'DAPP_USAGE',
  'ONCHAIN_ACTIVITY',
  'LEADERBOARD'
] as const;

export default function CampaignCreateForm() {
  const router = useRouter();
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM);
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const campaignData = {
      projectName: formData.projectName,
      category: formData.category,
      chain: formData.chain,
      startDate: formData.startDate,
      endDate: formData.endDate,
      goals: selectedGoals,
      reward: {
        amount: formData.rewardAmount,
        currency: formData.rewardCurrency,
        type: formData.rewardType,
        maxParticipants: formData.maxParticipants
      }
    };

    try {
      const response = await fetch('/api/campaigns/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(campaignData)
      });

      if (response.ok) {
        const result = await response.json();
        alert('캠페인이 생성되었습니다!');
        router.push('/quests');
      }
    } catch (error) {
      console.error('Failed to create campaign:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const toggleGoal = (goal: string) => {
    setSelectedGoals(prev =>
      prev.includes(goal) ? prev.filter(g => g !== goal) : [...prev, goal]
    );
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* TODO: form UI */}
      <button type="submit" disabled={submitting}>
        {submitting ? '생성 중...' : '캠페인 시작하기'}
      </button>
    </form>
  );
}
