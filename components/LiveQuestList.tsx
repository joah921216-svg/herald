import { useEffect, useState } from 'react';

interface Quest {
  id: string;
  projectName: string;
  projectIcon: string;
  chain: string;
  questType: string;
  reward: {
    amount: number;
    currency: string;
    type: string;
  };
  participants: {
    current: number;
    max: number;
  };
  status: string;
}

export default function LiveQuestList() {
  const [quests, setQuests] = useState<Quest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLiveQuests();
  }, []);

  const fetchLiveQuests = async () => {
    try {
      const response = await fetch('/api/campaigns/live');
      const data = await response.json();
      setQuests(data.campaigns);
    } catch (error) {
      console.error('Failed to fetch quests:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="quest-container">
      <h2 className="text-2xl font-bold mb-6">지금 참여할 수 있는 퀘스트</h2>

      <div className="quest-header flex items-center px-4 py-3 bg-gray-50 rounded-lg mb-4">
        <span className="live-indicator text-green-500 mr-2">● Live</span>
      </div>

      <div className="space-y-4">
        {quests.map((quest) => (
          <QuestCard key={quest.id} quest={quest} />
        ))}
      </div>

      <button className="w-full mt-6 py-3 border rounded-lg">
        전체 퀘스트 보기
      </button>
    </div>
  );
}

function QuestCard({ quest }: { quest: Quest }) {
  const getStatusColor = (status: string) => {
    return status === 'LIVE' ? 'text-green-500' : 'text-orange-500';
  };

  const getStatusText = (status: string) => {
    return status === 'LIVE' ? '진행중' : '모집중';
  };

  return (
    <div className="flex items-center p-4 bg-white rounded-lg border hover:shadow-md transition">
      <div className="w-12 h-12 rounded-lg bg-blue-500 flex items-center justify-center text-white font-bold mr-4">
        {quest.projectIcon || quest.projectName.substring(0, 2).toUpperCase()}
      </div>

      <div className="flex-1">
        <h3 className="font-semibold">{quest.projectName}</h3>
        <p className="text-sm text-gray-500">{quest.chain}</p>
      </div>

      <div className="flex-1 px-4">
        <p className="text-sm">{quest.questType}</p>
      </div>

      <div className="flex-1 px-4">
        <p className="text-sm font-medium">
          {quest.reward.amount} {quest.reward.currency}
          {quest.reward.type && ` + ${quest.reward.type}`}
        </p>
      </div>

      <div className="flex-1 px-4">
        <p className="text-sm">
          {quest.participants.current} / {quest.participants.max}
        </p>
      </div>

      <div className="px-4">
        <span className={`text-sm font-medium ${getStatusColor(quest.status)}`}>
          ● {getStatusText(quest.status)}
        </span>
      </div>
    </div>
  );
}
