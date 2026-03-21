import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export function useAgentResults(onResults: (nodeType: string, results: any[]) => void) {
  useEffect(() => {
    console.log('📡 Subscribing to agent results...');

    // Subscribe to agent_results table (triggered when Python agent writes results)
    const channel = supabase
      .channel('agent-results')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'agent_results',
        },
        (payload) => {
          console.log('🎉 Agent results received:', payload);

          const result = payload.new as any;
          const nodeType = result.node_type;
          const results = result.results;

          // Call the callback with results
          onResults(nodeType, results);
        }
      )
      .subscribe((status) => {
        console.log('Subscription status:', status);
      });

    // Cleanup
    return () => {
      console.log('📡 Unsubscribing from agent results');
      supabase.removeChannel(channel);
    };
  }, [onResults]);
}
