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
 * governs. If an LLC is ever formed, section 1 and section 15 both change.
 *
 * **Everything here now describes the site as it actually is.** Two things did
 * not, and both were fixed on 2026-11-07:
 *   - §10 said a Privacy Policy "is being prepared". It now links `/privacy`,
 *     which exists on this branch.
 *   - §10 said you could only *ask* to have your account deleted. Self-serve
 *     deletion was built the same day, so the stronger wording is back.
 *
 * ## Four clauses added 2026-11-08 — Claude's drafting, nobody's review
 *
 * Sasha nearly regenerated the whole document with Termly to get these, and
 * chose to keep Phillip's text and add to it instead. **So §8's expansion and
 * §§13, 15 and 16 were written by Claude.** They are plain-English versions of
 * standard clauses, not lawyer-drafted ones, and they are the least validated
 * text in either document — Termly's equivalents would at least have had an
 * attorney on the template. Flag them first in the review.
 *
 *   - **§8** grew from a "email us" paragraph into a real DMCA section: the
 *     six things a §512(c)(3) notice must contain, a counter-notice route, and
 *     a repeat-infringer policy. **The safe harbour this is written for does
 *     not exist until a designated agent is registered with the US Copyright
 *     Office** (dmca.copyright.gov, $6). Registering is the actual deliverable;
 *     the text alone buys nothing.
 *   - **§13** indemnification, scoped to claims arising from the user's own
 *     acts, with notice and defence carve-outs so it is not one-sided.
 *   - **§15** absorbed the old §14 and added a 30-day talk-to-us-first step.
 *     **Deliberately no arbitration clause and no class-action waiver** — that
 *     is a real decision with real trade-offs and belongs to a lawyer, not to
 *     a default. Raise it; don't add one quietly.
 *   - **§16** severability, entire agreement, no-waiver, assignment, survival.
 *
 * Renumbering: old §13 (changes) is now §14, old §14 (governing law) is now
 * §15. Nothing outside this file referenced those two numbers.
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

