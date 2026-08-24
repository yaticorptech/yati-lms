/**
 * The suggestion lists behind the Settings fields.
 *
 * These aim to be exhaustive for the common cases and generous everywhere else,
 * but no list has to be complete: every field is a typeahead, so an answer that
 * is missing can simply be typed. What the lists buy is consistent spelling —
 * these values feed the roadmap prompt, and "Bca" / "bca" / "B.C.A" were three
 * different courses as far as the model was concerned.
 *
 * Ordering is deliberate: the answers most students give come first, then the
 * rest alphabetically. The field ranks prefix matches above substring matches,
 * so a common answer is usually one or two keystrokes away.
 */

export const CLASSES = [
  'Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5', 'Class 6',
  'Class 7', 'Class 8', 'Class 9', 'Class 10', 'Class 11', 'Class 12'
];

/**
 * The classes each level actually contains.
 *
 * Offering all twelve regardless of level let a Middle School student pick
 * Class 12 — a combination the roadmap then has to make sense of, and which
 * the student has no way of knowing was wrong.
 */
const CLASSES_BY_LEVEL = {
  'Primary School (Class 1\u20135)': CLASSES.slice(0, 5),
  'Middle School (Class 6\u20138)': CLASSES.slice(5, 8),
  'High School (Class 9\u201310)': CLASSES.slice(8, 10),
  'Higher Secondary (Class 11\u201312)': CLASSES.slice(10, 12)
};

/** Falls back to the full list for anything unrecognised. */
export const classesFor = (level) => CLASSES_BY_LEVEL[level] || CLASSES;

/** National and international boards first, then every state board. */
export const BOARDS = [
  'CBSE', 'ICSE', 'ISC', 'CISCE', 'State Board', 'NIOS (Open Schooling)',
  'IB (International Baccalaureate)', 'IGCSE / Cambridge', 'Edexcel',
  'Andhra Pradesh (BSEAP / BIEAP)', 'Arunachal Pradesh', 'Assam (SEBA / AHSEC)',
  'Bihar (BSEB)', 'Chhattisgarh (CGBSE)', 'Goa (GBSHSE)', 'Gujarat (GSEB)',
  'Haryana (HBSE)', 'Himachal Pradesh (HPBOSE)', 'Jammu & Kashmir (JKBOSE)',
  'Jharkhand (JAC)', 'Karnataka (KSEEB / PUC)', 'Kerala (KBPE / DHSE)',
  'Madhya Pradesh (MPBSE)', 'Maharashtra (SSC / HSC)', 'Manipur (BOSEM)',
  'Meghalaya (MBOSE)', 'Mizoram (MBSE)', 'Nagaland (NBSE)', 'Odisha (BSE / CHSE)',
  'Punjab (PSEB)', 'Rajasthan (RBSE)', 'Sikkim', 'Tamil Nadu (DGE)',
  'Telangana (BSET / TSBIE)', 'Tripura (TBSE)', 'Uttar Pradesh (UPMSP)',
  'Uttarakhand (UBSE)', 'West Bengal (WBBSE / WBCHSE)'
];

/**
 * Class 11\u201312 streams.
 *
 * Spelled out rather than left as bare "Science", because the subject
 * combination is what actually decides which degrees a student is eligible
 * for \u2014 PCB cannot sit JEE, PCM cannot sit NEET \u2014 and the roadmap has to know
 * which of those doors is open before it plans a route through one.
 */
export const STREAMS = [
  'Science \u2014 PCMB (Physics, Chemistry, Maths, Biology)',
  'Science \u2014 PCMC (Physics, Chemistry, Maths, Computer Science)',
  'Science \u2014 PCME (Physics, Chemistry, Maths, Electronics)',
  'Science \u2014 PCMS (Physics, Chemistry, Maths, Statistics)',
  'Science \u2014 PCM (Physics, Chemistry, Maths)',
  'Science \u2014 PCB (Physics, Chemistry, Biology)',
  'Science \u2014 PCBH (with Home Science)',
  'Commerce \u2014 CEBA (Commerce, Economics, Business, Accountancy)',
  'Commerce \u2014 SEBA (Statistics, Economics, Business, Accountancy)',
  'Commerce \u2014 CSBA (Computer Science, Business, Accountancy)',
  'Commerce (with Maths)',
  'Commerce (without Maths)',
  'Arts \u2014 HEPS (History, Economics, Political Science, Sociology)',
  'Arts \u2014 HEPP (History, Economics, Political Science, Psychology)',
  'Arts \u2014 SEBA (Sociology, Economics, Business, Accountancy)',
  'Arts / Humanities',
  'Vocational',
  'Agriculture'
];

