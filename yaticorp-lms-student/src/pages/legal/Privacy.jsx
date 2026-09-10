/**
 * Privacy Policy.
 *
 * Written from what the code actually does, not from a template: every
 * category below corresponds to something this system really stores or really
 * sends somewhere. If a feature changes, this page is part of the change.
 *
 * The Google section is the one Google's OAuth reviewer reads. It has to name
 * the scopes, say what is done with the data, and carry the Limited Use
 * sentence, or verification is refused.
 */
import LegalShell, { Bullets, Section, COMPANY } from './legalShell';

export default function Privacy() {
  return (
    <LegalShell
      title="Privacy Policy"
      updated={COMPANY.effectiveDate}
      intro={`This policy explains what ${COMPANY.legalName} collects when you use YATICORP Learning, why, who else sees it, and what you can ask us to do about it. It covers the student app, the Career Path and Jobs sections, and the optional connection to your Google account.`}
    >
      <Section id="who" title="Who we are">
        <p>
          YATICORP Learning is operated by {COMPANY.legalName}, {COMPANY.address}. For anything in this
          policy, write to <a className="font-semibold text-indigo-600 hover:underline" href={`mailto:${COMPANY.privacyEmail}`}>{COMPANY.privacyEmail}</a>.
          Our grievance officer is {COMPANY.grievanceOfficer}.
        </p>
      </Section>

      <Section id="collect" title="What we collect">
        <p><strong className="text-slate-800">Your account.</strong> Name, email address, phone number, the
        activation card number and serial we issued you, a password (stored only as a salted hash, never
        readable by us), a profile picture if you upload one, and your institution and class if you tell us.</p>

        <p><strong className="text-slate-800">Your learning.</strong> Courses you enrol in, lessons completed,
        quiz answers and scores, certificates issued to you, XP, level, streaks, sign-in counts and the daily
        study time you set.</p>

        <p><strong className="text-slate-800">Career Path.</strong> The career goal you choose, the roadmap
        generated for it, daily tasks, exam and assignment dates you add to your calendar, your timetable,
        skills progress, badges, game scores, and your messages to the AI mentor.</p>

        <p><strong className="text-slate-800">Jobs.</strong> Any resume you upload and the skills read out of
        it, roles and searches you run, jobs you save, and — if you go through job access verification — your
        phone number for a one-time code and the LinkedIn profile URL you provide. If you allow it, an
        approximate location is derived from your device or IP address to sort jobs by distance. We do not
        store precise GPS coordinates as a location history.</p>

        <p><strong className="text-slate-800">Rewards and payouts.</strong> XP and reward transactions, wallet
        balance, and — only if you request a withdrawal — the UPI ID or bank account details you give us to
        pay you.</p>

        <p><strong className="text-slate-800">Support and community.</strong> Support tickets you raise and
        posts or comments you make in the community.</p>

        <p><strong className="text-slate-800">Technical.</strong> Ordinary server logs, and the browser
        storage this site needs to keep you signed in.</p>
      </Section>

      <Section id="google" title="Your Google account, if you connect one">
        <p>
          Connecting Google is optional and everything else works without it. If you do connect it, we ask for
          exactly these permissions and nothing wider:
        </p>
        <Bullets
          items={[
            <><code className="rounded bg-slate-100 px-1 py-0.5 text-xs">openid</code> and <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">email</code> — so the settings page can show you which account is linked. We store your Google email address for that, and nothing else about your Google profile.</>,
            <><code className="rounded bg-slate-100 px-1 py-0.5 text-xs">drive.file</code> — lets us create files in your Google Drive and see only the files this app itself created. We use it to put copies of your certificates, resumes, badges and learning bio into a single folder called “YATICORP Learning”. We cannot see, list or open anything else in your Drive.</>,
            <><code className="rounded bg-slate-100 px-1 py-0.5 text-xs">calendar.app.created</code> — lets us create our own calendar in your Google Calendar and manage events on it. We use it to copy the exam dates, deadlines and holidays you enter here onto a calendar called “YATICORP Learning”. We cannot read or change your personal, work, family or school calendars.</>
          ]}
        />
        <p>
          The copying is one-way, from YATICORP to Google. We never read your Drive files or your calendars
          back into this site. The access token that lets us do this is encrypted before it is stored and is
          never sent to your browser.
        </p>
        <p>
          You can disconnect at any time in <strong className="text-slate-800">Career Path → Calendar</strong>,
          or from your Google Account's security settings. Disconnecting revokes our access at Google, deletes
          our stored token, and removes the calendar we created. Files we placed in your Drive stay there,
          because they are yours.
        </p>
        <p className="rounded-xl border border-slate-200 bg-white p-4">
          <strong className="text-slate-800">Limited Use.</strong> YATICORP's use and transfer of information
          received from Google APIs to any other app adheres to the{' '}
          <a
            className="font-semibold text-indigo-600 hover:underline"
            href="https://developers.google.com/terms/api-services-user-data-policy"
            target="_blank"
            rel="noreferrer noopener"
          >
            Google API Services User Data Policy
          </a>
          , including the Limited Use requirements. We do not use Google user data for advertising, we do not
          sell it, we do not transfer it except as needed to provide the features described above, and we do
          not allow humans to read it except with your explicit consent, for security purposes, to comply with
          law, or where the data is aggregated and anonymised.
        </p>
      </Section>

      <Section id="why" title="Why we use it">
        <Bullets
          items={[
            'To run your account, sign you in and keep it secure.',
            'To deliver courses, track progress and issue certificates.',
            'To generate your roadmap, daily plan, lessons and mentor replies.',
            'To match you to jobs and scholarships, and to verify job access where required.',
            'To award XP and rewards and to pay out withdrawals you request.',
            'To email you about your account, and to answer your support tickets.',
            'To keep the platform safe — spotting abuse, fraud and cheating.'
          ]}
        />
      </Section>

      <Section id="ai" title="AI features">
        <p>
          Roadmaps, lessons, mentor replies, resume reading and job matching are produced using Google's Gemini
          models. The content needed for the task — for example your goal and progress, or the text of a resume
          you uploaded — is sent to that service to generate a response. Do not put anything into the mentor
          chat that you would not want processed this way. AI output can be wrong; it is a study aid, not
          professional, legal, medical or financial advice.
        </p>
      </Section>

      <Section id="sharing" title="Who else sees your data">
        <p>We do not sell your personal data. We share it only with services that make the platform work:</p>
        <Bullets
          items={[
            'Google — Gemini for AI features; YouTube for lesson videos; Drive and Calendar only if you connect your account.',
            'Cloudinary, Bunny and VdoCipher — for storing and delivering images, files and protected course video.',
            'Brevo — for transactional email such as sign-in and account notices.',
            'Twilio or MSG91 — to send the one-time code during job access verification.',
            'Adzuna, Greenhouse, Lever, Ashby and SmartRecruiters — job listing sources we query on your behalf.',
            'ipapi and BigDataCloud — to turn an IP address or coordinates into an approximate area for job distance.',
            'Our hosting and database providers.',
            'Authorities, where the law requires it.'
          ]}
        />
        <p>
          Your name, avatar and score appear on leaderboards and anything you post in the community is visible
          to other students. Nothing else is shown to other users.
        </p>
      </Section>

      <Section id="children" title="Students under 18">
        <p>
          This platform is used by school students, including children. Where the law requires it — in India,
          the Digital Personal Data Protection Act, 2023 — a child's account must be opened with the consent of
          a parent or guardian, and we rely on the school or institution that issues the activation card to
          have obtained it. We do not knowingly show behavioural advertising to children or track them for
          advertising. A parent or guardian may write to us to see, correct or delete their child's data.
        </p>
      </Section>

      <Section id="keep" title="How long we keep it">
        <p>
          Account and learning records are kept while your account is open, so your progress and certificates
          remain available to you. Payout records are kept as long as tax and accounting rules require.
          Server logs are kept for a short period for security. When an account is deleted we remove or
          anonymise the personal data we hold, except where we must keep it by law.
        </p>
      </Section>

      <Section id="security" title="How we protect it">
        <p>
          Passwords are stored as salted hashes. Tokens for connected accounts, and the sensitive values used
          in verification, are encrypted with AES-256-GCM before they are written and are never returned to
          the browser. Access to production data is limited to staff who need it. No system is perfectly
          secure, and we will tell you if a breach affects you.
        </p>
      </Section>

      <Section id="rights" title="Your rights">
        <p>You can ask us to:</p>
        <Bullets
          items={[
            'Show you the personal data we hold about you.',
            'Correct anything that is wrong.',
            'Delete your account and the data with it.',
            'Withdraw a consent you gave — for example by disconnecting Google.',
            'Nominate someone to exercise these rights if you cannot.'
          ]}
        />
        <p>
          Write to <a className="font-semibold text-indigo-600 hover:underline" href={`mailto:${COMPANY.privacyEmail}`}>{COMPANY.privacyEmail}</a>.
          If you are not satisfied with our answer, you may complain to the Data Protection Board of India.
        </p>
      </Section>

      <Section id="changes" title="Changes">
        <p>
          If we change this policy we will update the date at the top, and tell you in the app when the change
          is significant. Continuing to use YATICORP after a change means you accept the updated policy.
        </p>
      </Section>
    </LegalShell>
  );
}
