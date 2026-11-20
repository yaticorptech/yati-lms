/**
 * Indian first names (no surnames) for the online test players (2026-11-17, the user: "use different Indian names,
 * not the same ones again and again"). pickName() never repeats a name at a table and rotates through the list, so
 * the last few dozen names given out are not used again soon.
 */
const NAMES = Object.freeze(['Aarav', 'Ananya', 'Vihaan', 'Diya', 'Arjun', 'Ishita', 'Reyansh', 'Saanvi', 'Kabir', 'Myra', 'Aditya', 'Kavya', 'Rohan', 'Aadhya', 'Ishaan', 'Navya', 'Krish', 'Riya', 'Dhruv', 'Anika', 'Advik', 'Tara', 'Shaurya', 'Meera', 'Atharv', 'Pari', 'Yash', 'Siya', 'Vivaan', 'Nisha', 'Aryan', 'Kiara', 'Pranav', 'Avni', 'Kunal', 'Jhanvi', 'Siddharth', 'Prisha', 'Rudra', 'Aarohi', 'Nikhil', 'Tanvi', 'Harsh', 'Ira', 'Varun', 'Sneha', 'Om', 'Mahika', 'Ayaan', 'Charvi', 'Lakshya', 'Divya', 'Tejas', 'Shreya', 'Manav', 'Pooja', 'Rahul', 'Nandini', 'Karthik', 'Lavanya', 'Arnav', 'Bhavya', 'Dev', 'Gauri', 'Hrithik', 'Isha', 'Jay', 'Khushi', 'Madhav', 'Neha', 'Parth', 'Radhika', 'Samar', 'Trisha', 'Uday', 'Vaishnavi', 'Yuvan', 'Zoya', 'Abhinav', 'Akshara', 'Chirag', 'Deepika', 'Eshan', 'Gayatri', 'Hemant', 'Ishani', 'Jatin', 'Kriti', 'Mihir', 'Nitya', 'Pratik', 'Ritika', 'Sahil', 'Tanya', 'Vedant', 'Vanya', 'Aniket', 'Sanjana', 'Keshav', 'Mrunal', 'Naveen', 'Anushka', 'Sameer', 'Pallavi', 'Tushar', 'Swara', 'Rithvik', 'Amaira', 'Hari', 'Bhoomi', 'Akash', 'Shruti', 'Gautam', 'Revathi', 'Suraj', 'Keerthi', 'Vikram', 'Harini', 'Ravi', 'Lakshmi', 'Arun', 'Meenakshi', 'Sai', 'Priya', 'Nakul', 'Anjali']);

const recent = [];
const RECENT_MAX = 60;

/** A first name not in `avoid` (names already at the table) and not handed out recently. */
const pickName = (avoid = []) => {
    const taken = new Set(avoid.map((n) => String(n || '').split(/\s+/)[0]));
    let pool = NAMES.filter((n) => !taken.has(n) && !recent.includes(n));
    if (!pool.length) pool = NAMES.filter((n) => !taken.has(n));
    const name = pool[Math.floor(Math.random() * pool.length)] || NAMES[0];
    recent.push(name);
    if (recent.length > RECENT_MAX) recent.shift();
    return name;
};

module.exports = { NAMES, pickName };
