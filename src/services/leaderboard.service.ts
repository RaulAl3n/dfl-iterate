import { getLeaderboardData,setLeaderboardData } from '@/test-utils/leaderboard.dummy';
import { simulateNetworkDelay } from '@/services/activities.service';
import type { LeaderboardEntry } from '@/types/LeaderboardEntry';

const DEFAULT_XP = 25;

function recalculateRanks(entries: LeaderboardEntry[]): LeaderboardEntry[] {
    const sortedByXp = [...entries].sort((a, b) => b.totalXp - a.totalXp);

    const withNewRanks = sortedByXp.map((entry, index) => ({
        ...entry, rank: index + 1,
    }));

    return withNewRanks;
}

export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
    await simulateNetworkDelay();
    return getLeaderboardData();
}

export async function claimLeaderBoardPractice(amount: number = DEFAULT_XP): Promise<LeaderboardEntry[]> {
    await simulateNetworkDelay();

    if(amount <= 0) {
        throw new Error('Invalid practice XP amount: ${amount}');
    }

    const current = getLeaderboardData();
    const me = current.find((entry) => entry.isCurrentUser);
    if(!me){
        throw new Error('Current user not found in leaderboard data');
    }

    const withUpdatedXp = current.map((entry) => {
        if(!entry.isCurrentUser) {
            return entry;
        }

        return {
            ...entry,
            totalXp: entry.totalXp + amount,
        };
    });

    const next = recalculateRanks(withUpdatedXp);
    setLeaderboardData(next);
    
    return getLeaderboardData();
}