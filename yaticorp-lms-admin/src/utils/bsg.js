/**
 * Bharat Scouts & Guides lists the admin app shows — kept in step with the
 * server's src/nccnss/bsg.js, which is what every value is checked against.
 */
export const INDIA_STATES = [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat', 'Haryana',
    'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
    'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana',
    'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
    'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu', 'Delhi',
    'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry'
];
export const SECTION_LABEL = { cubs: 'Cubs', bulbuls: 'Bulbuls', scouts: 'Scouts', guides: 'Guides', rovers: 'Rovers', rangers: 'Rangers' };
export const NOTICE_KINDS = [['exam', 'Exam / test'], ['camp', 'Camp'], ['training', 'Training'], ['event', 'Event'], ['rules', 'Rules & regulations'], ['notice', 'Notice']];
export const NOTICE_KIND_LABEL = Object.fromEntries(NOTICE_KINDS);