export const UNDERGRAD_DEGREES = [
  'B.Tech', 'B.E', 'BCA', 'B.Sc', 'B.Com', 'BBA', 'BA', 'B.Des', 'BFA', 'BMS', 'BBM',
  'B.Arch', 'B.Plan', 'MBBS', 'BDS', 'BAMS', 'BHMS', 'BUMS', 'BSMS', 'BNYS', 'BVSc',
  'B.Pharm', 'Pharm.D', 'B.Sc Nursing', 'BPT (Physiotherapy)', 'BOT (Occupational Therapy)',
  'B.Sc Agriculture', 'B.Sc Horticulture', 'B.Tech Dairy Technology', 'B.F.Sc (Fisheries)',
  'LLB', 'BA LLB', 'BBA LLB', 'B.Com LLB', 'B.Ed', 'B.El.Ed', 'B.P.Ed', 'BSW (Social Work)',
  'BHM (Hotel Management)', 'BJMC (Journalism)', 'BMM (Mass Media)', 'B.Voc', 'B.Lib.Sc',
  'B.Sc Hospitality', 'B.Stat', 'B.Math', 'BS-MS (Integrated)'
];

export const POSTGRAD_DEGREES = [
  'M.Tech', 'M.E', 'MCA', 'M.Sc', 'M.Com', 'MBA', 'PGDM', 'MA', 'M.Des', 'MFA',
  'M.Arch', 'M.Plan', 'MD', 'MS (Surgery)', 'MDS', 'M.Pharm', 'M.Sc Nursing',
  'MPT (Physiotherapy)', 'MPH (Public Health)', 'MHA (Hospital Administration)',
  'LLM', 'M.Ed', 'M.P.Ed', 'MSW (Social Work)', 'MJMC (Journalism)', 'M.Lib.Sc',
  'M.Stat', 'M.Math', 'MS (Research)', 'PhD', 'M.Phil'
];

export const DIPLOMA_COURSES = [
  'Diploma in Computer Engineering', 'Diploma in Information Technology',
  'Diploma in Mechanical Engineering', 'Diploma in Civil Engineering',
  'Diploma in Electrical Engineering', 'Diploma in Electronics & Communication',
  'Diploma in Automobile Engineering', 'Diploma in Chemical Engineering',
  'Diploma in Mechatronics', 'Diploma in Mining Engineering',
  'Diploma in Architecture', 'Diploma in Interior Design', 'Diploma in Fashion Design',
  'Diploma in Hotel Management', 'Diploma in Pharmacy (D.Pharm)',
  'Diploma in Nursing (GNM)', 'ANM (Nursing)', 'Diploma in Medical Lab Technology',
  'Diploma in Radiology', 'Diploma in Agriculture', 'Diploma in Education (D.El.Ed)',
  'Diploma in Animation & Multimedia', 'Diploma in Digital Marketing',
  'ITI \u2014 Electrician', 'ITI \u2014 Fitter', 'ITI \u2014 Mechanic', 'Polytechnic'
];

