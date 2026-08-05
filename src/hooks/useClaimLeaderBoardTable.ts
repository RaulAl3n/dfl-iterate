import { useMutation, useQueryClient } from '@tanstack/react-query';
import { claimLeaderBoardPractice } from '@/services/leaderboard.service';
import { queryKeys } from '@/lib/queryKeys';

export function useClaimLeaderBoardXP() {
    const queryClient = useQueryClient();
    
    return useMutation({
        mutationFn: (amount: number) => claimLeaderBoardPractice(amount),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.leaderboard.list() });
        },
    });
}