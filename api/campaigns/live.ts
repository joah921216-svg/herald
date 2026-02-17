import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const now = new Date();

    // TODO: DB 연동 시 Prisma 쿼리로 교체
    // 현재 진행중인 캠페인만 필터링
    // const liveCampaigns = await prisma.campaign.findMany({
    //   where: {
    //     status: 'LIVE',
    //     startDate: { lte: now },
    //     endDate: { gte: now },
    //   },
    //   orderBy: { createdAt: 'desc' }
    // });

    const liveCampaigns: any[] = [];

    return res.status(200).json({ campaigns: liveCampaigns });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch campaigns' });
  }
}
