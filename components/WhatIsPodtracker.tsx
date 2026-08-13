import { SectionHeading } from "./SectionHeading";

/**
 * Frame 3. The two lower cards were empty in the Figma export; their copy
 * shipped as separate PNGs in the same archive and is filled in here.
 */

const PITCH =
  "We are a social platform dedicated to providing a community for podcast " +
  "listeners to track and organize their listening activity and share their " +
  "recommendations on what they've been listening to with other users.";

const FEATURES = [
  "Rate episodes and allow other users to know whether a show or episode is worth watching or a skip.",
  "Create lists to organize episodes or shows based on your own selected categories.",
  "Follow accounts and discover new podcasts in the process.",
  "Write reviews for episodes and share your thoughts to the world.",
];

export function WhatIsPodtracker() {
  return (
    <section className="px-6 py-16">
      <SectionHeading>What is Podtracker?</SectionHeading>

      <p className="mx-auto mt-10 max-w-2xl bg-panel px-6 py-8 text-lg leading-relaxed">
        {PITCH}
      </p>

      <ul className="mx-auto mt-14 grid max-w-5xl gap-8 sm:grid-cols-2">
        {FEATURES.map((feature) => (
          <li
            key={feature}
            className="flex items-center rounded-2xl bg-panel px-6 py-6 text-lg leading-snug"
          >
            {feature}
          </li>
        ))}
      </ul>
    </section>
  );
}