export const SPECIALISATIONS = [
  'Computer Science', 'Information Science', 'Information Technology',
  'Artificial Intelligence & Machine Learning', 'Data Science', 'Cyber Security',
  'Cloud Computing', 'Software Engineering', 'Computer Applications',
  'Electronics & Communication', 'Electrical & Electronics', 'Electronics & Instrumentation',
  'Mechanical', 'Mechatronics', 'Automobile', 'Aeronautical', 'Aerospace', 'Robotics',
  'Civil', 'Structural', 'Environmental', 'Chemical', 'Petroleum', 'Mining',
  'Metallurgy', 'Industrial & Production', 'Marine', 'Textile', 'Food Technology',
  'Biotechnology', 'Biomedical', 'Bioinformatics', 'Genetics', 'Microbiology',
  'Biochemistry', 'Botany', 'Zoology', 'Physics', 'Chemistry', 'Mathematics',
  'Statistics', 'Electronics', 'Geology', 'Environmental Science', 'Agriculture',
  'Horticulture', 'Veterinary Science', 'Nursing', 'Pharmacy', 'Physiotherapy',
  'Medicine', 'Dentistry', 'Public Health',
  'Commerce', 'Accounting & Finance', 'Banking & Insurance', 'Taxation',
  'Economics', 'Business Administration', 'Marketing', 'Human Resources',
  'International Business', 'Operations', 'Entrepreneurship', 'Logistics & Supply Chain',
  'Hotel Management', 'Tourism', 'Aviation',
  'Psychology', 'Sociology', 'Political Science', 'History', 'Geography',
  'Philosophy', 'Public Administration', 'Social Work', 'Anthropology',
  'English Literature', 'Hindi Literature', 'Journalism & Mass Communication',
  'Media Studies', 'Fine Arts', 'Performing Arts', 'Music', 'Design',
  'Fashion Design', 'Interior Design', 'Graphic Design', 'Animation & VFX',
  'Architecture', 'Planning', 'Law', 'Education', 'Physical Education',
  'Library Science', 'Home Science'
];

export const YEARS = [
  '1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year', '6th Year', 'Final Year'
];

export const SEMESTERS = [
  '1st Semester', '2nd Semester', '3rd Semester', '4th Semester', '5th Semester',
  '6th Semester', '7th Semester', '8th Semester', '9th Semester', '10th Semester'
];

export const JOB_TITLES = [
  'Software Engineer', 'Senior Software Engineer', 'Frontend Developer',
  'Backend Developer', 'Full Stack Developer', 'Mobile App Developer',
  'Android Developer', 'iOS Developer', 'Game Developer', 'Embedded Engineer',
  'QA Engineer', 'Automation Test Engineer', 'DevOps Engineer', 'Site Reliability Engineer',
  'Cloud Engineer', 'Data Analyst', 'Data Scientist', 'Data Engineer',
  'Machine Learning Engineer', 'AI Engineer', 'Database Administrator',
  'System Administrator', 'Network Engineer', 'Cyber Security Analyst',
  'Technical Support Engineer', 'Solutions Architect', 'Engineering Manager',
  'Business Analyst', 'Product Manager', 'Project Manager', 'Scrum Master',
  'UI/UX Designer', 'Graphic Designer', 'Content Writer', 'Technical Writer',
  'Digital Marketing Executive', 'SEO Specialist', 'Sales Executive',
  'Marketing Executive', 'HR Executive', 'Recruiter', 'Operations Executive',
  'Customer Support Executive', 'Accountant', 'Financial Analyst', 'Auditor',
  'Bank Officer', 'Teacher', 'Lecturer', 'Professor', 'Research Assistant',
  'Lab Technician', 'Nurse', 'Pharmacist', 'Doctor', 'Civil Engineer',
  'Mechanical Engineer', 'Electrical Engineer', 'Site Engineer', 'Architect',
  'Lawyer', 'Consultant', 'Freelancer', 'Intern', 'Student'
];

// Strings, because the field is a number and an empty value must stay
// distinguishable from a real zero.
export const EXPERIENCE_YEARS = [
  '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10',
  '11', '12', '13', '14', '15', '16', '17', '18', '19', '20',
  '25', '30'
];

/**
 * The sentinel that lets a student say something this list does not contain.
 *
 * Onboarding requires a choice from CAREER_GOALS rather than free typing, which
 * keeps one spelling per career and makes the admin breakdown meaningful. That
 * only works if nobody is ever trapped: picking this reveals a text box, and
 * what they write is saved as their goal. It is never saved literally.
 */
export const CAREER_OTHER = 'Other — tell us in your own words';

