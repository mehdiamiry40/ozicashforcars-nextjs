export type QuestionAnswer = { question: string; answer: string };
export type ContentSection = { title: string; text: string };
export type ServiceContent = {
  heading: string;
  description: string;
  intro: string;
  sections: ContentSection[];
  faqs: QuestionAnswer[];
  relatedGuide: string;
};

// Editorial content is independent of the legacy URL inventory. These records describe
// what an owner should disclose and confirm; they do not promise unverified eligibility.
export const SERVICE_CONTENT: Record<string, ServiceContent> = {
  "/cash-for-accident-cars/": {
    heading: "Cash for Accident Cars",
    description: "Request an accident-car quote with details of collision damage, insurance status and recovery access. Confirm collection requirements before booking.",
    intro: "After an accident, the damage is only part of the picture. Tell us where the car is stored, whether an insurer is involved and which parts can still move safely.",
    sections: [
      { title: "Describe the collision damage", text: "Photograph the damaged areas from a safe position and mention deployed airbags, broken glass, fluid leaks and wheels pushed out of alignment. State whether the car starts, rolls and steers. Do not start or move a damaged vehicle merely to complete a quote request." },
      { title: "Check insurance and release arrangements", text: "If an insurance claim is open or the car is in a repairer or storage yard, confirm who has authority to sell it and release it. Ask the yard about access and any outstanding storage costs. A vehicle quote does not settle an insurance claim or establish ownership." },
      { title: "Plan recovery before accepting", text: "Share the storage address, contact person and loading restrictions before agreeing to collection. A locked wheel or badly damaged suspension can affect the equipment needed. Confirm any special recovery cost, the final offer and the documents required before the vehicle is released." },
    ],
    faqs: [
      { question: "Can I request a quote while an insurance claim is open?", answer: "You can describe the vehicle for an enquiry, but first check with your insurer who may sell or release it. Do not authorise collection until ownership and the claim position are clear." },
      { question: "What if the car cannot roll after the collision?", answer: "State this in the condition field, including which wheels or steering components are affected. The team must assess recovery access and equipment before confirming pickup." },
    ],
    relatedGuide: "/blog/how-to-get-cash-for-cars-in-brisbane-qld/",
  },
  "/cash-for-damaged-cars/": {
    heading: "Cash for Damaged Cars",
    description: "Describe mechanical faults, body damage or flood exposure for a damaged-car quote. Learn which details affect assessment and collection.",
    intro: "Mechanical failure, hail damage and worn bodywork create different selling decisions. A useful quote starts with a clear account of the fault and the parts of the vehicle that still work.",
    sections: [
      { title: "Separate symptoms from a confirmed diagnosis", text: "Explain what happened: an engine that will not turn over, a gearbox that will not select a gear or repeated overheating. Include a workshop diagnosis if you have one, but say when the cause is unknown. You do not need to pay for a new diagnosis just to describe the car." },
      { title: "Disclose more than visible damage", text: "Mention hail, rust, water exposure, electrical faults and missing components as well as dents. Photos help with body condition; a written description helps with faults a photograph cannot show. Do not assume that a car which starts is safe to drive to a collection point." },
      { title: "Compare selling with further repairs", text: "If you already have a repair estimate, compare that cost and the time involved with the offer for the car in its current condition. Ask what inspection could change the price. Confirm how a non-running or unsafe car will be loaded before accepting a pickup arrangement." },
    ],
    faqs: [
      { question: "Do I need to repair the fault before requesting a quote?", answer: "Describe the car as it is, including known faults and any existing repair estimate. The team can assess the enquiry without you promising to repair it first." },
      { question: "Should I mention past water damage if the car now runs?", answer: "Yes. Include known water exposure and electrical or mechanical symptoms even if the car starts, so the assessment is based on its actual history." },
    ],
    relatedGuide: "/blog/a-guide-to-understanding-cash-for-cars-brisbane/",
  },
  "/cash-for-junk-cars/": {
    heading: "Cash for Junk Cars",
    description: "Get a quote for a long-unused or incomplete car. Explain missing parts, storage condition and access so its recoverable value can be assessed.",
    intro: "A car described as junk may be a complete non-runner or a shell with missing parts. Give an accurate inventory so the enquiry can be assessed on the vehicle that is actually there.",
    sections: [
      { title: "List what remains with the car", text: "State whether the engine, transmission, wheels, battery and major body panels are present. Mention parts removed during previous repairs and any loose parts intended to go with the car. Avoid a description such as 'complete' if you have not checked what is missing." },
      { title: "Explain how long it has been stored", text: "Long storage can leave tyres flat, brakes seized or the car surrounded by vegetation. Describe those conditions and any visible leaks. Take photos only where it is safe; do not crawl beneath a deteriorated vehicle or try to free seized components for a quote." },
      { title: "Ask what the offer includes", text: "Recoverable material and reusable parts are among the factors in an assessment. Confirm whether the stated offer includes collection and the loose vehicle parts you listed. Household rubbish or unrelated waste should be discussed separately, rather than assumed to be part of car removal." },
    ],
    faqs: [
      { question: "Is an incomplete car automatically accepted?", answer: "No automatic acceptance is promised. Describe the missing components, pickup location and loading condition so the team can confirm whether it can make an offer." },
      { question: "Can I leave unrelated rubbish inside the car?", answer: "Remove personal belongings and discuss any non-vehicle waste before booking. A vehicle quote should not be treated as a general rubbish-removal arrangement." },
    ],
    relatedGuide: "/blog/a-guide-to-understanding-cash-for-cars-brisbane/",
  },
  "/cash-for-old-cars/": {
    heading: "Cash for Old Cars",
    description: "Request an old-car quote using age, mileage, condition and ownership details. Consider usable condition and history alongside the vehicle's age.",
    intro: "Age alone does not describe an older car. Its maintenance history, completeness and current condition help distinguish a usable vehicle from one best assessed for parts or material.",
    sections: [
      { title: "Identify the model and current condition", text: "Supply the build year, model variant, odometer reading and registration status. Mention whether the car is in regular use or has been parked for a long time. If a badge is missing or you are unsure of the variant, say so rather than guessing." },
      { title: "Keep useful history with the enquiry", text: "Existing service records, recent repairs and known defects can explain an older vehicle better than age alone. Tell us about rust, overheating, worn interiors and missing keys. Keep original documents secure and ask which records are needed at handover." },
      { title: "Consider the vehicle before accepting a general offer", text: "If you believe the car has collector interest or uncommon original parts, compare suitable selling options before agreeing to a general vehicle-buying offer. An initial quote is a proposal for the vehicle described, not an independent appraisal of collectible value." },
    ],
    faqs: [
      { question: "Does an old car have to be scrapped?", answer: "Do not assume an outcome from age alone. Ask how the buyer is assessing the vehicle and compare alternatives if its condition or history may have additional value." },
      { question: "What if I do not know the exact odometer reading?", answer: "Give the best information available and clearly mark it as approximate or unreadable. Avoid presenting an estimate as a verified reading." },
    ],
    relatedGuide: "/blog/sell-your-car-fast-and-easy-in-brisbane/",
  },
  "/cash-for-scrap-cars/": {
    heading: "Cash for Scrap Cars",
    description: "Prepare a scrap-car quote with vehicle completeness, condition and pickup details. Understand why an online metal price is not a final vehicle offer.",
    intro: "A scrap-car enquiry is about a whole vehicle and its collection requirements. The amount offered depends on more than a headline scrap-metal rate.",
    sections: [
      { title: "Describe a complete vehicle or a bare shell", text: "Include the make, model and whether the engine, gearbox, wheels and other major components are present. Tell us if parts have already been removed or sold. Photos of the car and its surroundings help establish what is being offered and what collection may involve." },
      { title: "Understand the basis of the amount", text: "Material value, usable components, vehicle condition and collection logistics can all affect an offer. A quoted metal rate by weight does not establish the payout for a particular car. Ask for the vehicle offer and the towing terms together so you can compare the net result." },
      { title: "Prepare for a documented handover", text: "Confirm your authority to sell, the documents required, registration arrangements and payment method before collection. Remove personal items and toll tags. If disposal or recycling documentation matters to you, ask what record the buyer can provide before you accept." },
    ],
    faqs: [
      { question: "Will removing valuable parts increase my total return?", answer: "It can change the buyer's offer and make loading harder. Compare both options first and disclose any parts removed after an initial assessment so the terms can be updated." },
      { question: "Is a scrap-metal price a guaranteed car price?", answer: "No. Vehicle completeness, recoverable components and collection needs also matter. Request a specific offer for your vehicle and location." },
    ],
    relatedGuide: "/blog/a-guide-to-understanding-cash-for-cars-brisbane/",
  },
  "/cash-for-trucks/": {
    heading: "Cash for Trucks",
    description: "Enquire about selling a truck with its model, GVM, body type, dimensions and loading condition. Confirm capacity and access before arranging collection.",
    intro: "Truck enquiries need more than a make and year. Weight, body configuration and access determine whether a particular vehicle can be assessed and collected.",
    sections: [
      { title: "Identify the truck configuration", text: "Include the make, model, year, GVM if known, axle configuration and body type, such as a tray, van body or tipper. State whether attached equipment is included. Do not assume that a quote for a light truck also covers a heavier commercial vehicle." },
      { title: "Describe operating and loading condition", text: "Tell us whether the truck starts, steers, brakes and rolls, and whether tyres hold air. Provide approximate height and length if the body has been modified. Mention seized brakes, air-system problems or equipment that cannot be lowered before a collection plan is made." },
      { title: "Confirm suitability before clearing the site", text: "Share driveway width, overhead clearance, yard opening times and site contact details. Ask the team to confirm vehicle limits and any recovery requirements for this truck. Remove tools, stock and cargo unless they have explicitly been included in the agreement." },
    ],
    faqs: [
      { question: "Are all truck sizes accepted?", answer: "No universal size or weight limit is advertised here. Provide the truck's GVM, configuration and location so the team can confirm suitability and available collection equipment." },
      { question: "Can the truck be collected with a load still on it?", answer: "Disclose any cargo or mounted equipment and ask what must be removed. Do not assume a vehicle quote includes freight, waste or separate machinery." },
    ],
    relatedGuide: "/blog/how-to-get-cash-for-cars-in-brisbane-qld/",
  },
  "/cash-for-unwanted-cars/": {
    heading: "Cash for Unwanted Cars",
    description: "Compare an offer for a car you no longer need. Share its condition, ownership status and pickup suburb before deciding whether to sell.",
    intro: "An unwanted car may still run well. If your needs have changed, start with an accurate description and compare the convenience of collection with other selling options.",
    sections: [
      { title: "Explain what you are selling", text: "Provide the make, model, year, kilometres and registration status, plus faults and recent work. Say whether the car is a spare vehicle, a non-runner or currently used each day. The reason you no longer need it should not replace details of its actual condition." },
      { title: "Resolve authority and outstanding interests", text: "Check that you are authorised to sell the car and ask how any outstanding finance or shared ownership must be handled. If you are acting for another owner, discuss the required authority before booking. Do not assume possession of keys alone establishes the right to sell." },
      { title: "Choose the offer that fits your plans", text: "Compare the confirmed amount, pickup arrangements and any costs with your other options. If the car remains in use while you decide, tell the buyer about material changes in condition. Agree when the car will be available before committing to a handover." },
    ],
    faqs: [
      { question: "Can I enquire about a car that still drives?", answer: "Yes, describe its running condition and known faults in the enquiry. A vehicle does not need to be described as scrap simply because you no longer want it." },
      { question: "Can I sell a car for a relative?", answer: "Explain that you are acting for the owner and ask which authority documents are required. Arrange those before authorising sale or collection." },
    ],
    relatedGuide: "/blog/sell-your-car-fast-and-easy-in-brisbane/",
  },
  "/cash-for-used-cars/": {
    heading: "Cash for Used Cars",
    description: "Request a used-car offer with mileage, service history and condition details. Compare the sale terms, inspection and collection arrangements.",
    intro: "For a used car, the model variant, kilometres and maintenance history can be as useful as its age. Supply enough detail to compare an offer with your other selling choices.",
    sections: [
      { title: "Show how the car has been maintained", text: "Include the exact variant, transmission, odometer reading and registration status. Mention available service history, recent repairs and known faults. Photos of the exterior, interior and odometer help describe the vehicle; keep personal information in documents out of photos." },
      { title: "Compare convenience and net proceeds", text: "A direct offer with collection may have different terms from a private sale or trade-in. Compare the amount you would receive after any agreed costs, the time involved and the point at which an offer becomes final. Ask whether an inspection is needed before the price is confirmed." },
      { title: "Prepare the car's handover items", text: "Locate keys, ownership records and any manuals or service records included in the sale. Remove personal belongings, toll tags and paired phone information before handing over the car. Confirm payment and completed documents against the agreement." },
    ],
    faqs: [
      { question: "Will recent repairs be added dollar-for-dollar to the offer?", answer: "Do not assume repair spending equals an increase in resale value. Include the work in the enquiry so it can be considered with the car's overall condition." },
      { question: "Should I include faults on an otherwise well-kept car?", answer: "Yes. Disclosing faults before inspection makes the assessment more useful and avoids a quote based on an incomplete description." },
    ],
    relatedGuide: "/blog/selling-your-car-without-a-roadworthy-certificate/",
  },
  "/car-removal-brisbane/": {
    heading: "Car Removal Brisbane",
    description: "Plan a Brisbane car collection by checking parking access, vehicle movement, available times and handover requirements before booking.",
    intro: "A successful car removal starts with the pickup site. Tell us where the vehicle is parked and how a collection truck can reach it before a time is agreed.",
    sections: [
      { title: "Describe the route to the vehicle", text: "Include the pickup suburb and whether the vehicle is on a driveway, in a yard, on a street or in a garage. Mention narrow entrances, slopes, height restrictions and anything blocking access. Photos can help explain the site without you moving an unsafe vehicle." },
      { title: "Explain how the car can be loaded", text: "State whether it has keys, inflated tyres, steering and wheels that turn. A car that will not start may still roll; a car with seized wheels needs a different assessment. Discuss any unusual recovery requirement and its cost before confirming collection." },
      { title: "Agree on the handover plan", text: "Confirm an available collection window, the person attending and the documents to prepare. Keep the access route clear where safe. If parking or access changes after booking, contact the team so the pickup arrangement can be reviewed." },
    ],
    faqs: [
      { question: "Can a car be removed from an underground garage?", answer: "Provide the height clearance, entry layout and vehicle condition before booking. Access must be assessed; collection from every garage is not guaranteed." },
      { question: "Can I choose any collection time?", answer: "Ask for available windows for your suburb and vehicle. Distance, access and truck scheduling need to be confirmed before a booking is agreed." },
    ],
    relatedGuide: "/blog/how-to-get-cash-for-cars-in-brisbane-qld/",
  },
  "/car-recycling-brisbane/": {
    heading: "Car Recycling Brisbane",
    description: "Ask informed questions about end-of-life vehicle handling, reusable parts and recycling records before choosing a car collection arrangement.",
    intro: "If recycling is your priority, ask how the vehicle will be handled after pickup. A collection arrangement alone does not tell you where every component will go.",
    sections: [
      { title: "Understand the stages to ask about", text: "Vehicle recycling can involve removing fluids and batteries, recovering reusable parts and separating remaining materials. Ask the buyer which stages it handles and which are undertaken by other businesses. Do not assume that every collected vehicle follows an identical process." },
      { title: "Disclose materials needing special handling", text: "Mention visible leaks, damaged batteries, LPG equipment or an electric or hybrid power system. Do not drain fluids or dismantle batteries yourself for the quote. The collector needs this information to assess safe handling and whether the vehicle is suitable." },
      { title: "Request evidence that matters to you", text: "Before accepting, ask about the receiving facility, disposal documentation and any recycling claims relevant to your decision. This page does not promise a recovery percentage or certified disposal outcome. Confirm what can be documented for your specific vehicle." },
    ],
    faqs: [
      { question: "Will I receive a recycling certificate?", answer: "Ask before booking what receipt or disposal record can be supplied. A specific recycling certificate is not promised unless the team confirms it for your arrangement." },
      { question: "Should I remove the battery or drain fluids first?", answer: "Do not undertake hazardous dismantling to prepare a quote. Disclose leaks or battery damage and ask what preparation is appropriate for the vehicle." },
    ],
    relatedGuide: "/blog/a-guide-to-understanding-cash-for-cars-brisbane/",
  },
  "/free-car-removals/": {
    heading: "Free Car Removal: Check Your Pickup Terms",
    description: "Understand what to confirm about included standard towing, difficult access and unusual recovery costs before accepting a car-removal offer.",
    intro: "Standard towing is included in covered pickup arrangements. Confirm that your vehicle and access fit those terms before treating removal as cost-free.",
    sections: [
      { title: "Ask for the towing terms with the offer", text: "Provide the exact pickup suburb, vehicle description and access details when requesting a quote. Ask whether standard collection is included in the amount offered and whether any charge would be payable separately. Compare the amount you would actually receive." },
      { title: "Flag conditions outside a straightforward pickup", text: "Missing wheels, locked steering, low-clearance parking, steep access and a car stuck off a usable driveway can require a different recovery plan. Disclose these early. Ask for any additional work or cost to be explained and agreed before dispatch." },
      { title: "Keep a record of the agreed arrangement", text: "Confirm the vehicle price, towing inclusion, payment method and collection window together. If the pickup location or vehicle condition changes, ask whether the terms need to change. Do not rely on a general 'free removal' label to settle the details of a difficult recovery." },
    ],
    faqs: [
      { question: "Does free removal cover every recovery situation?", answer: "No blanket promise is made for unusual access or recovery. Describe the site and vehicle so the team can confirm whether standard towing applies and explain any other terms." },
      { question: "How can I compare offers with different towing terms?", answer: "Ask each buyer for the vehicle amount and any collection charges, then compare the net amount and agreed pickup requirements." },
    ],
    relatedGuide: "/blog/sell-your-car-fast-and-easy-in-brisbane/",
  },
  "/junk-car-removals/": {
    heading: "Junk Car Removal",
    description: "Prepare a neglected or incomplete car for a collection assessment. Explain seized parts, surrounding obstacles and any loose vehicle components.",
    intro: "Removing a neglected car often depends on what has changed around it: vegetation, flat tyres, seized wheels or stored items blocking the way.",
    sections: [
      { title: "Assess the site without disturbing the car", text: "From a safe position, note whether a truck can reach the vehicle and whether fences, sheds or other cars obstruct it. Tell us if it is on soft ground or has sunk during storage. Do not jack up a deteriorated shell or enter an unsafe space to inspect it." },
      { title: "Identify loading obstacles", text: "Explain missing wheels, disconnected suspension, locked steering and whether keys are available. Include loose vehicle components you want collected. These details help determine whether the enquiry involves a straightforward tow or recovery that needs separate arrangements." },
      { title: "Separate the vehicle from a site clean-up", text: "Remove belongings where safe and identify any unrelated waste before accepting terms. Confirm exactly what is included in the pickup, who will attend and what ownership evidence is required. If the access route cannot be cleared safely, discuss it with the team first." },
    ],
    faqs: [
      { question: "Can I book before clearing overgrown access?", answer: "Explain the overgrowth and provide safe photos first. The team needs to assess access; you should not assume a truck can reach a car hidden behind obstacles." },
      { question: "What if there are no keys?", answer: "Disclose missing keys and whether steering and wheels are locked. The team will need to confirm the loading plan and the ownership documents required." },
    ],
    relatedGuide: "/blog/how-to-get-cash-for-cars-in-brisbane-qld/",
  },
  "/old-car-removals/": {
    heading: "Old Car Removal",
    description: "Arrange an assessment for an old car that has been stored or taken off the road. Check access, keys, paperwork and safe preparation.",
    intro: "An older car that has sat unused may be harder to move than it appears. Share its storage history so collection can be planned without relying on it being road-ready.",
    sections: [
      { title: "Describe the effects of storage", text: "Tell us how long the car has been parked, whether tyres are flat and whether brakes or steering may be seized. Note any visible rust or fluid leakage. Avoid trying to start a long-stored car simply to demonstrate that it runs for the enquiry." },
      { title: "Find the handover essentials early", text: "Look for keys and documents showing your authority to sell. If the car belongs to someone else or forms part of an estate, explain your role and confirm the required authority before arranging removal. Keep personal keepsakes separate from items included in the sale." },
      { title: "Plan removal from its current position", text: "Describe garage clearance, gate width and the space available around the car. Confirm who will open the property and attend the handover. Where moving the car would be unsafe, leave it in place and ask how the collection team would approach it." },
    ],
    faqs: [
      { question: "Do I have to get a long-stored car running?", answer: "Describe it as stored and provide the known condition. Do not attempt unsafe repairs or starting procedures just to arrange an assessment." },
      { question: "Can an estate vehicle be removed straight away?", answer: "Explain the circumstances and establish who can authorise its sale and release. Required authority should be confirmed before any booking." },
    ],
    relatedGuide: "/blog/selling-your-car-without-a-roadworthy-certificate/",
  },
  "/scrap-car-removals/": {
    heading: "Scrap Car Removal",
    description: "Plan collection of a scrap vehicle or shell. Disclose missing components, loading hazards and the paperwork you need at handover.",
    intro: "A scrap vehicle can require more preparation than a complete car. The collector needs to know what remains, what can move and whether any damage affects safe loading.",
    sections: [
      { title: "Describe the shell and remaining components", text: "List missing wheels, engine, transmission or suspension parts and say whether panels or sharp edges are loose. Include a safe photo of the vehicle's current position. Do not describe a dismantled shell as a rolling car unless its wheels and structure support that description." },
      { title: "Disclose potential handling issues", text: "Mention leaks, damaged fuel systems, loose batteries and any known hazardous material. Do not place extra chemicals, scrap from other projects or household waste inside the vehicle. Ask what can be included and how any existing material should be handled." },
      { title: "Confirm release and collection records", text: "Agree on the vehicle offer, collection terms and proof of ownership requirements. If you need evidence of disposal, ask which record can be provided and retain a copy of the sale paperwork. Registration and plate arrangements should be confirmed before handover." },
    ],
    faqs: [
      { question: "Can a shell without wheels be collected?", answer: "Supply photos and details of missing parts and access. Suitability and recovery equipment must be confirmed for that shell; a standard rolling-vehicle pickup should not be assumed." },
      { question: "Can I add other scrap metal to the pickup?", answer: "Discuss it separately before accepting the arrangement. A quote for one vehicle does not automatically include other material or waste." },
    ],
    relatedGuide: "/blog/a-guide-to-understanding-cash-for-cars-brisbane/",
  },
  "/sell-my-car/": {
    heading: "Sell My Car in Brisbane",
    description: "Prepare your car details, compare a vehicle offer and confirm payment, documents and pickup before deciding to sell in Brisbane.",
    intro: "Start with the facts about your car, then decide whether the offer and collection terms suit you. Requesting a quote does not commit you to a sale.",
    sections: [
      { title: "Build a clear picture for the quote", text: "Send the make, model, year, odometer reading, registration status and pickup suburb. Describe faults, damage and missing parts, including whether the car rolls and steers. Keep photos focused on the vehicle and avoid sending identity documents through the general condition field." },
      { title: "Review the offer before making a decision", text: "Ask whether the amount is conditional on inspection, which details could change it and whether standard towing applies. Confirm the payment method and when payment will be made. Compare other selling options if you want to assess the balance between price and convenience." },
      { title: "Complete the handover deliberately", text: "Confirm your authority to sell and the paperwork required for the vehicle's registration status. Remove belongings, toll tags and paired device data. Check that the payment and completed sale records match the agreement before you release the vehicle." },
    ],
    faqs: [
      { question: "Does submitting the form agree to sell my car?", answer: "No. It requests a quote and contact about your vehicle. Review the offer and collection terms before deciding whether to proceed." },
      { question: "What should I confirm about payment?", answer: "Ask which method is available, when the funds will be provided and what confirmation you will receive. Agree these details before the vehicle is handed over." },
    ],
    relatedGuide: "/blog/sell-your-car-fast-and-easy-in-brisbane/",
  },
  "/unwanted-car-removals/": {
    heading: "Unwanted Car Removal",
    description: "Plan removal of a car you no longer need from home or another property. Confirm authority, access, timing and the handover contact.",
    intro: "Clearing an unwanted car from a property involves the vehicle owner as well as the pickup site. Establish who can approve the sale and who can provide access.",
    sections: [
      { title: "Confirm the right to remove and sell it", text: "If the car is yours, prepare evidence of ownership or authority. If it belongs to a tenant, neighbour, relative or previous occupant, do not assume control of the property gives you the right to sell it. Resolve authority before requesting a collection booking." },
      { title: "Coordinate with the property contact", text: "Tell us whether the car is at a home, workplace or storage site and who can unlock gates or arrange access. Mention body-corporate or site restrictions where relevant. Ensure the person attending understands which vehicle and items are included in the agreed sale." },
      { title: "Make the timing practical", text: "If you need space before a move or property handover, share the preferred date and ask which collection windows are available. Do not assume a deadline is booked until it is confirmed. Update the team promptly if the vehicle moves or access changes." },
    ],
    faqs: [
      { question: "Can you take an apparently abandoned car from my property?", answer: "Do not authorise a sale or removal without establishing the legal right to do so. Seek the relevant owner's or authority's guidance, and explain the circumstances before making an enquiry." },
      { question: "Can someone else attend the pickup for me?", answer: "Discuss this before booking and ask which written authority and identification are required. The attending person should know the agreed handover terms." },
    ],
    relatedGuide: "/blog/how-to-get-cash-for-cars-in-brisbane-qld/",
  },
  "/unwanted-truck-removals/": {
    heading: "Unwanted Truck Removal",
    description: "Plan an unwanted-truck collection with weight, dimensions, access and site requirements. Confirm equipment suitability before arranging a handover.",
    intro: "Removing a truck from a yard, workshop or business site takes coordination. Vehicle dimensions and site rules should be assessed together before a booking is confirmed.",
    sections: [
      { title: "Provide dimensions and loading condition", text: "Send the truck's model, GVM if known, axle configuration and body type. Explain seized brakes, flat tyres, missing keys and whether it can steer. Include the approximate height and length, especially for added bodies or mounted equipment." },
      { title: "Describe commercial-site access", text: "Provide gate width, turning space, overhead obstructions and site opening times. Mention inductions or access permissions the collector would need. Ask whether the truck and site fit the available collection equipment; heavy-vehicle capacity must be confirmed individually." },
      { title: "Agree which business assets are included", text: "Identify tools, cargo, signage, attachments and tracking devices that must be removed or expressly included. Confirm that the person approving the sale has authority for the business vehicle. Arrange a site contact and retain the agreed sale and collection documents." },
    ],
    faqs: [
      { question: "Will a pickup include removing commercial cargo?", answer: "Do not assume cargo or separate equipment is included. List what is on the truck and agree what must be removed before collection." },
      { question: "Can collection be arranged around yard opening times?", answer: "Provide the site's permitted hours and contact details. The team needs to confirm a compatible collection window and any site-entry requirements." },
    ],
    relatedGuide: "/blog/how-to-get-cash-for-cars-in-brisbane-qld/",
  },
  "/used-car-removals/": {
    heading: "Used Car Removal",
    description: "Prepare a used car for collection after agreeing a sale. Check registration arrangements, personal data, keys, payment and vehicle condition.",
    intro: "Collection of a usable car is a handover of both the vehicle and its records. Prepare the items included in the sale and confirm the details before pickup day.",
    sections: [
      { title: "Confirm the vehicle stays as described", text: "If you continue using the car between the quote and pickup, advise the buyer of new damage, faults or a significant change in kilometres. Agree which accessories, spare keys and service records are included. Avoid removing included parts without updating the arrangement." },
      { title: "Prepare registration and personal items", text: "Ask how the vehicle's registration, plates and any required safety certificate will be handled for your sale. Remove belongings and toll tags, then clear paired phones and personal addresses from vehicle systems. Keep identity documents secure for the agreed ownership check." },
      { title: "Check the final handover", text: "Confirm the pickup window, location, payment method and person attending. Review the completed vehicle and sale details before signing. Retain the agreed records and proof of payment, and release the keys and vehicle in line with the confirmed arrangement." },
    ],
    faqs: [
      { question: "Can I keep driving the car until collection?", answer: "Confirm the arrangement with the buyer and tell them about changes in condition or significant mileage. Whether the car is safe and legal to drive is a separate matter from the quote." },
      { question: "What personal data should I remove from the car?", answer: "Check the car's own instructions for removing paired phones, saved addresses and connected accounts. Remove physical belongings and toll tags as well." },
    ],
    relatedGuide: "/blog/selling-your-car-without-a-roadworthy-certificate/",
  },
};

