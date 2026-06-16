/* courses-data.js — Central course registry
 * Add one object per course. Only metadata that changes independently
 * of the txt content lives here (coupon info, niche, urls).
 * The txt files in courses-raw/ contain all course content.
 */
const coursesData = {
  courses: [
    {
      slug: "persuasion-influence-skills",
      niche: "communication",
      udemy_url: "",
      coupon_code: "",
      coupon_expires: "",
      status: "published",
      thumbnail: "",
      added_date: "2025-01-01"
    }
  ]
};

/* Do NOT modify below this line */
if (typeof module !== "undefined") module.exports = coursesData;