/**
 * Careers a student can aim at.
 *
 * Grouped by field below, then flattened — the field ranks prefix matches
 * first, so grouping costs nothing at search time and makes the list far easier
 * to audit and extend than one alphabetical wall of 150 strings.
 *
 * Weighted towards what students in India actually name: government service,
 * defence, agriculture, banking and railways sit alongside the software roles,
 * because a list that only knows about tech quietly tells everyone else that
 * this product is not for them.
 */
const CAREERS_BY_FIELD = {
  'Software & IT': [
    'Software Engineer', 'Backend Developer', 'Frontend Developer', 'Full Stack Developer',
    'Mobile App Developer', 'Android Developer', 'iOS Developer', 'Game Developer',
    'Embedded Systems Engineer', 'DevOps Engineer', 'Cloud Architect',
    'Site Reliability Engineer', 'Database Administrator', 'Network Engineer',
    'Systems Architect', 'QA / Test Engineer', 'Technical Writer', 'Developer Advocate',
    'IT Support Specialist'
  ],
  'Data & AI': [
    'Data Scientist', 'Data Analyst', 'Data Engineer', 'Machine Learning Engineer',
    'AI Researcher', 'Business Intelligence Analyst', 'Statistician', 'Actuary'
  ],
  'Security': [
    'Cyber Security Analyst', 'Ethical Hacker', 'Security Engineer', 'Blockchain Developer',
    'Forensic Scientist'
  ],
  'Design & Product': [
    'UI/UX Designer', 'Product Manager', 'Product Designer', 'Graphic Designer',
    'Interior Designer', 'Fashion Designer', 'Industrial Designer', 'Animator / VFX Artist'
  ],
  'Medicine & Health': [
    'Doctor', 'Surgeon', 'Dentist', 'Nurse', 'Pharmacist', 'Physiotherapist',
    'Veterinarian', 'Psychologist', 'Psychiatrist', 'Nutritionist / Dietitian',
    'Radiologist', 'Optometrist', 'Ayurvedic Doctor (BAMS)', 'Homeopathic Doctor (BHMS)',
    'Medical Lab Technologist', 'Medical Researcher', 'Public Health Specialist',
    'Paramedic'
  ],
  'Core Engineering': [
    'Civil Engineer', 'Mechanical Engineer', 'Electrical Engineer', 'Electronics Engineer',
    'Aerospace Engineer', 'Automobile Engineer', 'Chemical Engineer', 'Mining Engineer',
    'Petroleum Engineer', 'Marine Engineer', 'Environmental Engineer', 'Robotics Engineer',
    'Industrial Engineer', 'Textile Engineer'
  ],
  'Science & Research': [
    'Scientist (ISRO / DRDO)', 'Physicist', 'Chemist', 'Biologist', 'Biotechnologist',
    'Microbiologist', 'Geologist', 'Astronomer', 'Marine Biologist', 'Mathematician',
    'Researcher'
  ],
  'Agriculture & Environment': [
    'Agriculturist', 'Agricultural Scientist', 'Horticulturist', 'Food Technologist',
    'Dairy Technologist', 'Fisheries Scientist', 'Forest Officer (IFS)',
    'Environmental Scientist', 'Wildlife Conservationist'
  ],
  'Finance & Commerce': [
    'Chartered Accountant', 'Company Secretary', 'Cost Accountant (CMA)',
    'Investment Banker', 'Financial Analyst', 'Economist', 'Auditor', 'Tax Consultant',
    'Bank Probationary Officer', 'Insurance Underwriter', 'Stock Market Analyst'
  ],
  'Business & Management': [
    'Entrepreneur', 'Business Analyst', 'Project Manager', 'Marketing Manager',
    'Digital Marketer', 'Sales Manager', 'HR Manager', 'Management Consultant',
    'Supply Chain Manager', 'Operations Manager', 'Hotel Manager', 'Event Manager',
    'Real Estate Manager'
  ],
  'Law & Government': [
    'Lawyer', 'Corporate Lawyer', 'Judge', 'Civil Judge', 'Civil Servant (IAS)',
    'Police Officer (IPS)', 'Foreign Service Officer (IFS)', 'Revenue Officer (IRS)',
    'State Civil Services Officer', 'Railway Officer (RRB)', 'Public Prosecutor',
    'Legal Advisor'
  ],
  'Defence & Aviation': [
    'Defence Officer (NDA)', 'Army Officer', 'Navy Officer', 'Air Force Officer',
    'Pilot', 'Cabin Crew', 'Air Traffic Controller', 'Aircraft Maintenance Engineer',
    'Merchant Navy Officer', 'Coast Guard Officer'
  ],
  'Education': [
    'Teacher', 'Professor', 'School Principal', 'Special Educator',
    'Career Counsellor', 'Corporate Trainer', 'Education Administrator'
  ],
  'Architecture & Planning': [
    'Architect', 'Urban Planner', 'Landscape Architect', 'Civil Contractor',
    'Quantity Surveyor'
  ],
  'Media & Creative': [
    'Journalist', 'News Anchor', 'Content Creator', 'Filmmaker', 'Photographer',
    'Video Editor', 'Musician', 'Actor', 'Radio Jockey', 'Public Relations Specialist',
    'Copywriter'
  ],
  'Service & Social': [
    'Chef', 'Baker / Pastry Chef', 'Travel & Tourism Professional', 'Sports Professional',
    'Fitness Trainer', 'Yoga Instructor', 'Social Worker', 'NGO Programme Manager',
    'Librarian'
  ]
};

