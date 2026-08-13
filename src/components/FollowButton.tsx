"use client";

import { useState } from "react";

export function FollowButton({ styles }: { styles: Record<string, string> }) {
  const [following, setFollowing] = useState(false);

  return following ? (
    <button className={styles.btnFollowing} onClick={() => setFollowing(false)}>
      Following
    </button>
  ) : (
    <button className={styles.btnFollow} onClick={() => setFollowing(true)}>
      Follow
    </button>
  );
}