const LAST_UPDATED = "13 November 2026";

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
            {/* An indemnity is a real obligation on the reader, so it belongs
                in a summary whose whole point is "know what you're agreeing
                to". Leaving it only in §13 would make the summary flattering
                rather than honest. */}
            <li>
              If something you post lands us in a legal dispute, you cover the cost of it.
            </li>
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
          {/* One age everywhere. Changed 16 -> 13 on 2026-11-13 at Sasha's
              request, which is what the review memo recommended as the usual
              US floor. 16 had only ever been there because he asked for that
              number on the signup checkbox on 2026-11-04, not because anyone
              had decided it.

              KNOWN TRADE-OFF: a flat 13 drops the UK/EEA carve-out this
              section used to carry. GDPR's default age for consent to
              information society services is 16, and member states may lower
              it — the UK and Ireland differ, Germany is 16, France 15. For a
              US user base this is fine, and Sasha accepted it knowingly. If
              real EU users turn up, put the carve-out back.

              Changing it again means all four places: here, the two sentences
              below, the signup checkbox, and Privacy §12. */}
          You must be at least 13 years old to have an account.
        </p>
        <p>
          We don&apos;t knowingly collect information from anyone under 13. If you believe someone
          under 13 has created an account, email us and we will delete it.
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
        <p>
          {/* Two gaps the legal review found in this section: it never said
              that storing your content necessarily means our vendors hold it,
              and it never said what happens to a show's average once you
              delete a rating that fed into it. 2026-11-12. */}
          To store and show your content we necessarily pass it to the companies that run the site
          for us — our host and our database provider. They are named in our{" "}
          <Link href="/privacy">Privacy Policy</Link>, which also says what each of them does.
        </p>
        <p>
          If you delete a rating or review, it stops counting towards any average or ranking it fed
          into, and those figures are recalculated without it. What we cannot undo is the past: if
          someone read your review or saw a rating before you removed it, we have no way to reach
          back and change what they already saw.
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
          <a href="mailto:podtracker13@gmail.com">podtracker13@gmail.com</a>. We take these
          seriously and will remove anything that shouldn&apos;t be there.
        </p>
        <p>
          So that we can act on it, please include all of the following. This is what US copyright
          law (the DMCA, 17 U.S.C. §512) asks a notice to contain, and a notice missing any of it
          may take us longer to deal with:
        </p>
        <ul>
          <li>Your physical or electronic signature.</li>
          <li>Which work you say has been infringed.</li>
          <li>
            What on Podtracker you are complaining about, and where — a link to the exact page is
            best.
          </li>
          <li>Your name, address, telephone number and email address.</li>
          <li>
            A statement that you believe in good faith that the use isn&apos;t authorised by the
            copyright owner, its agent, or the law.
          </li>
          <li>
            A statement, <strong>under penalty of perjury</strong>, that the information in your
            notice is accurate and that you are the copyright owner or authorised to act for them.
          </li>
        </ul>
        <p>
          <strong>If we remove something of yours and you think we got it wrong</strong>, you can
          send a counter-notice to the same address. It needs your signature, what was removed and
          where it was, a statement under penalty of perjury that you believe it was removed by
          mistake or misidentification, and your name, address and telephone number. You will also
          need to agree to the jurisdiction of the federal court for your district — or, if you are
          outside the United States, any district where we may be found — and to accept service
          from the person who complained. If we receive a valid counter-notice, we may put the
          content back after 10 to 14 business days, unless they tell us they have gone to court.
        </p>
        <p>
          <strong>Repeat infringers.</strong> In appropriate circumstances we will close the
          accounts of people who infringe copyright repeatedly.
        </p>
        <p>
          Please don&apos;t send a notice about something you have no right to complain about.
          Under US law, knowingly misrepresenting that material is infringing can make you liable
          for the costs it causes.
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

        <h2>13. If what you do causes us a legal problem</h2>
        <p>
          {/* Narrowed 2026-11-12. This used to cover claims arising because
              "you broke these terms", which the legal review called broad and
              potentially overreaching for a consumer site — it would have
              covered, say, someone who used a second account. Now limited to
              claims arising from what the user actually posted or did to
              someone else. */}
          If someone brings a claim against us because of something you posted on Podtracker, or
          something you did to another person here, you agree to cover our reasonable costs in
          dealing with it, including legal fees.
        </p>
        <p>
          This only covers claims that actually come from what you did. If one arrives, we&apos;ll
          tell you promptly, we won&apos;t settle it in a way that costs you or admits fault on
          your behalf without asking you first, and you can take over defending it if you&apos;d
          rather.
        </p>

        <h2>14. Changes to these terms</h2>
        <p>
          We may update these terms as the site changes. If a change matters, we&apos;ll say so on
          the site or by email before it takes effect. Carrying on using Podtracker after that means
          you accept the new terms.
        </p>

        <h2>15. Governing law, and sorting out disagreements</h2>
        <p>
          <strong>Please talk to us first.</strong> If you have a problem with Podtracker, email{" "}
          <a href="mailto:podtracker13@gmail.com">podtracker13@gmail.com</a> and give us 30 days to
          put it right. Most things can be sorted out this way, and it is faster and cheaper for
          both of us than anything else on this page.
        </p>
        <p>
          {/* "the courts there" named no court, which the legal review flagged
              as too vague to be useful. Washtenaw County is where Ann Arbor
              is, and where the operator is based. If the operator moves, or an
              LLC is formed elsewhere, this changes with §1. 2026-11-12. */}
          If that doesn&apos;t work, these terms are governed by the laws of the State of Michigan,
          USA, and any dispute will be dealt with by the state or federal courts located in
          Washtenaw County, Michigan. If you are a consumer, this doesn&apos;t take away rights you
          have under the law of the country you live in, and it doesn&apos;t stop you bringing a
          claim in your local small claims court.
        </p>

        <h2>16. The rest</h2>
        <p>
          If any part of these terms turns out to be unenforceable, the rest of them still stand —
          that one part is treated as removed and everything else carries on.
        </p>
        <p>
          These terms, together with our <Link href="/privacy">Privacy Policy</Link>, are the whole
          agreement between you and us about Podtracker, and they replace anything said before.
        </p>
        <p>
          If we don&apos;t enforce something straight away, we haven&apos;t given up the right to
          enforce it later.
        </p>
        <p>
          You can&apos;t transfer your rights under these terms to someone else. We may transfer
          ours if Podtracker is sold or moves to another company, and if that happens we&apos;ll
          say so on the site beforehand.
        </p>
        <p>
          Sections 11, 12 and 13 — the as-is statement, the limit on our liability, and your
          agreement to cover claims your own actions cause — carry on applying after you close your
          account.
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