/** Grouped form, for anything that wants to show headings. */
export const CAREER_GOALS_BY_FIELD = CAREERS_BY_FIELD;

export const CAREER_GOALS = Object.values(CAREERS_BY_FIELD).flat();

export const COMPANIES = [
  'Google', 'Microsoft', 'Amazon', 'Apple', 'Meta', 'Netflix', 'Nvidia', 'Adobe',
  'Salesforce', 'Oracle', 'IBM', 'Intel', 'Qualcomm', 'Cisco', 'SAP', 'Dell',
  'Uber', 'Airbnb', 'Atlassian', 'Stripe', 'OpenAI', 'Anthropic', 'Tesla', 'SpaceX',
  'Zoho', 'Freshworks', 'Infosys', 'TCS', 'Wipro', 'HCLTech', 'Tech Mahindra',
  'LTIMindtree', 'Mphasis', 'Persistent Systems', 'Accenture', 'Cognizant',
  'Capgemini', 'Deloitte', 'EY', 'KPMG', 'PwC', 'McKinsey & Company', 'BCG', 'Bain',
  'Flipkart', 'Swiggy', 'Zomato', 'Paytm', 'PhonePe', 'Razorpay', 'CRED', 'Zerodha',
  'Meesho', 'Ola', 'Myntra', 'Nykaa', 'BYJU\u2019S', 'Unacademy', 'PhysicsWallah',
  'Reliance', 'Tata Group', 'Aditya Birla Group', 'Mahindra', 'Larsen & Toubro',
  'Bharat Electronics', 'HAL', 'BHEL', 'ONGC', 'Indian Oil', 'NTPC',
  'ISRO', 'DRDO', 'BARC', 'Indian Railways', 'SBI', 'HDFC Bank', 'ICICI Bank',
  'Axis Bank', 'Goldman Sachs', 'JPMorgan Chase', 'Morgan Stanley', 'Barclays',
  'American Express', 'Visa', 'Mastercard', 'Samsung', 'Sony', 'Siemens', 'Bosch',
  'Philips', 'Schneider Electric', 'Honeywell', 'GE', 'Boeing', 'Airbus',
  'Government / Public Sector', 'Startup', 'Own Business'
];

