/**
 * Where a roadmap is told to start climbing from.
 *
 * An MCA Year 2 student was handed a "Postgraduate Year 1: MCA Advanced
 * Specialisation" phase placed AFTER their own final year — a stage they were
 * two semesters from finishing, hedged in its own duration field as "already
 * completed or integrated into current 2-year structure". The prompt stated
 * the internship and postgraduate rules in an undergraduate's words ("you MUST
 * ALWAYS include postgraduate phases"), which contradicts Rule Zero, and the
 * model resolved the contradiction the wrong way round.
 *
 * Pure functions, so none of this spends a Gemini call.
 */
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { describeLadderRules, stripCompletedStages } = require('../../src/career/services/geminiService');

const pgStudent = {
  educationLevel: 'Postgraduate',
  degree: 'MCA',
  specialization: 'Computer Applications',
  currentYear: '2nd Year',
  semester: '4',
  careerGoal: 'Full Stack Developer'
};

describe('the ladder a student is told to climb', () => {
  test('a postgraduate is not sent back to start a postgraduate degree', () => {
    const rules = describeLadderRules(pgStudent);
    assert.match(rules, /DO NOT ADD ANY PHASE ABOUT STARTING OR COMPLETING A POSTGRADUATE DEGREE/);
    assert.match(rules, /already in one/i);
    // The instruction that caused it must not reach this student at all.
    assert.doesNotMatch(rules, /MUST ALWAYS include postgraduate phases/);
  });

  test('a postgraduate still gets an internship phase, at their own level', () => {
    const rules = describeLadderRules(pgStudent);
    assert.match(rules, /Internships & Industry Experience/);
    // ...but not one hung off an undergraduate year they finished years ago.
    assert.doesNotMatch(rules, /Immediately AFTER the final undergraduate year/);
  });

  test('a doctorate stays available to a research-minded postgraduate', () => {
    assert.match(describeLadderRules(pgStudent), /DOCTORAL \(PhD\) phase/);
  });

  test('an undergraduate is still told to climb the whole ladder', () => {
    const rules = describeLadderRules({
      educationLevel: 'Undergraduate', degree: 'BCA', currentYear: '2nd Year', careerGoal: 'Frontend Developer'
    });
    assert.match(rules, /MUST ALWAYS include postgraduate phases/);
    assert.match(rules, /Immediately AFTER the final undergraduate year/);
  });

  test('a working professional is sent back to no classroom at all', () => {
    const rules = describeLadderRules({
      educationLevel: 'Working Professional', currentJob: 'QA Engineer', careerGoal: 'Engineering Manager'
    });
    assert.match(rules, /ALREADY WORKING/);
    assert.doesNotMatch(rules, /MUST ALWAYS include postgraduate phases/);
  });
});

describe('stages the student has already finished', () => {
  test("drops a postgraduate-entry phase from a postgraduate's roadmap", () => {
    const roadmap = {
      educationRoadmap: [
        { phase: 'MCA Year 2 / Final Year (Semester 4)' },
        { phase: 'Internships & Industry Experience' },
        { phase: 'Postgraduate Year 1: MCA Advanced Specialisation & Research' },
        { phase: 'Job Applications & Placement Preparation' }
      ]
    };
    stripCompletedStages(roadmap, pgStudent);
    assert.deepEqual(
      roadmap.educationRoadmap.map((p) => p.phase),
      ['MCA Year 2 / Final Year (Semester 4)', 'Internships & Industry Experience', 'Job Applications & Placement Preparation']
    );
  });

  test('never drops the first phase, which is where the student stands', () => {
    // A PG Year 1 student's own stage may legitimately carry this title.
    const roadmap = {
      educationRoadmap: [{ phase: 'Postgraduate Year 1: MCA' }, { phase: 'Job Applications & Placement Preparation' }]
    };
    stripCompletedStages(roadmap, { ...pgStudent, currentYear: '1st Year' });
    assert.equal(roadmap.educationRoadmap[0].phase, 'Postgraduate Year 1: MCA');
  });

  test("leaves a phase named for the student's own programme alone", () => {
    const roadmap = {
      educationRoadmap: [{ phase: 'MCA Year 2 / Final Year (Semester 4)' }, { phase: 'MCA Year 2: Thesis & Placement' }]
    };
    stripCompletedStages(roadmap, pgStudent);
    assert.equal(roadmap.educationRoadmap.length, 2);
  });

  test('an undergraduate roadmap is untouched by the postgraduate rule', () => {
    const roadmap = {
      educationRoadmap: [
        { phase: 'BCA Year 2' },
        { phase: 'Internships & Industry Experience' },
        { phase: 'Postgraduate Year 1: MCA / M.Sc CS' }
      ]
    };
    stripCompletedStages(roadmap, { educationLevel: 'Undergraduate', degree: 'BCA' });
    assert.equal(roadmap.educationRoadmap.length, 3);
  });

  test('school phases are still stripped, as before', () => {
    const roadmap = {
      educationRoadmap: [{ phase: 'Class 10' }, { phase: 'BCA Year 2' }, { phase: 'BCA Year 3' }]
    };
    stripCompletedStages(roadmap, { educationLevel: 'Undergraduate', degree: 'BCA' });
    assert.deepEqual(roadmap.educationRoadmap.map((p) => p.phase), ['BCA Year 2', 'BCA Year 3']);
  });
});
