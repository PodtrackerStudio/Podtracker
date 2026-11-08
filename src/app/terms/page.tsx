import type { Metadata } from "next";
import Link from "next/link";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import styles from "./legal.module.css";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The rules for using Podtracker — your account, your reviews, and what we can and can't do.",
  alternates: { canonical: "/terms" },
};

/**
 * Terms of Service.
 *
 * **This is a drafted starting point, not legal advice.** No lawyer has read it.
 *
 * The three `TODO` fields it shipped with were answered by Sasha on 2026-11-04
 * and are filled in below: the operator is **Alexander Knysh as an individual**
 * — there is no company — based in **Michigan, USA**, and **Michigan law**
 * governs. If an LLC is ever formed, section 1 and section 14 both change.
 *
 * **Everything here now describes the site as it actually is.** Two things did
 * not, and both were fixed on 2026-11-07:
 *   - §10 said a Privacy Policy "is being prepared". It now links `/privacy`,
 *     which exists on this branch.
 *   - §10 said you could only *ask* to have your account deleted. Self-serve
 *     deletion was built the same day, so the stronger wording is back.
 *
 * Both documents are waiting on the same review — see
 * `docs/privacy-policy-review.md`.
 *
 * Written against what the site actually does rather than a template: accounts
 * through Supabase, user-written reviews and lists, podcast metadata and
 * artwork pulled from Apple and from public RSS feeds, and real money taken
 * through Stripe on `/donate`. The last of those is why this matters now —
 * taking payments raises the stakes on having terms at all.
 *
 * The date below is the effective date and must be bumped whenever the terms
 * change materially.
 */

const LAST_UPDATED = "3 November 2026";