export const COUNTRIES = [
  "India", "United States", "United Kingdom", "Canada", "Australia", "Germany",
  "Singapore", "United Arab Emirates", "New Zealand", "Ireland", "Afghanistan",
  "Åland Islands", "Albania", "Algeria", "American Samoa", "Andorra", "Angola", "Anguilla",
  "Antigua & Barbuda", "Argentina", "Armenia", "Aruba", "Austria", "Azerbaijan", "Bahamas",
  "Bahrain", "Bangladesh", "Barbados", "Belarus", "Belgium", "Belize", "Benin", "Bermuda",
  "Bhutan", "Bolivia", "Bosnia & Herzegovina", "Botswana", "Brazil", "Brunei", "Bulgaria",
  "Burkina Faso", "Burundi", "Cambodia", "Cameroon", "Cape Verde", "Cayman Islands",
  "Central African Republic", "Chad", "Chile", "China", "Colombia", "Comoros",
  "Congo - Brazzaville", "Congo - Kinshasa", "Costa Rica", "Côte d’Ivoire", "Croatia",
  "Cuba", "Cyprus", "Czechia", "Denmark", "Djibouti", "Dominica", "Dominican Republic",
  "Ecuador", "Egypt", "El Salvador", "Equatorial Guinea", "Eritrea", "Estonia", "Eswatini",
  "Ethiopia", "Fiji", "Finland", "France", "Gabon", "Gambia", "Georgia", "Ghana",
  "Gibraltar", "Greece", "Greenland", "Grenada", "Guam", "Guatemala", "Guernsey", "Guinea",
  "Guinea-Bissau", "Guyana", "Haiti", "Honduras", "Hong Kong SAR China", "Hungary",
  "Iceland", "Indonesia", "Iran", "Iraq", "Isle of Man", "Israel", "Italy", "Jamaica",
  "Japan", "Jersey", "Jordan", "Kazakhstan", "Kenya", "Kiribati", "Kuwait", "Kyrgyzstan",
  "Laos", "Latvia", "Lebanon", "Lesotho", "Liberia", "Libya", "Liechtenstein", "Lithuania",
  "Luxembourg", "Macao SAR China", "Madagascar", "Malawi", "Malaysia", "Maldives", "Mali",
  "Malta", "Marshall Islands", "Mauritania", "Mauritius", "Mexico", "Micronesia",
  "Moldova", "Monaco", "Mongolia", "Montenegro", "Morocco", "Mozambique",
  "Myanmar (Burma)", "Namibia", "Nauru", "Nepal", "Netherlands", "New Caledonia",
  "Nicaragua", "Niger", "Nigeria", "North Korea", "North Macedonia", "Norway", "Oman",
  "Pakistan", "Palau", "Palestinian Territories", "Panama", "Papua New Guinea", "Paraguay",
  "Peru", "Philippines", "Poland", "Portugal", "Puerto Rico", "Qatar", "Romania", "Russia",
  "Rwanda", "Samoa", "San Marino", "São Tomé & Príncipe", "Saudi Arabia", "Senegal",
  "Serbia", "Seychelles", "Sierra Leone", "Slovakia", "Slovenia", "Solomon Islands",
  "Somalia", "South Africa", "South Korea", "South Sudan", "Spain", "Sri Lanka",
  "St. Kitts & Nevis", "St. Lucia", "St. Vincent & Grenadines", "Sudan", "Suriname",
  "Sweden", "Switzerland", "Syria", "Taiwan", "Tajikistan", "Tanzania", "Thailand",
  "Timor-Leste", "Togo", "Tonga", "Trinidad & Tobago", "Tunisia", "Türkiye",
  "Turkmenistan", "Tuvalu", "Uganda", "Ukraine", "Uruguay", "Uzbekistan", "Vanuatu",
  "Vatican City", "Venezuela", "Vietnam", "Yemen", "Zambia", "Zimbabwe"
];

/** All 28 states and 8 union territories. */
export const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa',
  'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala',
  'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland',
  'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Andaman & Nicobar Islands', 'Chandigarh',
  'Dadra & Nagar Haveli and Daman & Diu', 'Delhi', 'Jammu & Kashmir', 'Ladakh',
  'Lakshadweep', 'Puducherry'
];

/** The course list that belongs to a given education level. */
export const coursesFor = (level) => {
  if (level === 'Postgraduate') return POSTGRAD_DEGREES;
  if (level === 'Diploma') return DIPLOMA_COURSES;
  return UNDERGRAD_DEGREES;
};

/**
 * States are only listed for countries we actually have a list for. Offering an
 * empty dropdown elsewhere would be worse than offering none \u2014 it reads as
 * "no valid answers" rather than "type yours".
 */
export const statesFor = (country) => (country === 'India' ? INDIAN_STATES : []);
