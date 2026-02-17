import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { projectName, category, chain, startDate, endDate, goals, reward } = req.body;

    const campaign = await createCampaign({
      projectName,
      category,
      chain,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      goals,
      reward,
      status: 'LIVE',
      participants: {
        current: 0,
        max: reward.maxParticipants || 500
      }
    });

    return res.status(201).json({
      success: true,
      campaignId: campaign.id
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to create campaign' });
  }
}

async function createCampaign(data: any) {
  // TODO: DB 연동 (Prisma, MongoDB 등)
  const campaign = {
    id: crypto.randomUUID(),
    ...data,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  return campaign;
}
