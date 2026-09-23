import type { LeaderboardEntry } from '@/types/LeaderboardEntry';
import { supabase } from '@/lib/supabase';

const DEFAULT_XP = 50;

type LeaderboardEntryRow = {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  total_xp: number;
  rank: number;
  is_current_user: boolean;
};

function mapRowToEntry(row: LeaderboardEntryRow): LeaderboardEntry {
  return {
    userId: row.user_id,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    totalXp: row.total_xp,
    rank: row.rank,
    isCurrentUser: row.is_current_user,
  };
}

function recalculateRanks(entries: LeaderboardEntry[]): LeaderboardEntry[] {
    const sortedByXp = [...entries].sort((a, b) => b.totalXp - a.totalXp);

    const withNewRanks = sortedByXp.map((entry, index) => ({
        ...entry, rank: index + 1,
    }));

    return withNewRanks;
}

export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
    const { data, error } = await supabase
    .from('leaderboard_entries')
    .select('user_id, display_name, avatar_url, total_xp, rank, is_current_user')
    .order('total_xp', { ascending: false });

    if (error) {
    throw new Error(`Failed to load leaderboard: ${error.message}`);
  }

  if (!data) {
    throw new Error(`Leaderboard data not found`);
  }

  const entries = data.map(mapRowToEntry);
  return recalculateRanks(entries);
}

export async function claimLeaderBoardPractice(amount: number = DEFAULT_XP): Promise<LeaderboardEntry[]> {
    if(amount <= 0) {
        throw new Error(`Invalid practice XP amount: ${amount}`);
    }

    const { data: currentRow, error: fetchError } = await supabase
        .from('leaderboard_entries')
        .select('user_id, total_xp')
        .eq('is_current_user', true)
        .single();

    if (fetchError) {
        throw new Error(`Failed to load current user: ${fetchError.message}`);
    }

    if (!currentRow) {
        throw new Error(`Current user not found in leaderboard data`);
    }

    const { error: updateError } = await supabase
        .from('leaderboard_entries')
        .update({ total_xp: currentRow.total_xp + amount })
        .eq('user_id', currentRow.user_id);

    if (updateError) {
        throw new Error(`Failed to update XP: ${updateError.message}`);
    }

    return getLeaderboard();
}