export default function TermsPage() {
  return (
    <>
      <SiteNav />
      <main className={styles.main}>
        <h1>Terms of Service</h1>
        <p className={styles.updated}>Last updated: {LAST_UPDATED}</p>

        <div className={styles.summary}>
          <h2>The short version</h2>
          <ul>
            <li>Be honest in your reviews. Don&apos;t post things you don&apos;t mean.</li>
            <li>What you write stays yours. We just need permission to show it on the site.</li>
            <li>Don&apos;t harass people, spam, or pretend to be someone you&apos;re not.</li>
            <li>Donations are gifts. They don&apos;t buy anything, and they aren&apos;t refundable.</li>
            <li>You can delete your account whenever you like, and your content goes with it.</li>
            <li>Podtracker is small and new. It may break. Please don&apos;t rely on it for anything important.</li>
          </ul>
          <p>
            This summary is here so you actually know what you&apos;re agreeing to. The full terms
            below are what count if the two ever disagree.
          </p>
        </div>

        <h2>1. Who we are</h2>
        <p>
          Podtracker is a site for logging, rating and reviewing podcasts, at podtracker.studio. It
          is operated by Alexander Knysh, an individual based in Michigan, USA (&ldquo;we&rdquo;,
          &ldquo;us&rdquo;). You can reach us at{" "}
          <a href="mailto:podtracker13@gmail.com">podtracker13@gmail.com</a>.
        </p>
        <p>
          By creating an account or using the site, you agree to these terms. If you don&apos;t
          agree, please don&apos;t use Podtracker.
        </p>

        <h2>2. Who can use Podtracker</h2>
        <p>
          You must be at least 13 years old to have an account. If you are in the United Kingdom or
          the European Economic Area, you must be at least 16, or have permission from a parent or
          guardian.
        </p>
        <p>
          We don&apos;t knowingly collect information from children under those ages. If you believe
          a child has created an account, email us and we will delete it.
        </p>

        <h2>3. Your account</h2>
        <p>
          You need an email address you control to sign up, and you&apos;ll need to confirm it
          before the account works. Keep your password to yourself — you are responsible for what
          happens under your account.
        </p>
        <p>
          Tell us promptly if you think someone else has got into it. You can close your account at
          any time, and we may close or suspend an account that breaks these terms.
        </p>

        <h2>4. What you post</h2>
        <p>
          Reviews, ratings, lists, comments and your listening diary are yours. You keep ownership
          of everything you write.
        </p>
        <p>
          You give us permission to store your content, show it to other people on Podtracker, and
          include it in parts of the site that rank or summarise what the community thinks — for
          example a show&apos;s average rating or a list of popular reviews. That permission lasts
          as long as you keep the content on the site, and ends when you delete it, except for
          copies already in routine backups.
        </p>
        <p>By posting, you confirm that it&apos;s yours to post and that it doesn&apos;t break anyone else&apos;s rights.</p>

        <h2>5. Things you may not do</h2>
        <ul>
          <li>Post reviews you don&apos;t mean, including paid, fake or traded reviews.</li>
          <li>Run more than one account to push a rating up or down.</li>
          <li>Harass, threaten or abuse anyone, or post hateful content.</li>
          <li>Impersonate another person, a podcast, or a company.</li>
          <li>Post anything unlawful, or anything that infringes someone&apos;s copyright.</li>
          <li>Scrape the site, or use bots or automated tools against it, without our written permission.</li>
          <li>Try to break, overload, or get around the security of the site.</li>
        </ul>

        <h2>6. Moderation</h2>
        <p>
          We may remove content that breaks these terms, and we may suspend or close accounts that
          repeatedly do. Where we reasonably can, we&apos;ll tell you why.
        </p>
        <p>
          We don&apos;t check everything before it appears. Reviews are the opinions of the people
          who wrote them, not ours.
        </p>

        <h2>7. Podcast information on the site</h2>
        <p>
          Show and episode details — titles, descriptions, artwork, publication dates — come from
          Apple&apos;s public podcast charts and from podcasts&apos; own public RSS feeds. We
          display that information to help people find and discuss shows.
        </p>
        <p>
          Podtracker is not affiliated with, endorsed by, or sponsored by any podcast, network,
          host, or platform shown on the site. Trade marks and artwork belong to their owners.
        </p>
        <p>
          If you own a show and want its information removed from Podtracker, email us and we will
          take it down.
        </p>

        <h2>8. Copyright complaints</h2>
        <p>
          If you believe something on Podtracker infringes your copyright, email{" "}
          <a href="mailto:podtracker13@gmail.com">podtracker13@gmail.com</a> with enough detail to
          identify the work and where it appears on the site, and a way to contact you. We will
          review it and remove anything that shouldn&apos;t be there.
        </p>

        <h2>9. Donations</h2>
        <p>
          Donations made on <Link href="/donate">our donate page</Link> are voluntary gifts that
          help cover running costs. They are not a purchase. They do not buy a subscription,
          features, priority, or any goods or services, and they do not change how your reviews or
          ratings are treated.
        </p>
        <p>
          Payments are handled by Stripe. We never see or store your card details. Because nothing
          is being sold, donations are <strong>not refundable</strong> — but if you donated by
          mistake or something went wrong, email us within 30 days and we&apos;ll sort it out.
        </p>
        <p>Donations are not tax-deductible. Podtracker is not a registered charity.</p>

        <h2>10. Your data</h2>
        <p>
          We collect what the site needs to work: your email address, your username, and what you
          create on Podtracker. We do not sell it. Our{" "}
          <Link href="/privacy">Privacy Policy</Link> sets out exactly what we collect, who it goes
          to and how long we keep it. Anything it doesn&apos;t answer, write to us at{" "}
          <a href="mailto:podtracker13@gmail.com">podtracker13@gmail.com</a> and we will.
        </p>
        <p>
          {/* Restored 2026-11-07, when DELETE /api/account was built. Between
              2026-11-04 and then this said to email us, because there was no
              self-serve deletion and a written promise we could not keep was
              worse than no promise. */}
          You can delete your account at any time from{" "}
          <Link href="/settings">your settings</Link>. Your profile, ratings, reviews, lists and
          diary entries go with it, immediately. If anything goes wrong, email us and we&apos;ll
          finish it off.
        </p>

        <h2>11. The site is provided as it is</h2>
        <p>
          Podtracker is new, small, and run by a couple of people. It is provided
          &ldquo;as is&rdquo;, without warranties of any kind. We don&apos;t promise it will always
          be available, that it will be free of errors, or that podcast information shown on it is
          accurate or complete — much of that comes from other people&apos;s feeds.
        </p>
        <p>Please don&apos;t rely on Podtracker as the only place your listening history is stored.</p>

        <h2>12. Limitation of liability</h2>
        <p>
          To the extent the law allows, we are not liable for indirect or consequential losses, lost
          data, or lost profits arising from your use of Podtracker. Where liability cannot be
          excluded, it is limited to the greater of the amount you have paid us in the past twelve
          months, or US$50.
        </p>
        <p>
          Nothing here limits liability for death or personal injury caused by negligence, for
          fraud, or for anything else that cannot lawfully be limited.
        </p>

        <h2>13. Changes to these terms</h2>
        <p>
          We may update these terms as the site changes. If a change matters, we&apos;ll say so on
          the site or by email before it takes effect. Carrying on using Podtracker after that means
          you accept the new terms.
        </p>

        <h2>14. Governing law</h2>
        <p>
          These terms are governed by the laws of the State of Michigan, USA, and disputes will be
          dealt with by the courts there. If you are a consumer, this
          doesn&apos;t take away rights you have under the law of the country you live in.
        </p>

        <div className={styles.contact}>
          <h2>Getting in touch</h2>
          <p>
            Questions about any of this go to{" "}
            <a href="mailto:podtracker13@gmail.com">podtracker13@gmail.com</a>. We read everything.
          </p>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
