/**
 * The starter index of local jobs — dummy rows across every category, age
 * band and safety class, dated relative to the moment they are seeded so the
 * board has work "next Saturday" rather than on a day that has passed.
 *
 * Deliberately not all wholesome: the late-night cleanup, the delivery run
 * and the unverified flyer team are here so the age rules have something to
 * refuse. A seed that only contains things a 15-year-old may see cannot
 * show that the filter works.
 *
 * Every row is `source: "seed"` with this SEED_VERSION; bumping the version
 * sweeps the old rows and writes these. Rows an admin adds are never touched.
 */
const SEED_VERSION = 2;

const at = (daysFromNow, hour = 9) => {
  const d = new Date();
  d.setHours(hour, 0, 0, 0);
  d.setDate(d.getDate() + daysFromNow);
  return d;
};
const span = (from, to, startHour, endHour) => ({ startsAt: at(from, startHour), endsAt: at(to ?? from, endHour) });
const org = (name, verified = true, about = "") => ({ name, verified, about });

const rows = [
  // ── Open to 14–17 (verified, youth-safe / supervised, daytime) ─────────
  {
    slug: "flyer-distribution-crumbs-bakery",
    title: "Flyer distribution for a new bakery",
    organization: org("Crumbs Bakery", true, "A neighbourhood bakery opening its second branch."),
    description: "Hand out opening-week flyers outside the metro station and along 100 Feet Road with the bakery's own staff. Two mornings.",
    category: "promotion", icon: "📣", opportunityType: "gig", interests: ["promotion"],
    location: { area: "Indiranagar", city: "Bengaluru", landmark: "Indiranagar metro" },
    ...span(3, 4, 8, 11), timeLabel: "08:00–11:00", hoursPerSession: "2-4", slots: 4,
    minimumAge: 14, maximumAge: null,
    compensation: { kind: "paid", label: "₹300/morning · breakfast" },
    verified: true, safetyClassification: "youth-safe", guardianApprovalRequired: true,
    supervision: "Bakery staff member with the group throughout.",
    safetyNotes: "Footpath only, daylight hours, no cash handling."
  },
  {
    slug: "wedding-buffet-serving-lakshmi",
    title: "Wedding buffet serving",
    organization: org("Sri Lakshmi Caterers", true, "Family caterers, 20 years in Jayanagar."),
    description: "Carry plates and refill counters at a daytime wedding lunch for 400 guests. Uniform provided; food service only, no kitchen work.",
    category: "catering", icon: "🍽️", opportunityType: "event-support", interests: ["catering", "events"],
    location: { area: "Jayanagar", city: "Bengaluru", landmark: "Jayanagar 4th Block" },
    ...span(5, 5, 11, 15), timeLabel: "11:00–15:00", hoursPerSession: "2-4", slots: 8,
    minimumAge: 16, maximumAge: null,
    compensation: { kind: "paid", label: "₹700 · meal included" },
    verified: true, safetyClassification: "supervised", guardianApprovalRequired: true,
    supervision: "Floor supervisor assigns and checks on every helper.",
    safetyNotes: "No hot-surface, knife or heavy-lifting work. Daytime, indoors."
  },
  {
    slug: "cricket-tournament-scoreboard",
    title: "Scoreboard & water helper, school cricket tournament",
    organization: org("Indiranagar Sports Club"),
    description: "Keep the manual scoreboard and hand out water at a Sunday inter-school tournament.",
    category: "events", icon: "🏏", opportunityType: "event-support", interests: ["events"],
    location: { area: "Indiranagar", city: "Bengaluru", landmark: "Club ground" },
    ...span(6, 6, 7, 11), timeLabel: "07:00–11:00", hoursPerSession: "2-4", slots: 3,
    minimumAge: 14, maximumAge: null,
    compensation: { kind: "paid", label: "₹400 · lunch" },
    verified: true, safetyClassification: "youth-safe", guardianApprovalRequired: true,
    supervision: "Club coach at the scorer's table all morning.",
    safetyNotes: "Shaded scorer's tent; guardians welcome in the stands."
  },
  {
    slug: "birthday-party-helper-party-planet",
    title: "Birthday party helper",
    organization: org("Party Planet Events"),
    description: "Help set up games, hand out return gifts and keep the party corner tidy at a kids' birthday.",
    category: "events", icon: "🎈", opportunityType: "gig", interests: ["events", "decoration"],
    location: { area: "HSR Layout", city: "Bengaluru", landmark: "Sector 2 community hall" },
    ...span(7, 7, 15, 19), timeLabel: "15:00–19:00", hoursPerSession: "2-4", slots: 2,
    minimumAge: 15, maximumAge: null,
    compensation: { kind: "paid", label: "₹500" },
    verified: true, safetyClassification: "supervised", guardianApprovalRequired: true,
    supervision: "Party coordinator on site; parents of the host present.",
    safetyNotes: "Indoor hall, finishes before dark."
  },
  {
    slug: "engagement-photo-assistant",
    title: "Photography assistant, engagement ceremony",
    organization: org("Frame & Focus Studio"),
    description: "Hand over lenses, hold the reflector and tag photos afterwards for the studio's lead photographer.",
    category: "photography", icon: "📷", opportunityType: "gig", interests: ["photography", "events"],
    location: { area: "Whitefield", city: "Bengaluru", landmark: "Palm Meadows clubhouse" },
    ...span(8, 8, 16, 20), timeLabel: "16:00–20:00", hoursPerSession: "2-4", slots: 1,
    minimumAge: 16, maximumAge: null,
    compensation: { kind: "paid", label: "₹800" },
    verified: true, safetyClassification: "supervised", guardianApprovalRequired: true,
    supervision: "Works beside the lead photographer for the whole session.",
    safetyNotes: "Family function, indoors; guardian pick-up at the venue gate."
  },
  {
    slug: "annual-day-buntings-st-josephs",
    title: "Buntings & stage decoration, school annual day",
    organization: org("St. Joseph's PTA"),
    description: "Hang buntings, tie balloon arches and dress the stage the day before and morning of the annual day.",
    category: "decoration", icon: "🎀", opportunityType: "event-support", interests: ["decoration", "events"],
    location: { area: "Frazer Town", city: "Bengaluru", landmark: "School auditorium" },
    ...span(9, 10, 9, 13), timeLabel: "09:00–13:00", hoursPerSession: "2-4", slots: 6,
    minimumAge: 14, maximumAge: null,
    compensation: { kind: "paid", label: "₹400/day · snacks" },
    verified: true, safetyClassification: "youth-safe", guardianApprovalRequired: true,
    supervision: "PTA volunteers lead each team; teachers on campus.",
    safetyNotes: "Ground-level work only — ladders are handled by the school's staff."
  },
  {
    slug: "school-fest-registration-desk",
    title: "Registration desk, inter-school fest",
    organization: org("Bengaluru Schools Cultural Council"),
    description: "Staff the registration desk and guide visiting teams around the venue. Training on the morning.",
    category: "events", icon: "🎪", opportunityType: "event-support", interests: ["events"],
    location: { area: "Indiranagar", city: "Bengaluru", landmark: "Council auditorium" },
    ...span(11, 11, 9, 13), timeLabel: "09:00–13:00", hoursPerSession: "2-4", slots: 6,
    minimumAge: 15, maximumAge: 19,
    compensation: { kind: "paid", label: "₹500 · certificate" },
    verified: true, safetyClassification: "supervised", guardianApprovalRequired: true,
    supervision: "A council staff member leads each desk; students never work alone.",
    safetyNotes: "Daytime only. No cash handling."
  },
  {
    slug: "book-fair-counter-help",
    title: "Counter help at the book fair",
    organization: org("Sapna Book Fair"),
    description: "Bag purchases, restock tables and point visitors to the right aisle over the fair's three days.",
    category: "shop", icon: "🛍️", opportunityType: "event-support", interests: ["shop", "events"],
    location: { area: "Palace Grounds", city: "Bengaluru", landmark: "Tripura Vasini hall" },
    ...span(12, 14, 10, 14), timeLabel: "10:00–14:00", hoursPerSession: "2-4", slots: 10,
    minimumAge: 15, maximumAge: null,
    compensation: { kind: "paid", label: "₹450/day" },
    verified: true, safetyClassification: "supervised", guardianApprovalRequired: true,
    supervision: "A fair supervisor per hall; helpers never handle payments.",
    safetyNotes: "Indoor hall, daytime."
  },
  {
    slug: "marathon-water-station",
    title: "Water station volunteer, city run",
    organization: org("Run Bengaluru"),
    description: "Fill cups and cheer runners at the 5 km water station.",
    category: "events", icon: "🏃", opportunityType: "event-support", interests: ["events", "setup"],
    location: { area: "Cubbon Park", city: "Bengaluru", landmark: "Water station 2" },
    ...span(13, 13, 5, 9), timeLabel: "05:30–09:30", hoursPerSession: "2-4", slots: 12,
    minimumAge: 15, maximumAge: null,
    compensation: { kind: "paid", label: "₹350 · event t-shirt" },
    verified: true, safetyClassification: "supervised", guardianApprovalRequired: true,
    supervision: "Station captain with each group of six.",
    safetyNotes: "Inside the park, marshals on the route."
  },
  {
    slug: "gift-hamper-packing-bloom",
    title: "Gift hamper packing",
    organization: org("Bloom Gifting"),
    description: "Assemble and ribbon corporate gift hampers at the studio ahead of a big delivery.",
    category: "packing", icon: "🎁", opportunityType: "gig", interests: ["packing", "decoration"],
    location: { area: "Koramangala", city: "Bengaluru", landmark: "5th Block studio" },
    ...span(15, 17, 11, 15), timeLabel: "11:00–15:00", hoursPerSession: "2-4", slots: 5,
    minimumAge: 14, maximumAge: null,
    compensation: { kind: "paid", label: "₹450/day" },
    verified: true, safetyClassification: "youth-safe", guardianApprovalRequired: true,
    supervision: "Studio manager in the room; seated work at tables.",
    safetyNotes: "No cutting tools — ribbons are pre-cut."
  },
  {
    slug: "saree-expo-counter",
    title: "Exhibition counter help, silk saree expo",
    organization: org("Kanchi Silks Expo"),
    description: "Fold, display and hand sarees to customers at a three-day exhibition stall.",
    category: "shop", icon: "🧵", opportunityType: "event-support", interests: ["shop"],
    location: { area: "Malleshwaram", city: "Bengaluru", landmark: "Sankey Road hall" },
    ...span(18, 20, 11, 15), timeLabel: "11:00–15:00", hoursPerSession: "2-4", slots: 4,
    minimumAge: 16, maximumAge: null,
    compensation: { kind: "paid", label: "₹500/day" },
    verified: true, safetyClassification: "supervised", guardianApprovalRequired: true,
    supervision: "Stall owner present; no billing by helpers.",
    safetyNotes: "Indoor exhibition hall."
  },
  {
    slug: "ganesha-pandal-decoration",
    title: "Pandal decoration, Ganesha festival",
    organization: org("Koramangala Youth Association"),
    description: "Tie flower strings, hang lights at ground level and lay out the seating for the association's pandal.",
    category: "decoration", icon: "🌸", opportunityType: "event-support", interests: ["decoration", "events"],
    location: { area: "Koramangala", city: "Bengaluru", landmark: "3rd Block park" },
    ...span(20, 21, 9, 13), timeLabel: "09:00–13:00", hoursPerSession: "2-4", slots: 8,
    minimumAge: 15, maximumAge: null,
    compensation: { kind: "paid", label: "₹500/day · lunch" },
    verified: true, safetyClassification: "supervised", guardianApprovalRequired: true,
    supervision: "Association committee members lead each group.",
    safetyNotes: "Electrical work and ladders handled by the hired electrician only."
  },
  {
    slug: "temple-prasada-packing",
    title: "Prasada packing, temple festival morning",
    organization: org("Someshwara Temple Trust"),
    description: "Pack laddus into boxes for distribution on the festival morning.",
    category: "packing", icon: "📦", opportunityType: "gig", interests: ["packing", "catering"],
    location: { area: "Ulsoor", city: "Bengaluru", landmark: "Temple hall" },
    ...span(25, 25, 6, 10), timeLabel: "06:00–10:00", hoursPerSession: "2-4", slots: 10,
    minimumAge: 14, maximumAge: null,
    compensation: { kind: "paid", label: "₹400 · breakfast" },
    verified: true, safetyClassification: "youth-safe", guardianApprovalRequired: true,
    supervision: "Trust volunteers at every table.",
    safetyNotes: "Seated work; gloves and caps provided."
  },
  {
    slug: "diwali-sweet-boxing-anand",
    title: "Diwali sweet boxing helpers",
    organization: org("Anand Sweets", true, "Sweet shop and factory, Basavanagudi."),
    description: "Pack assorted sweets into gift boxes on the festival rush week. Seated, daytime, in the packing hall.",
    category: "packing", icon: "🍬", opportunityType: "gig", interests: ["packing"],
    location: { area: "Basavanagudi", city: "Bengaluru", landmark: "Gandhi Bazaar" },
    ...span(34, 38, 10, 14), timeLabel: "10:00–14:00", hoursPerSession: "2-4", slots: 15,
    minimumAge: 14, maximumAge: null,
    compensation: { kind: "paid", label: "₹500/day · sweets box" },
    verified: true, safetyClassification: "youth-safe", guardianApprovalRequired: true,
    supervision: "Packing-hall supervisor; separate from the kitchen.",
    safetyNotes: "No kitchen access, no hot surfaces."
  },

  // ── 18+ ────────────────────────────────────────────────────────────────
  {
    slug: "corporate-lunch-serving",
    title: "Corporate lunch serving",
    organization: org("Annapoorna Caterers"),
    description: "Serve a plated lunch for 150 at an office event.",
    category: "catering", icon: "🍽️", opportunityType: "event-support", interests: ["catering"],
    location: { area: "Bellandur", city: "Bengaluru", landmark: "Ecospace" },
    ...span(4, 4, 11, 15), timeLabel: "11:30–15:30", hoursPerSession: "2-4", slots: 6,
    minimumAge: 18, maximumAge: null,
    compensation: { kind: "paid", label: "₹800 · meal" },
    verified: true, safetyClassification: "general", guardianApprovalRequired: false,
    contact: { email: "staffing@annapoorna.example", phone: "" }
  },
  {
    slug: "boutique-product-photography",
    title: "Product photography, boutique catalogue",
    organization: org("Threadline Boutique"),
    description: "Shoot 60 garments on a mannequin against a white backdrop; own camera required.",
    category: "photography", icon: "📷", opportunityType: "gig", interests: ["photography"],
    location: { area: "Jayanagar", city: "Bengaluru", landmark: "9th Block" },
    ...span(6, 6, 10, 14), timeLabel: "10:00–14:00", hoursPerSession: "2-4", slots: 1,
    minimumAge: 18, maximumAge: null,
    compensation: { kind: "paid", label: "₹1,500" },
    verified: true, safetyClassification: "general", guardianApprovalRequired: false,
    contact: { email: "hello@threadline.example", phone: "" }
  },
  {
    slug: "exhibition-stall-setup",
    title: "Exhibition stall setup crew",
    organization: org("Expo Builders"),
    description: "Assemble modular stalls and carry panels the day before a trade fair opens.",
    category: "setup", icon: "🔧", opportunityType: "gig", interests: ["setup", "events"],
    location: { area: "Palace Grounds", city: "Bengaluru", landmark: "Gayatri Vihar" },
    ...span(9, 9, 7, 15), timeLabel: "07:00–15:00", hoursPerSession: "4+", slots: 12,
    minimumAge: 18, maximumAge: null,
    compensation: { kind: "paid", label: "₹900 · lunch" },
    verified: true, safetyClassification: "general", guardianApprovalRequired: false,
    contact: { email: "", phone: "+91 98450 22222" }
  },
  {
    slug: "post-event-cleanup-night",
    title: "Post-event cleanup crew (night)",
    organization: org("Expo Builders"),
    description: "Dismantle stalls and clear the hall after the fair closes.",
    category: "setup", icon: "🧹", opportunityType: "gig", interests: ["setup"],
    location: { area: "Palace Grounds", city: "Bengaluru", landmark: "Gayatri Vihar" },
    ...span(10, 10, 20, 23), timeLabel: "20:00–23:30", hoursPerSession: "2-4", slots: 12,
    minimumAge: 18, maximumAge: null,
    compensation: { kind: "paid", label: "₹700" },
    verified: true, safetyClassification: "restricted", guardianApprovalRequired: false,
    safetyNotes: "Late hours and heavy lifting — adults only.",
    contact: { email: "", phone: "+91 98450 22222" }
  },
  {
    slug: "mandap-decoration-crew",
    title: "Wedding mandap decoration crew",
    organization: org("Shubha Decorators"),
    description: "Two full days building and dressing a wedding mandap — flowers, drapes and lighting.",
    category: "decoration", icon: "💐", opportunityType: "gig", interests: ["decoration", "events"],
    location: { area: "Rajajinagar", city: "Bengaluru", landmark: "Kalyana mantapa" },
    ...span(16, 17, 8, 18), timeLabel: "08:00–18:00", hoursPerSession: "4+", slots: 6,
    minimumAge: 18, maximumAge: null,
    compensation: { kind: "paid", label: "₹1,200/day · meals" },
    verified: true, safetyClassification: "general", guardianApprovalRequired: false,
    contact: { email: "", phone: "+91 98860 33333" }
  },
  {
    slug: "sweet-shop-weekend-counter",
    title: "Weekend counter staff, sweet shop",
    organization: org("Anand Sweets"),
    description: "Serve customers and bill at the Gandhi Bazaar counter on weekends through the festival season.",
    category: "shop", icon: "🛍️", opportunityType: "part-time", interests: ["shop"],
    location: { area: "Basavanagudi", city: "Bengaluru", landmark: "Gandhi Bazaar" },
    ...span(2, 40, 10, 18), timeLabel: "Sat & Sun, 10:00–18:00", hoursPerSession: "4+", slots: 3,
    minimumAge: 18, maximumAge: null,
    compensation: { kind: "paid", label: "₹600/day" },
    verified: true, safetyClassification: "general", guardianApprovalRequired: false,
    contact: { email: "jobs@anandsweets.example", phone: "" }
  },
  {
    slug: "concert-crowd-helper",
    title: "Crowd & queue helper, evening concert",
    organization: org("LiveWire Events"),
    description: "Manage entry queues and guide the crowd at an open-air concert; ends late.",
    category: "events", icon: "🎤", opportunityType: "event-support", interests: ["events"],
    location: { area: "Jayamahal", city: "Bengaluru", landmark: "Palace grounds gate 4" },
    ...span(22, 22, 16, 23), timeLabel: "16:00–23:00", hoursPerSession: "4+", slots: 20,
    minimumAge: 18, maximumAge: null,
    compensation: { kind: "paid", label: "₹1,000 · dinner" },
    verified: true, safetyClassification: "restricted", guardianApprovalRequired: false,
    safetyNotes: "Late finish, large crowd — adults only.",
    contact: { email: "crew@livewire.example", phone: "" }
  },
  {
    slug: "sweet-box-delivery-rider",
    title: "Festival sweet box delivery (own two-wheeler)",
    organization: org("Anand Sweets"),
    description: "Deliver pre-packed gift boxes across south Bengaluru on the three days before Diwali.",
    category: "delivery", icon: "🛵", opportunityType: "gig", interests: ["delivery", "packing"],
    location: { area: "Basavanagudi", city: "Bengaluru", landmark: "Gandhi Bazaar" },
    ...span(36, 38, 9, 17), timeLabel: "09:00–17:00", hoursPerSession: "4+", slots: 5,
    minimumAge: 18, maximumAge: null,
    compensation: { kind: "paid", label: "₹800/day + fuel" },
    verified: true, safetyClassification: "restricted", guardianApprovalRequired: false,
    safetyNotes: "Road work; licence required — adults only.",
    contact: { email: "jobs@anandsweets.example", phone: "" }
  },
  {
    slug: "banquet-late-evening-shift",
    title: "Banquet service staff, late evening",
    organization: org("Grand Orchid Banquets"),
    description: "Serve at weddings and corporate dinners; shifts run into the early hours.",
    category: "catering", icon: "🍽️", opportunityType: "part-time", interests: ["catering", "events"],
    location: { area: "MG Road", city: "Bengaluru", landmark: "" },
    ...span(5, 40, 18, 23), timeLabel: "18:00–01:00", hoursPerSession: "4+", slots: 10,
    minimumAge: 18, maximumAge: null,
    compensation: { kind: "paid", label: "₹900/shift" },
    verified: true, safetyClassification: "restricted", guardianApprovalRequired: false,
    safetyNotes: "Late hours and licensed premises — adults only.",
    contact: { email: "", phone: "+91 80 4111 1111" }
  },
  {
    slug: "flyer-team-quickpromo",
    title: "Flyer team, mall promotion",
    organization: org("QuickPromo", false),
    description: "Hand out flyers for a mobile brand inside a mall for one morning.",
    category: "promotion", icon: "📣", opportunityType: "gig", interests: ["promotion"],
    location: { area: "Whitefield", city: "Bengaluru", landmark: "Phoenix Marketcity" },
    ...span(3, 3, 8, 12), timeLabel: "08:00–12:00", hoursPerSession: "2-4", slots: 6,
    minimumAge: 18, maximumAge: null,
    compensation: { kind: "paid", label: "₹500" },
    verified: false, safetyClassification: "general", guardianApprovalRequired: false,
    contact: { email: "", phone: "+91 90000 00000" }
  }
];

module.exports = { SEED_VERSION, rows: rows.map((r) => ({ ...r, source: "seed", seedVersion: SEED_VERSION, status: "open" })) };
