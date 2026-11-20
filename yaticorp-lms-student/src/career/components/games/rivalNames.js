/**
 * "Ananya completed this in 50 seconds" (2026-11-17, the user): after a cleared level, another player's quicker time
 * to aim at — a different Indian first name each time (no surnames), never one of the last several shown.
 */
export const NAMES = Object.freeze(['Aarav', 'Ananya', 'Vihaan', 'Diya', 'Arjun', 'Ishita', 'Reyansh', 'Saanvi', 'Kabir', 'Myra', 'Aditya', 'Kavya', 'Rohan', 'Aadhya', 'Ishaan', 'Navya', 'Krish', 'Riya', 'Dhruv', 'Anika', 'Advik', 'Tara', 'Shaurya', 'Meera', 'Atharv', 'Pari', 'Yash', 'Siya', 'Vivaan', 'Nisha', 'Aryan', 'Kiara', 'Pranav', 'Avni', 'Kunal', 'Jhanvi', 'Siddharth', 'Prisha', 'Rudra', 'Aarohi', 'Nikhil', 'Tanvi', 'Harsh', 'Ira', 'Varun', 'Sneha', 'Om', 'Mahika', 'Ayaan', 'Charvi', 'Lakshya', 'Divya', 'Tejas', 'Shreya', 'Manav', 'Pooja', 'Rahul', 'Nandini', 'Karthik', 'Lavanya', 'Arnav', 'Bhavya', 'Dev', 'Gauri', 'Hrithik', 'Isha', 'Jay', 'Khushi', 'Madhav', 'Neha', 'Parth', 'Radhika', 'Samar', 'Trisha', 'Uday', 'Vaishnavi', 'Yuvan', 'Zoya', 'Abhinav', 'Akshara', 'Chirag', 'Deepika', 'Eshan', 'Gayatri', 'Hemant', 'Ishani', 'Jatin', 'Kriti', 'Mihir', 'Nitya', 'Pratik', 'Ritika', 'Sahil', 'Tanya', 'Vedant', 'Vanya', 'Aniket', 'Sanjana', 'Keshav', 'Mrunal', 'Naveen', 'Anushka', 'Sameer', 'Pallavi', 'Tushar', 'Swara', 'Rithvik', 'Amaira', 'Hari', 'Bhoomi', 'Akash', 'Shruti', 'Gautam', 'Revathi', 'Suraj', 'Keerthi', 'Vikram', 'Harini', 'Ravi', 'Lakshmi', 'Arun', 'Meenakshi', 'Sai', 'Priya', 'Nakul', 'Anjali']);

const KEY = 'yati:rival-names';
const RECENT_MAX = 40;
const readRecent = () => { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; } };

/** A first name not shown recently (and not the student's own). */
export const pickRival = (own = '') => {
  const recent = readRecent();
  let pool = NAMES.filter((n) => !recent.includes(n) && n.toLowerCase() !== String(own).toLowerCase());
  if (!pool.length) pool = NAMES.filter((n) => n.toLowerCase() !== String(own).toLowerCase());
  const name = pool[Math.floor(Math.random() * pool.length)];
  try { localStorage.setItem(KEY, JSON.stringify([...recent, name].slice(-RECENT_MAX))); } catch { /* storage off: still works */ }
  return name;
};

/** A quicker time than the student's: 60–90% of it, at least 3 seconds, and always below theirs when it can be. */
export const rivalSeconds = (took) => {
  if (took <= 3) return Math.max(1, took - 1);
  return Math.max(3, Math.min(took - 1, Math.round(took * (0.6 + Math.random() * 0.3))));
};

export const timeText = (secs) => (secs < 60 ? `${secs} seconds` : `${Math.floor(secs / 60)} min${secs % 60 ? ` ${secs % 60} s` : ''}`);
