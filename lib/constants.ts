// Physics tuning constants for the drift effect
export const PHYSICS_CONSTANTS = {
  SPRING_STRENGTH: 0.003,       // How strongly connected nodes attract
  SPRING_LENGTH: 160,           // Target distance between connected nodes
  REPULSION: 700,               // How strongly all nodes repel each other
  REPULSION_RADIUS: 500,        // Max distance for repulsion force
  DAMPING: 0.92,                // Velocity decay factor (higher = less friction)
  MAX_VELOCITY: 8,              // Clamp max speed
  SETTLE_THRESHOLD: 0.1,        // Physics pauses below this velocity
  GRAVITY: 0.0001,              // Gentle pull toward center
};

// Node styling by type (warm neutral palette)
export const NODE_STYLES: Record<string, {
  bg: string;
  border: string;
  glow: string;
  text: string;
  icon?: string;
}> = {
  thought: {
    bg: 'bg-[#F2EFE9]',
    border: 'border-[#CFCBC3]',
    glow: 'shadow-[0_2px_12px_rgba(0,0,0,0.08)]',
    text: 'text-[#1A1A1A]',
  },
  ai_idea: {
    bg: 'bg-[#FBF5E6]',
    border: 'border-[#D4A857]/50',
    glow: 'shadow-[0_2px_12px_rgba(212,168,87,0.15)]',
    text: 'text-[#1A1A1A]',
  },
  research: {
    bg: 'bg-[#EEF1F5]',
    border: 'border-[#B8C4D4]/60',
    glow: 'shadow-[0_2px_12px_rgba(0,0,0,0.07)]',
    text: 'text-[#1A1A1A]',
    icon: '🔍',
  },
  document: {
    bg: 'bg-[#EEF4EF]',
    border: 'border-[#A8C4AA]/60',
    glow: 'shadow-[0_2px_12px_rgba(0,0,0,0.07)]',
    text: 'text-[#1A1A1A]',
    icon: '📝',
  },
  mockup: {
    bg: 'bg-[#F5F0E8]',
    border: 'border-[#D4A857]/40',
    glow: 'shadow-[0_2px_12px_rgba(212,168,87,0.1)]',
    text: 'text-[#1A1A1A]',
    icon: '🎨',
  },
};

// Animation durations
export const ANIMATIONS = {
  NODE_FADE_IN: 300,
  CONNECTION_DRAW: 500,
  CLUSTER_LABEL_FADE: 400,
  PANEL_SLIDE: 250,
};
