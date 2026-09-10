/**
 * Terms of Service.
 *
 * Written against what this platform actually does — issue non-accredited
 * certificates, pay real money out of a rewards wallet, surface third-party
 * job listings, and generate study material with AI. Each of those carries a
 * promise worth being careful about, so each has its own clause rather than
 * being swept under a generic "as is".
 */
import LegalShell, { Bullets, Section, COMPANY } from './legalShell';

export default function Terms() {
  return (
    <LegalShell
      title="Terms of Service"
      updated={COMPANY.effectiveDate}
      intro={`These terms are the agreement between you and ${COMPANY.legalName} for using YATICORP Learning. By signing in with an activation card, you accept them. If you are under 18, a parent, guardian or your school must accept them on your behalf.`}
    >
      <Section id="who" title="Who can use YATICORP">
        <p>
          Access is by an activation card issued to you or to your institution. You may not share your card,
          your password or your account with anyone else, and you are responsible for what happens under your
          account. Tell us at once if you think someone else has access to it.
        </p>
        <p>
          If you are a minor, your parent, guardian or school must agree to these terms and to our{' '}
          <a className="font-semibold text-indigo-600 hover:underline" href="/privacy">Privacy Policy</a> for you.
        </p>
      </Section>

      <Section id="use" title="How you may use it">
        <p>Course material, lessons, videos and generated study content are licensed to you for your own
        learning. You may not:</p>
        <Bullets
          items={[
            'Copy, download, record, resell or redistribute course content, including videos.',
            'Share your account or let anyone else study on it.',
            'Automate, scrape or attempt to break, overload or bypass any part of the platform.',
            'Cheat at quizzes, games or anything else that earns XP or rewards.',
            'Post anything unlawful, abusive, harassing or misleading in the community.',
            'Upload a certificate, resume or document that is not genuinely yours.'
          ]}
        />
      </Section>

      <Section id="certificates" title="Certificates">
        <p>
          Certificates issued here record that you completed a course on this platform. They are not a degree,
          diploma or accredited qualification, and we make no promise that any employer or institution will
          recognise them. We may withdraw a certificate obtained by cheating or by misrepresenting who you are.
        </p>
      </Section>

      <Section id="rewards" title="XP, rewards and withdrawals">
        <p>
          XP, streaks and badges are a record of your activity on this platform and have no monetary value in
          themselves. Where a reward balance can be withdrawn, it is paid in Indian rupees to the UPI ID or
          bank account you supply, subject to any minimum, limit and verification we apply at the time.
        </p>
        <Bullets
          items={[
            'You must supply accurate payout details. We are not responsible for money sent to a wrong account you gave us.',
            'We may withhold, reverse or cancel a balance earned through cheating, automation, duplicate accounts or any other abuse.',
            'We may change how rewards are earned, and the rates, at any time. Changes are not retrospective for a withdrawal already approved.',
            'Taxes on anything you receive are yours to handle.'
          ]}
        />
      </Section>

      <Section id="jobs" title="Jobs and scholarships">
        <p>
          Job and scholarship listings come from third-party sources and from public company pages. We do not
          verify every employer, listing or deadline, we are not your agent or recruiter, and we do not promise
          you an interview, a job, an internship or an award. Check anything important with the employer or
          awarding body directly, and never pay a fee to anyone who claims to represent us.
        </p>
      </Section>

      <Section id="ai" title="AI-generated content">
        <p>
          Roadmaps, daily plans, lesson material, mentor replies, resume analysis and job matches are generated
          by AI and can be wrong, incomplete or out of date. They are study aids. They are not career, academic,
          legal, medical or financial advice, and decisions you take on them are your own.
        </p>
      </Section>

      <Section id="google" title="Connecting other accounts">
        <p>
          Connecting your Google account is optional. What we do with that access is described in the{' '}
          <a className="font-semibold text-indigo-600 hover:underline" href="/privacy">Privacy Policy</a>, and
          you can disconnect at any time from Career Path → Calendar. Your use of Google's own services stays
          governed by Google's terms, not ours.
        </p>
      </Section>

      <Section id="availability" title="Availability and changes">
        <p>
          We may change, suspend or remove features, courses or content, and we may take the platform down for
          maintenance. We try to give notice of anything significant, but we cannot promise the service will
          always be available or uninterrupted.
        </p>
      </Section>

      <Section id="ending" title="Suspension and closing your account">
        <p>
          We may suspend or close an account that breaks these terms, that is used fraudulently, or where the
          activation card behind it has been withdrawn by the institution that issued it. You can ask us to
          close your account at any time. Closing an account ends access to courses and to any unredeemed
          reward balance obtained in breach of these terms.
        </p>
      </Section>

      <Section id="liability" title="Our responsibility">
        <p>
          We provide the platform with reasonable care, but to the extent the law allows we are not liable for
          indirect or consequential loss, for lost opportunities, or for anything arising from a third-party
          listing, an AI-generated answer, or your reliance on a certificate. Nothing here limits liability
          that cannot lawfully be limited.
        </p>
      </Section>

      <Section id="law" title="Governing law">
        <p>
          These terms are governed by the laws of India, and the courts at {COMPANY.jurisdiction} have
          exclusive jurisdiction over any dispute.
        </p>
      </Section>

      <Section id="changes" title="Changes to these terms">
        <p>
          We may update these terms. The date at the top shows when they last changed, and continuing to use
          YATICORP after a change means you accept the updated terms.
        </p>
      </Section>
    </LegalShell>
  );
}
