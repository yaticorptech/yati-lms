/**
 * City lists for warming the index ahead of demand.
 *
 * The keyless company boards only publish where employers keep offices,
 * which in India means a handful of metros. Everywhere else depends on a
 * metered source, and those are only asked about a city when someone
 * searches it — so the first person to search Kochi waits for the fetch and
 * sees a thin page. Running `npm run warm` beforehand moves that cost off
 * the user and onto a background job.
 *
 * India is keyed by state and union territory rather than kept as a flat
 * list, because the thing worth checking is not how many cities are here
 * but whether any region is missing: a state with no entry is a state whose
 * residents get nothing local until they trigger a fetch themselves. The
 * count is asserted below, so adding a region can't be half-done.
 *
 * Warming a city is not the only way it gets covered — a search for any
 * place, listed here or not, fetches it on the spot. This list is about
 * which places are ready *before* anyone asks.
 */

/** All 28 states and 8 union territories, with their main employment centres. */
const INDIA_BY_REGION = {
  /* ---- States ---- */
  "Andhra Pradesh": ["Visakhapatnam", "Vijayawada"],
  "Arunachal Pradesh": ["Itanagar"],
  Assam: ["Guwahati"],
  Bihar: ["Patna"],
  Chhattisgarh: ["Raipur"],
  Goa: ["Panaji"],
  Gujarat: ["Ahmedabad", "Surat", "Vadodara", "Rajkot"],
  Haryana: ["Gurugram", "Faridabad"],
  "Himachal Pradesh": ["Shimla"],
  Jharkhand: ["Ranchi", "Jamshedpur"],
  Karnataka: ["Bengaluru", "Mangalore", "Mysore", "Hubli"],
  Kerala: ["Kochi", "Thiruvananthapuram", "Kozhikode", "Thrissur"],
  "Madhya Pradesh": ["Indore", "Bhopal", "Gwalior"],
  Maharashtra: ["Mumbai", "Pune", "Nagpur", "Nashik", "Aurangabad"],
  Manipur: ["Imphal"],
  Meghalaya: ["Shillong"],
  Mizoram: ["Aizawl"],
  Nagaland: ["Kohima"],
  Odisha: ["Bhubaneswar", "Cuttack"],
  Punjab: ["Ludhiana", "Mohali", "Amritsar"],
  Rajasthan: ["Jaipur", "Jodhpur", "Udaipur"],
  Sikkim: ["Gangtok"],
  "Tamil Nadu": ["Chennai", "Coimbatore", "Madurai", "Tiruchirappalli"],
  Telangana: ["Hyderabad", "Warangal"],
  Tripura: ["Agartala"],
  "Uttar Pradesh": ["Noida", "Lucknow", "Kanpur", "Varanasi", "Prayagraj"],
  Uttarakhand: ["Dehradun"],
  "West Bengal": ["Kolkata", "Siliguri"],

  /* ---- Union territories ---- */
  "Andaman and Nicobar Islands": ["Port Blair"],
  Chandigarh: ["Chandigarh"],
  "Dadra and Nagar Haveli and Daman and Diu": ["Silvassa"],
  Delhi: ["New Delhi"],
  "Jammu and Kashmir": ["Srinagar", "Jammu"],
  Ladakh: ["Leh"],
  Lakshadweep: ["Kavaratti"],
  Puducherry: ["Puducherry"],
};

/* A missing region is invisible in a flat list and obvious in a count, so
   fail loudly at import rather than silently under-covering the country. */
const EXPECTED_REGIONS = 36;   // 28 states + 8 union territories
const actual = Object.keys(INDIA_BY_REGION).length;
if (actual !== EXPECTED_REGIONS) {
  throw new Error(
    `INDIA_BY_REGION covers ${actual} regions; expected ${EXPECTED_REGIONS} (28 states + 8 UTs).`
  );
}

/** Flat, geocoder-ready list: "Kochi, India". */
const INDIA_CITIES = Object.values(INDIA_BY_REGION)
  .flat()
  .map((city) => `${city}, India`);

/** A few global hubs, for indexes not centred on India. */
const GLOBAL_CITIES = [
  "London, United Kingdom", "Berlin, Germany", "Amsterdam, Netherlands",
  "Dublin, Ireland", "Paris, France", "Madrid, Spain", "Warsaw, Poland",
  "New York, United States", "San Francisco, United States", "Austin, United States",
  "Toronto, Canada", "Singapore", "Dubai, United Arab Emirates",
  "Sydney, Australia", "Tokyo, Japan",
];

const CITY_SETS = { india: INDIA_CITIES, global: GLOBAL_CITIES };

module.exports = { INDIA_BY_REGION, INDIA_CITIES, GLOBAL_CITIES, CITY_SETS };
