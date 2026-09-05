import type { ContentSection } from "./service-content";

export const ARTICLE_CONTENT: Record<string, { heading: string; description: string; intro: string; sections: ContentSection[] }> = {
  "/blog/sell-your-car-fast-and-easy-in-brisbane/": {
    heading: "Prepare to Sell Your Car in Brisbane",
    description: "Prepare vehicle details, compare offers and plan a car handover in Brisbane. A practical guide to reducing avoidable delays.",
    intro: "A faster sale starts with complete information, realistic expectations and a pickup plan that works for both sides.",
    sections: [
      { title: "Prepare the details buyers need", text: "Write down the make, model, build year, odometer reading and registration status. Photograph every side, the interior, the odometer and any damage. Accurate details reduce follow-up questions and make the initial quote more useful." },
      { title: "Compare the full value of each offer", text: "Look beyond the headline amount. Confirm whether towing is included, when payment is made and what could change after inspection. Disclose missing wheels, locked steering or difficult access before booking." },
      { title: "Make the handover easy", text: "Remove belongings and toll tags, locate your identification and ownership records, and keep keys ready. Agree on the final amount and collection window before the tow truck is dispatched." },
    ],
  },
  "/blog/a-guide-to-understanding-cash-for-cars-brisbane/": {
    heading: "Understanding Cash for Cars in Brisbane",
    description: "Understand vehicle valuation, towing terms, payment questions and the collection process before accepting a cash-for-cars offer.",
    intro: "Cash-for-cars services value vehicles for resale, parts and recyclable material, then arrange collection from the owner.",
    sections: [
      { title: "What affects a vehicle quote", text: "Make, model, age, condition, location, completeness and demand for reusable components all matter. Photos and an honest condition description help a buyer assess those factors before pickup." },
      { title: "Questions to ask before accepting", text: "Confirm the final payment method, whether standard towing is included, who handles paperwork and which circumstances could change the quote. Ask for unclear terms to be explained before you commit." },
      { title: "What happens at collection", text: "The collector checks the vehicle and your authority to sell it, completes the agreed paperwork and pays the confirmed amount. Do not hand over the vehicle until the payment and documents match what you agreed." },
    ],
  },
  "/blog/how-to-get-cash-for-cars-in-brisbane-qld/": {
    heading: "How to Request a Car Quote in Brisbane",
    description: "Learn which vehicle and pickup details make a car quote useful, and what to confirm before agreeing to collection in Brisbane.",
    intro: "You can make a Brisbane vehicle quote more accurate by supplying the right details and checking the collection terms upfront.",
    sections: [
      { title: "Describe the vehicle clearly", text: "Include the exact model, year, kilometres and registration status. Note accident damage, mechanical faults, missing parts and whether the car rolls, steers and has keys." },
      { title: "Explain the pickup location", text: "Provide the suburb and describe access to the vehicle. Low clearances, underground parking, steep driveways or missing wheels may require different recovery equipment." },
      { title: "Confirm the deal before pickup", text: "Check the amount, towing arrangements, payment timing and required documents. Keep a written record of the agreed terms and do not sign blank or incomplete forms." },
    ],
  },
  "/blog/selling-your-car-without-a-roadworthy-certificate/": {
    heading: "Selling a Car Without a Roadworthy Certificate",
    description: "Understand why registration status and the buyer matter when checking Queensland safety-certificate requirements before a vehicle sale.",
    intro: "Queensland safety-certificate requirements depend on the vehicle's registration status and who is buying it, so check the current rules before disposal.",
    sections: [
      { title: "Registered and unregistered sales differ", text: "Queensland guidance says a registered vehicle generally needs a current safety certificate before it is disposed of, except in specified situations such as disposal to a licensed motor dealer. An unregistered vehicle can be sold without one." },
      { title: "Confirm which situation applies", text: "Tell the buyer whether the vehicle is registered and ask how the registration and plates will be handled. Verify the current requirements directly with Queensland Transport and Main Roads before the handover." },
      { title: "Keep a clear paper trail", text: "Record the buyer and seller, date, vehicle identification number, agreed amount and registration status. Keep copies of completed documents and proof of payment." },
    ],
  },
};
