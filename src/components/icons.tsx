export function LogoIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" />
    </svg>
  );
}

export function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  );
}

export function MicIcon() {
  return (
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 1C10.34 1 9 2.34 9 4v7c0 1.66 1.34 3 3 3s3-1.34 3-3V4c0-1.66-1.34-3-3-3zm-1 17.93V21h-2v2h6v-2h-2v-2.07A8.001 8.001 0 0020 12h-2a6 6 0 01-12 0H4a8.001 8.001 0 007 7.93z" />
    </svg>
  );
}

export function PlusIcon({ size = 16 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width={size} height={size}>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

export function ChevronLeftIcon({ size = 14 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width={size} height={size}>
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

export function ChevronDownIcon({ size = 20 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width={size} height={size}>
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

export function ChevronRightIcon({ size = 14 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width={size} height={size}>
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

export function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="white">
      <polygon points="5,3 19,12 5,21" />
    </svg>
  );
}

export function SpotifyIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#1DB954" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="12" fill="#1DB954" />
      <path
        d="M17.9 10.9C14.7 9 9.35 8.8 6.3 9.75c-.5.15-1-.15-1.15-.6-.15-.5.15-1 .6-1.15 3.55-1.05 9.4-.85 13.1 1.35.45.25.6.85.35 1.3-.25.35-.85.5-1.3.25zm-.1 2.8c-.25.35-.7.5-1.05.25-2.7-1.65-6.8-2.15-9.95-1.15-.4.1-.85-.1-.95-.5-.1-.4.1-.85.5-.95 3.65-1.1 8.15-.55 11.25 1.35.3.15.45.65.2 1zm-1.2 2.75c-.2.3-.55.4-.85.2-2.35-1.45-5.3-1.75-8.8-.95-.3.1-.65-.15-.75-.45s.15-.65.45-.75c3.8-.85 7.1-.5 9.7 1.1.35.15.4.55.25.85z"
        fill="white"
      />
    </svg>
  );
}

export function YouTubeIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <rect width="24" height="24" rx="5" fill="#FF0000" />
      <path
        d="M19.6 7.8s-.2-1.4-.8-2c-.75-.8-1.6-.8-2-.85C14.4 4.8 12 4.8 12 4.8s-2.4 0-4.8.15c-.4.05-1.25.05-2 .85-.6.6-.8 2-.8 2S4.2 9.4 4.2 11v1.5c0 1.6.2 3.2.2 3.2s.2 1.4.8 2c.75.8 1.75.75 2.2.85C8.8 18.7 12 18.7 12 18.7s2.4 0 4.8-.2c.4-.05 1.25-.05 2-.85.6-.6.8-2 .8-2s.2-1.6.2-3.2V11c0-1.6-.2-3.2-.2-3.2zM10.2 14.4V9.2l5.4 2.6-5.4 2.6z"
        fill="white"
      />
    </svg>
  );
}

export function ApplePodcastsIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <rect width="24" height="24" rx="5" fill="#9B54D0" />
      <path
        d="M12 3.5C7.3 3.5 3.5 7.3 3.5 12c0 4.1 2.8 7.5 6.6 8.4-.1-.8-.2-2 0-2.8.2-.7 1.3-5.6 1.3-5.6s-.3-.7-.3-1.7c0-1.6.9-2.8 2.1-2.8 1 0 1.5.7 1.5 1.6 0 1-.6 2.4-.9 3.8-.3 1.1.5 2 1.6 2 1.9 0 3.2-2.4 3.2-5.3 0-2.2-1.5-3.8-4.2-3.8-3 0-4.9 2.3-4.9 4.8 0 .9.3 1.5.7 2 .1.1.1.2.1.3-.1.3-.2.9-.2 1-.1.2-.2.3-.4.2C8.8 15.6 8 14 8 12.2c0-3.1 2.6-6.7 7.7-6.7 4.1 0 6.8 3 6.8 6.2 0 4.2-2.3 7.3-5.7 7.3-1.1 0-2.2-.6-2.6-1.3l-.7 2.8c-.3 1-1 2.2-1.4 2.9.6.2 1.3.3 2 .3 4.7 0 8.5-3.8 8.5-8.5 0-4.7-3.8-8.5-8.6-8.7z"
        fill="white"
      />
    </svg>
  );
}

/** Tick shown when something is already in your Next listening. */
export function CheckIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}