export const GENERAL_FAQS: QuestionAnswer[] = [
  { question: "How is the offer calculated?", answer: "The vehicle's make, model, age, condition, location, completeness and recoverable value all affect the offer. Describe known faults and ask which details will be checked before a price is final." },
  { question: "Is standard towing included?", answer: "Standard pickup in covered service areas is included. Tell us about difficult access, missing wheels or unusual recovery requirements and confirm the terms for your vehicle before booking." },
  { question: "What documents should I prepare?", answer: "You will normally need photo identification and proof that you are authorised to sell the vehicle. Ask the team to confirm the exact requirements, including any registration arrangements, before pickup." },
  { question: "Do I have to accept the quote?", answer: "No. Quotes are free and there is no obligation to proceed. Review the offer, payment method and collection terms before deciding." },
  { question: "Can I request a quote for a car that does not start?", answer: "Describe the fault and whether the car can roll and steer. Mention missing keys or wheels, so the team can assess the vehicle and its loading requirements." },
  { question: "When will the vehicle be collected?", answer: "Ask for available collection windows for your suburb. Distance, safe access and truck scheduling must be confirmed; a quote request is not a confirmed booking." },
  { question: "Do I need a roadworthy certificate for an initial quote?", answer: "A certificate is not needed just to request a quote. Requirements at the point of sale depend on registration status and the buyer. Check current Queensland Government safety-certificate guidance and confirm which situation applies before handover." },
  { question: "How will I be paid?", answer: "Confirm the available payment method and timing with the team before accepting the offer. At handover, check that payment and the completed documents match the arrangement you agreed." },
  { question: "What if the quote form does not work?", answer: "Call the phone number shown on this page or use the email address on the contact page. An error message does not confirm that a quote request has been accepted." },
];
