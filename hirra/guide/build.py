#!/usr/bin/env python3
# Hirra guide, static SEO content engine.
# Renders /hirra/guide/ hub + one page per article from the ARTICLES data below,
# using one shared brand template. Add an article = append a dict, re-run.
#   python3 build.py
# Emits: index.html (hub), <slug>/index.html (each article), and prints
# sitemap <url> blocks to paste into ../../sitemap.xml.
#
# House rules honoured: no em-dashes, Western digits, non-diagnostic framing
# (Hirra notices and routes to a vet, never diagnoses), calm brand voice.

import os

SITE = "https://aykizintelligence.com"
BASE = "/hirra/guide/"
APPSTORE = "https://apps.apple.com/us/app/hirra-cat-health-tracker/id6782975522"
UPDATED = "2026-07-16"

APPSTORE_BADGE = (
    '<a class="badge" href="' + APPSTORE + '" target="_blank" rel="noopener">'
    '<svg viewBox="0 0 384 512" width="15" height="15" fill="currentColor" aria-hidden="true">'
    '<path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z"/>'
    '</svg> Free on the App Store</a>'
)

# ------------------------------------------------------------------ articles

ARTICLES = [
 {
  "slug": "is-chocolate-safe-for-cats",
  "cat": "Food safety",
  "verdict": "danger",  # danger | caution | safe
  "verdict_label": "Toxic, never safe",
  "title": "Is Chocolate Safe for Cats? No, and Here Is What to Do",
  "h1": "Is chocolate safe for cats?",
  "desc": "Chocolate is toxic to cats. Learn why, how much is dangerous, the warning signs of poisoning, and exactly what to do if your cat ate chocolate.",
  "keywords": "is chocolate safe for cats, can cats eat chocolate, cat ate chocolate, chocolate poisoning cats, theobromine cats",
  "tldr": "No. Chocolate is toxic to cats. It contains theobromine and caffeine, which cats cannot process. Even a small amount can cause a racing heart, tremors, and seizures. If your cat has eaten any chocolate, call a vet or an emergency clinic now.",
  "sections": [
   ("Why chocolate is toxic to cats",
    "<p>Chocolate contains <strong>theobromine</strong> and caffeine, two stimulants that humans clear from the body quickly but cats cannot. They build up and overstimulate the heart and nervous system. Cats are far more sensitive to theobromine than people are, and because a cat is small, it does not take much.</p>"
    "<p>Darker chocolate is more dangerous. Baking chocolate and cocoa powder hold the most theobromine, dark chocolate is next, and milk chocolate the least, but none of it is safe for a cat.</p>"),
   ("How much chocolate is dangerous",
    "<p>There is no safe amount. Because cats rarely eat sweet things by choice, poisoning is uncommon, but when it happens even a lick of a strong chocolate or a piece of a baked good can be enough to cause signs in a small cat. Treat any amount as a reason to call a vet, especially with dark or baking chocolate.</p>"),
   ("Signs of chocolate poisoning in cats",
    "<ul>"
    "<li>Vomiting or diarrhoea</li>"
    "<li>Restlessness, pacing, or unusual excitement</li>"
    "<li>Fast or irregular heartbeat</li>"
    "<li>Muscle tremors or twitching</li>"
    "<li>Increased thirst and urination</li>"
    "<li>Seizures in severe cases</li>"
    "</ul>"
    "<p>Signs can take several hours to appear. Do not wait for them if you know your cat ate chocolate.</p>"),
   ("What to do if your cat ate chocolate",
    "<ol>"
    "<li><strong>Call a vet or emergency clinic immediately.</strong> Have the type of chocolate and a rough amount ready to tell them.</li>"
    "<li>Do not try to make your cat vomit at home unless a vet tells you to.</li>"
    "<li>Keep the wrapper or packaging so the vet can judge the theobromine load.</li>"
    "<li>Watch for the signs above on the way to care.</li>"
    "</ol>"),
  ],
  "faqs": [
   ("Can cats eat white chocolate?", "White chocolate has very little theobromine, but it is still high in fat and sugar and offers a cat nothing. Keep all chocolate away from cats."),
   ("My cat licked a little chocolate and seems fine. Should I worry?", "Signs can take hours to show. Call a vet with the type and amount so they can tell you whether to watch at home or come in."),
   ("Is cocoa or hot chocolate dangerous too?", "Yes. Cocoa powder is one of the most concentrated forms of theobromine. Milky chocolate drinks also add dairy, which most cats cannot digest well."),
  ],
  "related": ["is-xylitol-and-human-food-safe-for-cats", "safe-human-foods-for-cats", "is-grapes-and-raisins-safe-for-cats"],
 },
 {
  "slug": "is-onion-and-garlic-safe-for-cats",
  "cat": "Food safety",
  "verdict": "danger",
  "verdict_label": "Toxic, never safe",
  "title": "Are Onions and Garlic Safe for Cats? No, the Hidden Danger",
  "h1": "Are onions and garlic safe for cats?",
  "desc": "Onions and garlic are toxic to cats, even cooked or powdered. Learn why they damage red blood cells, the signs to watch, and what to do.",
  "keywords": "are onions safe for cats, is garlic safe for cats, can cats eat onion, garlic toxic cats, onion poisoning cats",
  "tldr": "No. Onion, garlic, leek, and chives are all toxic to cats, whether raw, cooked, or as a powder. They damage a cat's red blood cells and can cause a dangerous anaemia days later. The danger often hides in seasoned human food like broth, baby food, and gravy.",
  "sections": [
   ("Why onion and garlic are toxic to cats",
    "<p>Onions, garlic, leeks, shallots, and chives all belong to the <em>allium</em> family. They contain compounds that damage the membranes of a cat's red blood cells, causing the cells to break down. The result is a condition called <strong>haemolytic anaemia</strong>, where the cat no longer has enough healthy red cells to carry oxygen.</p>"
    "<p>Cooking, drying, or powdering does not remove the danger. Garlic is several times more potent than onion by weight.</p>"),
   ("The hidden sources that catch owners out",
    "<p>Cats rarely eat a raw onion. The real risk is seasoned human food:</p>"
    "<ul>"
    "<li>Onion or garlic powder in gravy, soup, and broth</li>"
    "<li>Baby food (often contains onion powder)</li>"
    "<li>Seasoned meat, sausages, and takeaway leftovers</li>"
    "<li>Some commercial foods not made for cats</li>"
    "</ul>"
    "<p>Sharing a spoon of seasoned dinner is the most common way cats are exposed.</p>"),
   ("Signs of onion or garlic poisoning",
    "<p>Signs are often delayed by a few days as the anaemia develops:</p>"
    "<ul>"
    "<li>Lethargy and weakness</li>"
    "<li>Pale gums</li>"
    "<li>Rapid breathing or a fast heart rate</li>"
    "<li>Reduced appetite</li>"
    "<li>Reddish or dark urine</li>"
    "</ul>"),
   ("What to do",
    "<ol>"
    "<li>Call a vet if your cat has eaten anything containing onion or garlic, even if it seems fine now.</li>"
    "<li>Tell them the source and rough amount.</li>"
    "<li>Because signs are delayed, early advice matters. Do not wait for pale gums to appear.</li>"
    "</ol>"),
  ],
  "faqs": [
   ("Is a tiny bit of garlic in food really harmful?", "The risk depends on amount and the cat's size, but there is no proven safe dose, and garlic is potent. It is safest to keep all allium foods away from cats and to call a vet if they have had any."),
   ("Are onion and garlic safe if cooked?", "No. Cooking does not break down the toxic compounds. Cooked, raw, or powdered, they are all a risk."),
   ("What about garlic supplements for fleas?", "Garlic is not a safe or effective flea treatment for cats and can cause the anaemia described above. Use a vet-recommended flea product instead."),
  ],
  "related": ["safe-human-foods-for-cats", "is-chocolate-safe-for-cats", "why-is-my-cat-drinking-so-much-water"],
 },
 {
  "slug": "is-grapes-and-raisins-safe-for-cats",
  "cat": "Food safety",
  "verdict": "danger",
  "verdict_label": "Treat as an emergency",
  "title": "Are Grapes and Raisins Safe for Cats? Treat It as an Emergency",
  "h1": "Are grapes and raisins safe for cats?",
  "desc": "Grapes and raisins can cause sudden kidney failure in cats. Learn the warning signs and why any amount is an emergency.",
  "keywords": "are grapes safe for cats, can cats eat raisins, grape toxicity cats, raisin poisoning cats, cat ate grape",
  "tldr": "No, and it should be treated as an emergency. Grapes and raisins have caused sudden kidney failure in cats and dogs even in small amounts. The toxic dose is unpredictable, so any ingestion is a reason to call a vet or emergency clinic right away.",
  "sections": [
   ("Why grapes and raisins are so dangerous",
    "<p>Grapes, raisins, currants, and sultanas have been linked to sudden, severe kidney injury in pets. What makes them frightening is that the reaction is unpredictable: some animals eat them with no effect, others develop kidney failure from a small amount. Because there is no way to know in advance which cat will react, vets treat every ingestion as a potential emergency.</p>"
    "<p>The danger hides in baked goods too, such as raisin bread, cookies, cereal, and trail mix.</p>"),
   ("Signs to watch for",
    "<ul>"
    "<li>Vomiting or diarrhoea, often within a few hours</li>"
    "<li>Lethargy and weakness</li>"
    "<li>Loss of appetite</li>"
    "<li>Reduced urination or none at all (a sign the kidneys are failing)</li>"
    "<li>Increased thirst</li>"
    "</ul>"),
   ("What to do if your cat ate a grape or raisin",
    "<ol>"
    "<li><strong>Call a vet or emergency clinic immediately.</strong> Early treatment protects the kidneys before damage sets in.</li>"
    "<li>Do not wait to see if signs appear. By the time the kidneys are affected, treatment is much harder.</li>"
    "<li>Tell the vet how many, and roughly when.</li>"
    "</ol>"),
  ],
  "faqs": [
   ("How many grapes are toxic to a cat?", "There is no known safe amount. The reaction is unpredictable, so any amount is treated as an emergency."),
   ("My cat ate one raisin and seems fine. Is that ok?", "Call a vet anyway. Early action to protect the kidneys is far more effective than waiting for signs, which may mean damage has already begun."),
  ],
  "related": ["why-is-my-cat-drinking-so-much-water", "is-chocolate-safe-for-cats", "is-xylitol-and-human-food-safe-for-cats"],
 },
 {
  "slug": "is-milk-and-dairy-safe-for-cats",
  "cat": "Food safety",
  "verdict": "caution",
  "verdict_label": "Best avoided",
  "title": "Is Milk Safe for Cats? The Truth Behind the Myth",
  "h1": "Is milk safe for cats?",
  "desc": "Most cats are lactose intolerant. Learn why milk upsets a cat's stomach, the myth behind the saucer of milk, and what to offer instead.",
  "keywords": "is milk safe for cats, can cats drink milk, are cats lactose intolerant, cat dairy, cat milk myth",
  "tldr": "Not really. Most adult cats are lactose intolerant, so cow's milk commonly causes stomach upset and diarrhoea. It is not toxic, but it offers no benefit and can make a cat unwell. Fresh water is what your cat actually needs.",
  "sections": [
   ("The saucer-of-milk myth",
    "<p>The image of a cat lapping cream is charming and wrong. Kittens produce an enzyme called lactase to digest their mother's milk, but most cats lose much of it as they grow up. Without enough lactase, the lactose in cow's milk passes undigested into the gut, draws in water, and ferments, which causes cramping and diarrhoea.</p>"),
   ("Why it matters more than an upset stomach",
    "<p>A one-off saucer of milk is not poison, but loose stools mean lost fluid, and cats are prone to dehydration and to hiding when they feel unwell. For a senior cat or one already being watched for kidney or urinary trouble, an avoidable stomach upset is worth skipping.</p>"),
   ("What to offer instead",
    "<ul>"
    "<li><strong>Fresh water</strong>, changed daily. A wide bowl or a pet fountain encourages drinking.</li>"
    "<li>If you want a treat drink, specially made lactose-free cat milk exists, in small amounts.</li>"
    "<li>Wet food adds moisture to the diet, which helps cats who do not drink much.</li>"
    "</ul>"),
  ],
  "faqs": [
   ("Can kittens drink cow's milk?", "No. Kittens need their mother's milk or a proper kitten milk replacer. Cow's milk lacks the right nutrition and can cause diarrhoea, which is dangerous in a small kitten."),
   ("Is cheese or yoghurt safe for cats?", "In tiny amounts they are usually less of a problem than milk because they contain less lactose, but they are still not needed and are high in fat and salt. Best kept as a rare, tiny treat if at all."),
   ("Is lactose-free cat milk ok?", "Yes, in small amounts as an occasional treat. It is not a substitute for water or food."),
  ],
  "related": ["safe-human-foods-for-cats", "why-is-my-cat-drinking-so-much-water", "is-tuna-safe-for-cats"],
 },
 {
  "slug": "is-tuna-safe-for-cats",
  "cat": "Food safety",
  "verdict": "caution",
  "verdict_label": "Occasional treat only",
  "title": "Is Tuna Safe for Cats? Why It Should Be a Rare Treat",
  "h1": "Is tuna safe for cats?",
  "desc": "Cats love tuna, but too much causes problems. Learn why canned tuna is not a complete food and how to give it safely.",
  "keywords": "is tuna safe for cats, can cats eat tuna, tuna for cats, canned tuna cat, tuna addiction cat",
  "tldr": "In small amounts, occasionally, yes. But tuna is not a complete food for cats. Fed often it can crowd out balanced nutrition, add too much mercury and salt, and some cats become fussy and refuse their proper food. Keep it to a rare treat.",
  "sections": [
   ("Why cats find tuna irresistible but it is not a meal",
    "<p>Tuna is strong-smelling and rich, so cats love it, but canned tuna made for people is missing nutrients a cat needs, such as the right balance of taurine, vitamin E, and calcium. A diet heavy in tuna can lead to deficiencies over time. It is a flavour, not a food.</p>"),
   ("The real risks of too much tuna",
    "<ul>"
    "<li><strong>Nutritional imbalance</strong> if it replaces complete cat food</li>"
    "<li><strong>Mercury</strong> builds up with frequent feeding</li>"
    "<li><strong>Excess salt and oil</strong> in tuna packed for humans</li>"
    "<li><strong>Fussiness</strong>, where a cat holds out for tuna and refuses balanced meals</li>"
    "</ul>"),
   ("How to give tuna safely",
    "<ol>"
    "<li>Offer a small flake occasionally, not as a regular meal.</li>"
    "<li>Choose tuna in spring water, not brine or oil, and never seasoned.</li>"
    "<li>Keep it under about a tenth of the day's food, the same rule as any treat.</li>"
    "</ol>"),
  ],
  "faqs": [
   ("Can cats eat tuna every day?", "No. Daily tuna risks nutritional deficiencies and mercury build-up, and encourages fussiness. Keep it occasional."),
   ("Is raw tuna safe for cats?", "Raw fish carries a risk of bacteria and parasites and contains an enzyme that destroys a B vitamin cats need. Cooked, plain, and occasional is safer."),
  ],
  "related": ["safe-human-foods-for-cats", "is-milk-and-dairy-safe-for-cats", "cat-not-eating-what-to-do"],
 },
 {
  "slug": "is-xylitol-and-human-food-safe-for-cats",
  "cat": "Food safety",
  "verdict": "danger",
  "verdict_label": "Several are emergencies",
  "title": "Human Foods and Medicines That Are Dangerous for Cats",
  "h1": "Human foods and medicines that are dangerous for cats",
  "desc": "A quick-reference list of common household foods, sweeteners, and medicines that are toxic to cats, and what to do if your cat gets into them.",
  "keywords": "human food toxic to cats, is xylitol safe for cats, paracetamol cats, foods poisonous to cats, cat poison list",
  "tldr": "Several everyday items are dangerous to cats. Xylitol sweetener, paracetamol and other human painkillers, alcohol, caffeine, and raw dough can all be emergencies. When in doubt, call a vet before giving your cat anything meant for people.",
  "sections": [
   ("The high-danger list",
    "<ul>"
    "<li><strong>Xylitol</strong> (sugar-free gum, sweets, some peanut butters and medicines), an emergency</li>"
    "<li><strong>Paracetamol / acetaminophen</strong>, even one tablet can be fatal to a cat; never give human painkillers</li>"
    "<li><strong>Ibuprofen and aspirin</strong>, toxic to cats</li>"
    "<li><strong>Alcohol</strong>, in any drink or food</li>"
    "<li><strong>Caffeine</strong>, coffee, tea, energy drinks</li>"
    "<li><strong>Raw yeast dough</strong>, expands and ferments in the stomach</li>"
    "<li><strong>Chocolate</strong>, <strong>onion and garlic</strong>, <strong>grapes and raisins</strong> (see the dedicated guides)</li>"
    "</ul>"),
   ("Medicines are the biggest hidden danger",
    "<p>The single most important rule: <strong>never give your cat a human medicine unless a vet has told you the exact drug and dose.</strong> Cats lack the liver enzymes to process many common drugs. Paracetamol is the clearest example, a normal human dose can be fatal. Keep all pills, and any dropped tablets, well out of reach.</p>"),
   ("What to do if your cat swallowed something toxic",
    "<ol>"
    "<li>Call a vet or emergency clinic immediately. Speed matters most with toxins.</li>"
    "<li>Bring the packaging so they know the substance and strength.</li>"
    "<li>Do not induce vomiting unless told to by a vet.</li>"
    "</ol>"),
  ],
  "faqs": [
   ("Why is xylitol so dangerous?", "Xylitol can cause a rapid, dangerous drop in blood sugar and liver damage. It hides in sugar-free gum, sweets, some peanut butters, and medicines. Treat any ingestion as an emergency."),
   ("Can I give my cat a small dose of paracetamol for pain?", "No, never. Paracetamol is extremely toxic to cats and even one tablet can be fatal. Only a vet can prescribe safe pain relief for a cat."),
  ],
  "related": ["is-chocolate-safe-for-cats", "is-grapes-and-raisins-safe-for-cats", "is-onion-and-garlic-safe-for-cats"],
 },
 {
  "slug": "safe-human-foods-for-cats",
  "cat": "Food safety",
  "verdict": "safe",
  "verdict_label": "Safe in small amounts",
  "title": "What Human Foods Are Safe for Cats? A Simple List",
  "h1": "What human foods are safe for cats?",
  "desc": "A short list of human foods cats can eat safely in small amounts, plus the golden rule that keeps treats from unbalancing their diet.",
  "keywords": "safe human foods for cats, what can cats eat, human food cats can eat, cat treats from kitchen, foods safe for cats",
  "tldr": "A few plain, unseasoned human foods are safe for cats in small amounts: cooked plain meat, cooked egg, a little cooked fish, and some plain cooked vegetables. The rule: treats should stay under about a tenth of the day's calories, and complete cat food should always be the main diet.",
  "sections": [
   ("Foods that are usually safe in small amounts",
    "<ul>"
    "<li><strong>Cooked plain meat</strong>, chicken, turkey, or beef, no seasoning, skin, or bones</li>"
    "<li><strong>Cooked egg</strong>, scrambled or boiled, plain</li>"
    "<li><strong>Cooked fish</strong>, a small flake occasionally, not daily (see the tuna guide)</li>"
    "<li><strong>Plain cooked pumpkin or carrot</strong>, a little, some cats enjoy it</li>"
    "<li><strong>A few plain cooked peas or green beans</strong></li>"
    "</ul>"
    "<p>Plain is the key word. No salt, butter, oil, onion, or garlic.</p>"),
   ("The one rule that keeps treats safe",
    "<p>Even safe foods become a problem in quantity. Keep all treats together under roughly <strong>ten percent</strong> of your cat's daily calories, and let a complete, balanced cat food do the real feeding. Cats are obligate carnivores: they need meat-based nutrition, not a plate of human leftovers.</p>"),
   ("Foods to always avoid",
    "<p>Keep away from onion, garlic, chocolate, grapes and raisins, alcohol, caffeine, xylitol, raw dough, and anything seasoned. Each has its own guide in this section. When unsure about a specific food, check it before you offer it.</p>"),
  ],
  "faqs": [
   ("Can cats eat cooked chicken?", "Yes, plain cooked chicken with no seasoning, skin, or bones is a safe treat in small amounts. It should not replace complete cat food."),
   ("Are vegetables good for cats?", "Cats are obligate carnivores and do not need vegetables, but a little plain cooked pumpkin, carrot, or green bean is safe and some cats like it. Meat-based nutrition should always be the main diet."),
   ("How many treats a day is ok?", "Keep all treats combined under about a tenth of your cat's daily calories, so they do not unbalance the diet."),
  ],
  "related": ["is-tuna-safe-for-cats", "is-milk-and-dairy-safe-for-cats", "is-xylitol-and-human-food-safe-for-cats"],
 },
 {
  "slug": "why-is-my-cat-drinking-so-much-water",
  "cat": "Symptoms",
  "verdict": "caution",
  "verdict_label": "Worth a vet's attention",
  "title": "Why Is My Cat Drinking So Much Water? Common Causes",
  "h1": "Why is my cat drinking so much water?",
  "desc": "A cat drinking much more than usual can be an early sign of kidney disease, diabetes, or thyroid trouble. Learn what is normal and when to see a vet.",
  "keywords": "why is my cat drinking so much water, cat drinking a lot, increased thirst cat, cat kidney disease signs, cat diabetes thirst",
  "tldr": "A noticeable, lasting rise in thirst is one of the earliest signs of kidney disease, diabetes, or an overactive thyroid in cats, especially older ones. It is often the first thing owners spot. If your cat is drinking clearly more than its normal, it is worth a vet check, and it helps to have tracked when the change began.",
  "sections": [
   ("What counts as drinking too much",
    "<p>The signal that matters is a change from <em>your cat's own normal</em>. A cat that always drank little and now empties the bowl, hangs around taps, or drinks from unusual places has changed, and that change is the clue. Cats on dry food naturally drink more than cats on wet food, so compare each cat to itself, not to a chart.</p>"),
   ("The three common causes to know",
    "<ul>"
    "<li><strong>Kidney disease</strong>, very common in older cats. Failing kidneys cannot concentrate urine, so the cat drinks and urinates more to keep up.</li>"
    "<li><strong>Diabetes</strong>, high blood sugar spills into the urine and pulls water with it, driving thirst. Often paired with a big appetite but weight loss.</li>"
    "<li><strong>Overactive thyroid (hyperthyroidism)</strong>, speeds up the whole body in older cats, raising thirst, appetite, and restlessness while weight drops.</li>"
    "</ul>"
    "<p>All three are manageable when caught early, and all three often show increased thirst before anything else.</p>"),
   ("Why catching it early changes the outcome",
    "<p>These conditions develop quietly. By the time a cat looks obviously unwell, the disease is usually advanced. The rise in thirst is a rare early window. Noticing it, noting when it started, and bringing it to a vet can mean earlier treatment and a better outcome. This is exactly the kind of slow drift that is hard to judge from memory, which is why keeping a simple daily record helps.</p>"),
   ("When to see a vet",
    "<p>Book a vet visit if the increased thirst lasts more than a few days, or sooner if it comes with weight loss, a bigger or smaller appetite, more urination, vomiting, or low energy. Bring any notes on when the change began and what else you have noticed.</p>"),
  ],
  "faqs": [
   ("How much water should a cat drink a day?", "As a rough guide a cat needs roughly 50 ml of water per kilogram of body weight per day, from food and drink combined, but the useful signal is a change from your cat's own normal rather than an exact number."),
   ("Is increased thirst always serious?", "Not always, hot weather, dry food, or a salty treat can raise it briefly. A lasting increase, or one paired with weight or appetite changes, deserves a vet check."),
   ("Can I track my cat's drinking?", "Yes, and it helps a vet a lot. Noting water, appetite, litter, and weight over time reveals drift you would miss day to day. Hirra does this in a five-second daily check-in and flags the patterns that matter."),
  ],
  "related": ["cat-not-eating-what-to-do", "cat-losing-weight-but-still-eating", "is-grapes-and-raisins-safe-for-cats"],
 },
 {
  "slug": "cat-not-eating-what-to-do",
  "cat": "Symptoms",
  "verdict": "caution",
  "verdict_label": "Do not wait it out",
  "title": "My Cat Is Not Eating: What It Means and What to Do",
  "h1": "My cat is not eating. What should I do?",
  "desc": "A cat that stops eating can become seriously ill fast. Learn why loss of appetite is urgent in cats and when to call a vet.",
  "keywords": "cat not eating, cat loss of appetite, cat won't eat, cat anorexia, cat stopped eating what to do",
  "tldr": "A cat that will not eat needs attention quickly. Unlike some animals, cats can develop a serious liver problem within a couple of days of not eating, especially if overweight. If your cat has eaten little or nothing for 24 hours, call a vet. If it is also lethargic, vomiting, or hiding, call sooner.",
  "sections": [
   ("Why a cat not eating is more urgent than it seems",
    "<p>When a cat stops eating, its body starts breaking down fat for energy. In cats, this can overwhelm the liver and cause a dangerous condition called <strong>hepatic lipidosis</strong> (fatty liver), which can develop in as little as a couple of days and is more likely in overweight cats. This is why loss of appetite is treated more urgently in cats than in many other pets.</p>"),
   ("Common reasons a cat stops eating",
    "<ul>"
    "<li>Dental pain or mouth problems</li>"
    "<li>Nausea from kidney, liver, or digestive trouble</li>"
    "<li>Stress or a change in environment, food, or routine</li>"
    "<li>Pain anywhere in the body</li>"
    "<li>A hidden illness the cat is masking</li>"
    "</ul>"),
   ("When to call a vet",
    "<ul>"
    "<li><strong>Now</strong>, if not eating comes with vomiting, lethargy, hiding, or laboured breathing.</li>"
    "<li><strong>Within 24 hours</strong>, if a cat has eaten little or nothing for a day, sooner for kittens, seniors, or overweight cats.</li>"
    "</ul>"
    "<p>Do not try to wait it out. Early is always safer than late with a cat that will not eat.</p>"),
  ],
  "faqs": [
   ("How long can a cat safely go without eating?", "Not long. A cat that eats little or nothing for about 24 hours should see a vet, because the risk of fatty liver rises quickly, especially in overweight cats."),
   ("My cat eats less but not nothing. Is that ok?", "A lasting drop in appetite still matters, particularly with weight loss or other changes. Track it and mention it to your vet."),
  ],
  "related": ["why-is-my-cat-drinking-so-much-water", "cat-losing-weight-but-still-eating", "cat-breathing-fast-what-to-do"],
 },
 {
  "slug": "cat-losing-weight-but-still-eating",
  "cat": "Symptoms",
  "verdict": "caution",
  "verdict_label": "Worth a vet's attention",
  "title": "Cat Losing Weight but Still Eating: What It Could Mean",
  "h1": "My cat is losing weight but still eating. Why?",
  "desc": "Weight loss in a cat with a normal or big appetite is a classic early sign of thyroid disease or diabetes. Learn what to watch and when to act.",
  "keywords": "cat losing weight but eating, cat weight loss normal appetite, hyperthyroidism cat, diabetes cat weight loss, cat thin still eating",
  "tldr": "Losing weight while eating well is a classic pattern in cats and often points to an overactive thyroid or diabetes, especially in middle-aged and older cats. It develops slowly, so it is easy to miss without tracking. A vet visit and a simple blood test can catch it early, when it is very manageable.",
  "sections": [
   ("Why eating well and still losing weight is a red flag",
    "<p>It sounds contradictory, and that is exactly why it matters. When a cat eats normally or even more than usual but keeps losing weight, the body is burning through fuel faster than food can replace it, or is not absorbing the nutrition. Two common causes do exactly this:</p>"
    "<ul>"
    "<li><strong>Overactive thyroid (hyperthyroidism)</strong>, the sped-up metabolism burns weight off despite a big appetite, often with increased thirst and restlessness.</li>"
    "<li><strong>Diabetes</strong>, the body cannot use its sugar for energy, so it breaks down fat and muscle while the cat eats and drinks more.</li>"
    "</ul>"
    "<p>Digestive disease and, in older cats, other serious conditions can also cause it.</p>"),
   ("Why it is so easy to miss",
    "<p>Cats lose weight gradually, and a cat that is eating happily does not look sick. Owners often notice only when the cat feels bonier on a stroke or a photo from months ago looks different. Weighing at home, or a simple monthly note, turns an invisible drift into something you can catch. A change of even a few percent of body weight is worth a vet's attention in a cat.</p>"),
   ("What to do",
    "<ol>"
    "<li>Book a vet visit. A basic blood test can check thyroid and blood sugar and usually gives a clear answer.</li>"
    "<li>Bring any record of the weight change and when it started, plus notes on thirst, appetite, and energy.</li>"
    "<li>Both thyroid disease and diabetes are very treatable when caught early.</li>"
    "</ol>"),
  ],
  "faqs": [
   ("How much weight loss in a cat is concerning?", "Because cats are small, even losing a few percent of body weight can matter. A steady downward trend, not a one-off reading, is the signal to act on."),
   ("Can I weigh my cat at home?", "Yes. Weigh yourself holding the cat, then subtract your own weight, or use a pet or baby scale. Tracking it over time is what reveals the trend. Hirra records weight and flags a concerning drift automatically."),
  ],
  "related": ["why-is-my-cat-drinking-so-much-water", "cat-not-eating-what-to-do", "cat-breathing-fast-what-to-do"],
 },
 {
  "slug": "cat-breathing-fast-what-to-do",
  "cat": "Symptoms",
  "verdict": "danger",
  "verdict_label": "Can be an emergency",
  "title": "Cat Breathing Fast: When It Is an Emergency",
  "h1": "My cat is breathing fast. Is it an emergency?",
  "desc": "Rapid or laboured breathing in a resting cat can be a medical emergency. Learn the resting breathing rate check vets use and when to act now.",
  "keywords": "cat breathing fast, cat rapid breathing, cat breathing hard, resting respiratory rate cat, cat panting emergency",
  "tldr": "A cat breathing fast or hard while at rest can be a genuine emergency and should be checked by a vet urgently. A calm, resting cat normally takes fewer than about 30 breaths per minute. Open-mouth breathing, panting, or effort to breathe means call an emergency vet now.",
  "sections": [
   ("The at-home check vets rely on: resting breathing rate",
    "<p>One of the most useful things an owner can measure is the <strong>resting respiratory rate</strong>: how many breaths your cat takes per minute while asleep or fully settled and not purring. Count each rise and fall of the chest as one breath for 30 seconds, then double it.</p>"
    "<ul>"
    "<li><strong>Under about 30 breaths per minute</strong> at rest is normal for most cats.</li>"
    "<li><strong>Consistently 30 to 40</strong> at rest is worth a prompt vet conversation.</li>"
    "<li><strong>Over 40</strong> at rest, or any effort to breathe, is urgent.</li>"
    "</ul>"
    "<p>Because it is measured at rest, purring, play, heat, or stress do not count, wait until the cat is truly settled.</p>"),
   ("Signs that mean call an emergency vet now",
    "<ul>"
    "<li>Open-mouth breathing or panting (cats rarely pant, so it is a warning sign)</li>"
    "<li>Belly heaving with each breath, or breathing that looks like effort</li>"
    "<li>Blue, grey, or very pale gums</li>"
    "<li>Stretched-out neck, elbows held away from the body, unwilling to lie down</li>"
    "<li>Sudden distress or collapse</li>"
    "</ul>"),
   ("What to do",
    "<ol>"
    "<li>Keep your cat calm and cool. Stress makes breathing harder.</li>"
    "<li>Do not force it into a carrier roughly, but get to an emergency vet without delay.</li>"
    "<li>If you can, note the resting breathing rate to tell the vet.</li>"
    "</ol>"),
  ],
  "faqs": [
   ("What is a normal breathing rate for a cat?", "A calm, resting cat usually takes fewer than about 30 breaths per minute. Higher rates at rest, or any laboured breathing, need a vet."),
   ("My cat pants after playing. Is that ok?", "Brief fast breathing right after hard play or in heat can be normal if it settles quickly. Panting at rest, or that does not settle, is not normal for a cat and needs urgent care."),
   ("How do I measure resting breathing rate?", "While the cat is asleep or fully settled and not purring, count each rise of the chest for 30 seconds and double it. Hirra Plus includes a guided breathing-rate counter for this."),
  ],
  "related": ["cat-not-eating-what-to-do", "why-is-my-cat-drinking-so-much-water", "cat-losing-weight-but-still-eating"],
 },
 {
  "slug": "are-lilies-poisonous-to-cats",
  "cat": "Household safety",
  "verdict": "danger",
  "verdict_label": "Deadly, a true emergency",
  "title": "Are Lilies Poisonous to Cats? Yes, and It Is an Emergency",
  "h1": "Are lilies poisonous to cats?",
  "desc": "True lilies can cause fatal kidney failure in cats, even from pollen or vase water. Learn which lilies are deadly and what to do immediately.",
  "keywords": "are lilies poisonous to cats, lily toxic cats, cat ate lily, lily poisoning cat, are lilies safe for cats",
  "tldr": "Yes, and it is one of the most dangerous plant poisonings there is. True lilies (Lilium and Hemerocallis) can cause fatal kidney failure in cats. Every part is toxic, including the pollen and even the vase water. If your cat has touched a lily, call an emergency vet immediately. Minutes matter.",
  "sections": [
   ("Why lilies are a life-threatening emergency for cats",
    "<p>True lilies are in a different class from most toxic plants. A cat that bites a leaf or petal, licks pollen off its fur, or drinks water from the vase can develop <strong>acute kidney failure</strong> within one to three days. Untreated, it is often fatal. There is no part of the plant that is safe.</p>"
    "<p>The most dangerous are <strong>Lilium</strong> species (Easter, Asiatic, Tiger, Stargazer, Oriental) and <strong>Hemerocallis</strong> (daylilies). Because cats groom, even brushing past pollen is a real exposure.</p>"),
   ("Plants that carry the lily name but differ",
    "<p>Some plants called lilies are not true lilies and cause milder signs (mouth irritation) rather than kidney failure, for example peace lily, calla lily, and lily of the valley (which has its own heart risk). Do not rely on the name. If you are unsure which plant it is, treat it as an emergency and let the vet decide.</p>"),
   ("Signs of lily poisoning",
    "<ul>"
    "<li>Vomiting and drooling early on</li>"
    "<li>Lethargy and hiding</li>"
    "<li>Loss of appetite</li>"
    "<li>Increased then decreased urination as the kidneys fail</li>"
    "<li>Later, no urine at all</li>"
    "</ul>"
    "<p>Signs can look like they improve after the first day, which is a false calm while the kidneys are being damaged.</p>"),
   ("What to do right now",
    "<ol>"
    "<li><strong>Call an emergency vet immediately.</strong> Do not wait for signs. Treatment started within the first hours has by far the best outcome.</li>"
    "<li>Bring the plant or a photo so the vet can confirm the species.</li>"
    "<li>Remove all lilies from any home with a cat. Do not keep them as cut flowers either.</li>"
    "</ol>"),
  ],
  "faqs": [
   ("Can pollen alone poison a cat?", "Yes. A cat can get a toxic dose simply by brushing against the flower and grooming the pollen from its fur. This is why lilies and cats cannot safely share a home."),
   ("My cat drank the flower water. Is that dangerous?", "Yes, the vase water from true lilies is toxic. Call an emergency vet right away."),
   ("Which lilies are safe for cats?", "No true lily is safe. Some look-alikes named lily are less dangerous, but because misidentification is easy and true lilies are deadly, the safe rule is to keep all lilies out of a cat's home."),
  ],
  "related": ["are-essential-oils-safe-for-cats", "why-is-my-cat-drinking-so-much-water", "is-xylitol-and-human-food-safe-for-cats"],
 },
 {
  "slug": "are-essential-oils-safe-for-cats",
  "cat": "Household safety",
  "verdict": "danger",
  "verdict_label": "Toxic, use extreme caution",
  "title": "Are Essential Oils and Diffusers Safe for Cats?",
  "h1": "Are essential oils and diffusers safe for cats?",
  "desc": "Many essential oils are toxic to cats, and diffusers can affect them too. Learn which oils are dangerous and how to keep your cat safe.",
  "keywords": "are essential oils safe for cats, essential oil diffuser cats, tea tree oil cats, essential oils toxic cats, are diffusers safe for cats",
  "tldr": "Most concentrated essential oils are toxic to cats, and some, like tea tree, are dangerous even in small amounts. Cats lack the liver enzymes to process them. Diffusers release oil into the air a cat then grooms off its fur. The safest approach is to keep concentrated oils and active diffusers away from cats entirely.",
  "sections": [
   ("Why cats are uniquely vulnerable to essential oils",
    "<p>Cats are missing certain liver enzymes (glucuronyl transferases) that other animals use to break down the compounds in essential oils, so the oils build up and can cause harm at doses that would not affect a person or a dog. Exposure happens three ways: licking or eating oil, absorbing it through the skin, and inhaling it from a diffuser and then grooming the residue off the coat.</p>"),
   ("Oils that are especially dangerous",
    "<ul>"
    "<li><strong>Tea tree (melaleuca)</strong> oil, dangerous even diluted</li>"
    "<li>Peppermint, wintergreen, cinnamon, clove</li>"
    "<li>Citrus oils (d-limonene), pine, and eucalyptus</li>"
    "<li>Ylang ylang, pennyroyal, and sweet birch</li>"
    "</ul>"
    "<p>Signs of trouble include drooling, vomiting, wobbliness, tremors, low body temperature, difficulty breathing, or skin redness where oil touched.</p>"),
   ("Diffusers: the hidden route",
    "<p>Passive reed diffusers release less, but active nebulising or heated diffusers put fine oil droplets into the air that settle on a cat's fur and are then swallowed during grooming. If you use a diffuser, keep it in a room the cat cannot enter, run it briefly with good ventilation, and stop if the cat coughs, drools, or acts unwell.</p>"),
   ("What to do if your cat is exposed",
    "<ol>"
    "<li>Move the cat to fresh air. If oil is on the coat or skin, call a vet before washing so you do the right thing.</li>"
    "<li>Do not make the cat vomit.</li>"
    "<li>Call a vet or emergency clinic, especially after tea tree oil or any signs above. Bring the product so they can see the ingredients.</li>"
    "</ol>"),
  ],
  "faqs": [
   ("Is a diffuser safe if the cat is in another room?", "Lower risk, but droplets travel and settle. Use active diffusers only where the cat cannot go, keep sessions short, and ventilate. Stop at once if the cat seems unwell."),
   ("Are any essential oils safe for cats?", "Because cats process oils so poorly, there is no essential oil that is reliably safe to apply to or diffuse around a cat. Keep concentrated oils away and ask a vet before using anything scented near a cat."),
   ("What about scented candles or plug-ins?", "Use them sparingly and with ventilation. Watch the cat for coughing or drooling, and stop if you see it. Never apply any scented product to a cat."),
  ],
  "related": ["are-lilies-poisonous-to-cats", "is-xylitol-and-human-food-safe-for-cats", "cat-breathing-fast-what-to-do"],
 },
 {
  "slug": "cat-peeing-outside-litter-box",
  "cat": "Symptoms",
  "verdict": "caution",
  "verdict_label": "Can signal an emergency",
  "title": "Why Is My Cat Peeing Outside the Litter Box?",
  "h1": "Why is my cat peeing outside the litter box?",
  "desc": "A cat urinating outside the box can mean a medical problem, not bad behaviour. Learn the causes, and the one sign that is a life-threatening emergency.",
  "keywords": "cat peeing outside litter box, cat not using litter box, cat urinating everywhere, cat straining to pee, cat litter box problems",
  "tldr": "It is usually a medical or stress signal, not spite. Causes range from urinary infections and crystals to kidney disease, diabetes, arthritis, or litter-box aversion. One pattern is a true emergency: a cat, especially a male, straining and producing little or no urine may have a blocked bladder, which is fatal within a day or two. That needs an emergency vet now.",
  "sections": [
   ("The emergency to rule out first",
    "<p>If your cat is going in and out of the box, crouching and straining, crying, and passing only drops or nothing, treat it as an <strong>emergency</strong>. A blocked bladder (urethral obstruction) is most common in male cats and can cause kidney failure and death within 24 to 48 hours. Go to an emergency vet immediately. Do not wait to see if it passes.</p>"),
   ("Medical causes when there is no blockage",
    "<ul>"
    "<li>Urinary tract inflammation or infection (frequent, painful, small pees)</li>"
    "<li>Bladder crystals or stones</li>"
    "<li>Kidney disease or diabetes (larger volumes, more often, more thirst)</li>"
    "<li>Arthritis pain making a high-sided box hard to enter, common in older cats</li>"
    "</ul>"
    "<p>Because so many causes are medical, a vet check comes before assuming it is behaviour.</p>"),
   ("Litter-box and stress causes",
    "<ul>"
    "<li>A dirty box, or too few boxes (the rule of thumb is one per cat plus one)</li>"
    "<li>A new litter, scented litter, a covered box, or a box moved to a busy spot</li>"
    "<li>Stress from a new pet, person, move, or routine change</li>"
    "<li>Territorial marking (small amounts on vertical surfaces)</li>"
    "</ul>"),
   ("What to do",
    "<ol>"
    "<li>If there is any straining with little urine, go to an emergency vet now.</li>"
    "<li>Otherwise, book a vet visit to rule out a urinary or metabolic cause first.</li>"
    "<li>Meanwhile, keep boxes clean, add a box, and try a large uncovered box with unscented litter.</li>"
    "</ol>"),
  ],
  "faqs": [
   ("Is my cat doing this out of spite?", "No. Cats do not urinate outside the box for revenge. It is almost always a medical issue, pain, or stress, so start with a vet check."),
   ("My male cat is straining and nothing comes out. What do I do?", "Treat it as a life-threatening emergency and go to an emergency vet immediately. A blocked bladder can be fatal within a day."),
   ("How many litter boxes should I have?", "One per cat plus one extra, in quiet, easy-to-reach spots, kept clean. Too few or dirty boxes is a common cause of accidents."),
  ],
  "related": ["why-is-my-cat-drinking-so-much-water", "cat-not-eating-what-to-do", "cat-vomiting-causes"],
 },
 {
  "slug": "cat-vomiting-causes",
  "cat": "Symptoms",
  "verdict": "caution",
  "verdict_label": "Depends how often",
  "title": "Why Is My Cat Vomiting? When to Worry",
  "h1": "Why is my cat vomiting?",
  "desc": "Occasional vomiting can be minor, but frequent or repeated vomiting in a cat needs a vet. Learn the causes and the warning signs.",
  "keywords": "why is my cat vomiting, cat throwing up, cat vomiting causes, cat sick, cat vomiting when to worry",
  "tldr": "An occasional hairball or a single vomit in an otherwise bright cat is often minor. But frequent vomiting (more than about once a week), repeated vomiting in a day, or vomiting with lethargy, not eating, or blood is not normal and needs a vet. Cats hide illness, so persistent vomiting is a signal worth acting on.",
  "sections": [
   ("What is normal and what is not",
    "<p>The myth that cats just vomit sometimes causes real problems to be missed. An occasional hairball is common, but regular vomiting is not something to accept. If your cat vomits more than about once a week, or several times in a day, that is a pattern to investigate.</p>"),
   ("Common causes",
    "<ul>"
    "<li>Hairballs, or eating too fast</li>"
    "<li>A sudden diet change or a food sensitivity</li>"
    "<li>Eating something it should not have, including toxins (see the food-safety guides)</li>"
    "<li>Intestinal parasites</li>"
    "<li>Chronic disease: kidney disease, hyperthyroidism, inflammatory bowel disease, or diabetes</li>"
    "</ul>"),
   ("When vomiting is urgent",
    "<ul>"
    "<li>Repeated vomiting over a few hours, or unable to keep water down</li>"
    "<li>Vomiting with lethargy, hiding, or not eating</li>"
    "<li>Blood in the vomit, or it looks like coffee grounds</li>"
    "<li>A suspected toxin, string, or foreign object</li>"
    "<li>Retching with a swollen or painful belly</li>"
    "</ul>"
    "<p>Any of these means call a vet promptly. Vomiting plus not eating is especially concerning in cats because of the fatty-liver risk.</p>"),
  ],
  "faqs": [
   ("Is it normal for cats to vomit hairballs?", "An occasional hairball can be normal, but frequent hairballs or vomiting more than about once a week is not, and deserves a vet check, sometimes it is a sign of an underlying gut or skin issue."),
   ("My cat vomited once but seems fine. Should I worry?", "A single vomit in a bright, eating, playing cat is often minor. Watch for more vomiting, lethargy, or loss of appetite, and call a vet if any appear."),
  ],
  "related": ["cat-not-eating-what-to-do", "cat-peeing-outside-litter-box", "is-milk-and-dairy-safe-for-cats"],
 },
 {
  "slug": "cat-vaccination-schedule",
  "cat": "Care basics",
  "verdict": "info",
  "verdict_label": "Good to know",
  "title": "Cat Vaccination Schedule: A Simple Guide for Owners",
  "h1": "What vaccinations does my cat need?",
  "desc": "A plain-language overview of core cat vaccines, when kittens and adults need them, and why they matter. Always confirm the schedule with your vet.",
  "keywords": "cat vaccination schedule, kitten vaccines, cat vaccines, when to vaccinate cat, feline vaccine schedule",
  "tldr": "Kittens need a series of core vaccines starting around 6 to 8 weeks, boostered every few weeks until about 16 weeks, then a booster at a year. Adult cats need periodic boosters, usually every 1 to 3 years depending on the vaccine and your vet. The core vaccines protect against panleukopenia, feline herpesvirus, calicivirus, and rabies.",
  "sections": [
   ("The core vaccines",
    "<ul>"
    "<li><strong>FVRCP</strong>, a combined vaccine against feline viral rhinotracheitis (herpesvirus), calicivirus, and panleukopenia, three serious, common diseases.</li>"
    "<li><strong>Rabies</strong>, required by law in many places and important wherever rabies exists.</li>"
    "<li><strong>FeLV</strong> (feline leukaemia) is recommended for kittens and for cats that go outdoors or live with FeLV-positive cats.</li>"
    "</ul>"),
   ("A typical schedule",
    "<ul>"
    "<li><strong>Kittens:</strong> FVRCP starting at about 6 to 8 weeks, repeated every 3 to 4 weeks until about 16 weeks. Rabies usually once at around 12 to 16 weeks.</li>"
    "<li><strong>One year:</strong> a booster of the kitten vaccines.</li>"
    "<li><strong>Adults:</strong> boosters every 1 to 3 years depending on the vaccine, local law, and lifestyle.</li>"
    "</ul>"
    "<p>Your vet tailors this to your cat's age, health, and whether it goes outside. Indoor-only cats still need core protection.</p>"),
   ("Why it matters even for indoor cats",
    "<p>The diseases these vaccines prevent are widespread, and some, like panleukopenia, are often fatal. Viruses can enter on shoes and clothing, so indoor cats are not fully safe without core vaccines. Keeping a simple record of dates and due boosters helps you and your vet stay on track.</p>"),
  ],
  "faqs": [
   ("Do indoor cats need vaccines?", "Yes. Core vaccines are recommended for all cats because the diseases are common and can enter the home on clothing and shoes. Your vet may adjust non-core vaccines for an indoor lifestyle."),
   ("How often do adult cats need boosters?", "Usually every 1 to 3 years depending on the specific vaccine, your local laws, and your cat's lifestyle. Your vet will set the right interval."),
   ("How do I keep track of vaccine dates?", "Note each vaccine and its due date. Hirra stores your cat's profile and sends vaccination reminders so a booster is less likely to slip."),
  ],
  "related": ["how-often-should-a-cat-see-a-vet", "what-to-feed-a-kitten", "cat-vomiting-causes"],
 },
 {
  "slug": "how-often-should-a-cat-see-a-vet",
  "cat": "Care basics",
  "verdict": "info",
  "verdict_label": "Good to know",
  "title": "How Often Should a Cat See the Vet?",
  "h1": "How often should a cat see the vet?",
  "desc": "How often healthy kittens, adult, and senior cats need check-ups, and why cats hide illness so well that regular visits matter.",
  "keywords": "how often should a cat see the vet, cat check up frequency, senior cat vet visits, cat wellness exam, when to take cat to vet",
  "tldr": "As a general guide: kittens need several visits in the first months, healthy adult cats benefit from a check-up once a year, and senior cats (about 10 and older) do best with a visit every 6 months. Cats hide illness so well that a yearly exam and simple tracking at home are the main ways problems get caught early.",
  "sections": [
   ("A rough schedule by life stage",
    "<ul>"
    "<li><strong>Kittens:</strong> a series of visits from about 8 to 16 weeks for vaccines, deworming, and a neuter discussion.</li>"
    "<li><strong>Adult cats (1 to 9 years):</strong> a wellness exam once a year, even if they seem perfectly healthy.</li>"
    "<li><strong>Senior cats (about 10 and up):</strong> a check-up every 6 months, often with periodic blood and urine tests, because kidney, thyroid, and diabetic disease become common.</li>"
    "</ul>"),
   ("Why yearly visits matter more for cats",
    "<p>Cats are masters at masking illness, an instinct from their wild ancestry. By the time an owner sees obvious signs, a disease is often advanced. A yearly exam lets a vet feel for changes, weigh the cat accurately, and catch drift you cannot see. For older cats, twice-yearly visits roughly match how fast things can change at that age.</p>"),
   ("Between visits, tracking is the other half",
    "<p>Most of a cat's life happens between appointments. Watching weight, appetite, thirst, litter habits, and energy at home turns slow drift into something you and your vet can act on early. That is exactly what a simple daily record, or an app like Hirra, is for.</p>"),
  ],
  "faqs": [
   ("My cat seems healthy. Does it still need a yearly vet visit?", "Yes. Cats hide illness, so a yearly exam is the main chance to catch problems early, before signs are obvious. It is prevention, not just treatment."),
   ("How often should a senior cat see the vet?", "Cats around 10 and older generally do best with a check-up every 6 months, since age-related diseases can develop quickly at that stage."),
  ],
  "related": ["cat-vaccination-schedule", "why-is-my-cat-drinking-so-much-water", "cat-losing-weight-but-still-eating"],
 },
 {
  "slug": "what-to-feed-a-kitten",
  "cat": "Care basics",
  "verdict": "info",
  "verdict_label": "Good to know",
  "title": "What to Feed a Kitten: A Simple Starter Guide",
  "h1": "What should I feed a kitten?",
  "desc": "What kittens need to eat, how often, and the common feeding mistakes to avoid in the first year. Confirm specifics with your vet.",
  "keywords": "what to feed a kitten, kitten food, how often to feed a kitten, kitten feeding schedule, best food for kittens",
  "tldr": "Feed a complete food labelled for kittens or for all life stages, because kittens need more protein, calories, and specific nutrients than adult cats. Feed small meals several times a day, always provide fresh water, and avoid cow's milk. Your vet can confirm amounts for your kitten's age and weight.",
  "sections": [
   ("What a kitten needs",
    "<p>Kittens grow fast and need a diet made for it: higher protein and calories, plus the right calcium, taurine, and fatty acids. Choose a food clearly labelled <strong>for kittens</strong> or <strong>for all life stages</strong>, not adult-only food. Both wet and dry kitten foods can work; wet food adds helpful moisture.</p>"),
   ("How often to feed",
    "<ul>"
    "<li><strong>Under 6 months:</strong> small meals 3 to 4 times a day.</li>"
    "<li><strong>6 to 12 months:</strong> gradually reduce to 2 to 3 meals a day.</li>"
    "<li>Fresh water always available.</li>"
    "</ul>"
    "<p>Follow the amounts on the food for your kitten's weight and age, and let your vet fine-tune it. Most kittens move to adult food around 12 months.</p>"),
   ("Common mistakes to avoid",
    "<ul>"
    "<li><strong>Cow's milk,</strong> which causes diarrhoea in most cats (see the milk guide).</li>"
    "<li>Adult cat food, which is not calorie-dense enough for growth.</li>"
    "<li>A tuna or human-food habit that unbalances the diet.</li>"
    "<li>Free-feeding without watching weight, which can start a lifelong obesity problem.</li>"
    "</ul>"),
  ],
  "faqs": [
   ("Can kittens eat adult cat food?", "Not as their main diet. Kittens need the extra protein and calories in kitten or all-life-stages food. They usually switch to adult food at about 12 months."),
   ("Can I give my kitten milk?", "No. Most cats, including kittens past weaning, cannot digest cow's milk and it causes diarrhoea. Kittens need their mother's milk or a kitten milk replacer, then proper kitten food and water."),
   ("How much should I feed my kitten?", "Follow the label for your kitten's age and weight, split into several small meals a day, and let your vet adjust. Watch body condition rather than just the bowl."),
  ],
  "related": ["cat-vaccination-schedule", "is-milk-and-dairy-safe-for-cats", "safe-human-foods-for-cats"],
 },
]

# ------------------------------------------------------------------ template

CSS = """
:root{--ink:#06181C;--ink2:#0B2228;--card:#0E2A31;--line:#1C3A42;--cream:#EEF4F5;--mist:#A9C2C8;--teal:#33B3A6;--emerald:#10B981;--amber:#F59E0B;--rose:#F43F5E;--maxw:720px}
*{box-sizing:border-box}
html{scroll-behavior:smooth}
body{margin:0;background:var(--ink);color:var(--cream);font-family:'Nunito Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;line-height:1.7;font-size:18px;-webkit-font-smoothing:antialiased}
a{color:var(--teal);text-decoration:none}
a:hover{text-decoration:underline}
.wrap{max-width:var(--maxw);margin:0 auto;padding:0 22px}
h1,h2,h3{font-family:'Nunito','Nunito Sans',sans-serif;line-height:1.25;color:#fff;font-weight:800}
h1{font-size:clamp(28px,5vw,40px);margin:0 0 6px}
h2{font-size:clamp(22px,3.5vw,28px);margin:38px 0 12px}
h3{font-size:20px;margin:26px 0 8px}
p{margin:0 0 16px}
ul,ol{margin:0 0 16px;padding-left:22px}
li{margin:0 0 8px}
strong{color:#fff}
nav.top{position:sticky;top:0;z-index:10;background:rgba(6,24,28,.86);backdrop-filter:blur(10px);border-bottom:1px solid var(--line)}
nav.top .wrap{display:flex;align-items:center;justify-content:space-between;height:58px}
nav.top .brand{display:flex;align-items:center;gap:10px;color:#fff;font-family:'Nunito',sans-serif;font-weight:800;letter-spacing:.14em;font-size:15px}
nav.top .brand img{width:28px;height:28px;border-radius:7px}
.badge{display:inline-flex;align-items:center;gap:8px;font-family:'Nunito',sans-serif;font-weight:700;font-size:14px;color:var(--ink);background:var(--cream);padding:9px 15px;border-radius:100px;transition:transform .2s,box-shadow .2s}
.badge:hover{transform:translateY(-2px);box-shadow:0 14px 34px rgba(0,0,0,.4);text-decoration:none}
.crumb{font-size:14px;color:var(--mist);margin:22px 0 14px}
.crumb a{color:var(--mist)}
.kicker{font-family:'Nunito',sans-serif;font-weight:700;letter-spacing:.16em;text-transform:uppercase;font-size:12px;color:var(--teal);margin:0 0 10px}
.updated{font-size:13px;color:var(--mist);margin:0 0 26px}
.tldr{background:var(--card);border:1px solid var(--line);border-left:4px solid var(--teal);border-radius:14px;padding:18px 20px;margin:0 0 30px}
.tldr .lab{font-family:'Nunito',sans-serif;font-weight:800;font-size:13px;letter-spacing:.12em;text-transform:uppercase;color:var(--teal);margin:0 0 6px}
.tldr p{margin:0;font-size:18px}
.verdict{display:inline-flex;align-items:center;gap:8px;font-family:'Nunito',sans-serif;font-weight:800;font-size:14px;padding:7px 14px;border-radius:100px;margin:0 0 18px}
.v-danger{background:rgba(244,63,94,.14);color:#ff8095;border:1px solid rgba(244,63,94,.4)}
.v-caution{background:rgba(245,158,11,.14);color:#f5b642;border:1px solid rgba(245,158,11,.4)}
.v-safe{background:rgba(16,185,129,.14);color:#34d399;border:1px solid rgba(16,185,129,.4)}
.v-info{background:rgba(51,179,166,.14);color:#5fd0c4;border:1px solid rgba(51,179,166,.4)}
.disc{background:var(--ink2);border:1px solid var(--line);border-radius:14px;padding:16px 18px;margin:34px 0;font-size:15px;color:var(--mist)}
.disc strong{color:var(--cream)}
.cta{background:linear-gradient(180deg,var(--card),var(--ink2));border:1px solid var(--line);border-radius:18px;padding:26px 24px;margin:38px 0;text-align:center}
.cta h3{margin:0 0 8px}
.cta p{color:var(--mist);font-size:16px;max-width:460px;margin:0 auto 16px}
.faq{margin:34px 0}
.faq details{border-bottom:1px solid var(--line);padding:14px 0}
.faq summary{font-family:'Nunito',sans-serif;font-weight:700;color:#fff;cursor:pointer;font-size:18px;list-style:none}
.faq summary::-webkit-details-marker{display:none}
.faq summary::before{content:"+";color:var(--teal);margin-right:10px;font-weight:800}
.faq details[open] summary::before{content:"\\2013"}
.faq details p{margin:12px 0 2px;color:var(--mist)}
.rel{margin:40px 0}
.rel h2{margin-bottom:14px}
.rel a{display:block;background:var(--card);border:1px solid var(--line);border-radius:12px;padding:14px 16px;margin:0 0 10px;color:var(--cream);font-weight:600}
.rel a:hover{border-color:var(--teal);text-decoration:none}
.rel a span{display:block;font-size:13px;color:var(--mist);font-weight:400;margin-top:2px}
footer{border-top:1px solid var(--line);margin-top:50px;padding:26px 0;color:var(--mist);font-size:14px}
footer .wrap{display:flex;flex-wrap:wrap;gap:14px;justify-content:space-between;align-items:center}
footer a{color:var(--mist)}
/* hub */
.hero{padding:44px 0 8px}
.hero p.lead{font-size:19px;color:var(--mist);max-width:600px}
.group{margin:34px 0}
.group h2{border-bottom:1px solid var(--line);padding-bottom:8px}
.cardlink{display:flex;gap:14px;align-items:flex-start;background:var(--card);border:1px solid var(--line);border-radius:14px;padding:16px 18px;margin:0 0 12px;color:var(--cream)}
.cardlink:hover{border-color:var(--teal);text-decoration:none;transform:translateY(-1px)}
.cardlink .dot{width:10px;height:10px;border-radius:50%;margin-top:8px;flex:none}
.d-danger{background:var(--rose)}.d-caution{background:var(--amber)}.d-safe{background:var(--emerald)}.d-info{background:var(--teal)}
.cardlink .t{display:block;font-family:'Nunito',sans-serif;font-weight:700;font-size:18px;color:#fff}
.cardlink .s{display:block;font-size:14px;color:var(--mist);margin-top:3px}
.cardlink>span:last-child{flex:1;min-width:0}
@media(max-width:560px){body{font-size:17px}}
"""

HEAD = """<!doctype html>
<html lang="en" dir="ltr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{TITLE}</title>
<meta name="description" content="{DESC}">
<link rel="canonical" href="{CANON}">
<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1">
<meta name="author" content="Aykiz Intelligence">
<meta name="keywords" content="{KEYWORDS}">
<meta name="theme-color" content="#06181C">
<meta name="color-scheme" content="dark">
<link rel="icon" type="image/png" sizes="512x512" href="/hirra/assets/favicon-round.png">
<link rel="apple-touch-icon" href="/hirra/assets/icon-1024.png">
<meta property="og:type" content="{OGTYPE}">
<meta property="og:site_name" content="Hirra by Aykiz Intelligence">
<meta property="og:url" content="{CANON}">
<meta property="og:title" content="{OGTITLE}">
<meta property="og:description" content="{DESC}">
<meta property="og:image" content="https://aykizintelligence.com/hirra/assets/og-hirra.png?v=2">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:site" content="@aykizintel">
<meta name="twitter:title" content="{OGTITLE}">
<meta name="twitter:description" content="{DESC}">
<meta name="twitter:image" content="https://aykizintelligence.com/hirra/assets/og-hirra.png?v=2">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Nunito:wght@700;800&family=Nunito+Sans:wght@400;600;700&display=swap" rel="stylesheet">
<style>{CSS}</style>
{JSONLD}
</head>
<body>
<nav class="top"><div class="wrap">
<a class="brand" href="/hirra/"><img src="/hirra/assets/icon-1024.png" alt="Hirra app icon" width="28" height="28"> HIRRA</a>
{BADGE}
</div></nav>
"""

FOOTER = """<footer><div class="wrap">
<div>Care, not alarm. &nbsp;&middot;&nbsp; <a href="https://aykizintelligence.com/">Aykiz Intelligence</a></div>
<div><a href="/hirra/">Hirra app</a> &nbsp;&middot;&nbsp; <a href="/hirra/guide/">Cat care guide</a> &nbsp;&middot;&nbsp; <a href="/hirra/privacy/">Privacy</a></div>
</div></footer>
</body>
</html>"""


def esc(s):
    return s.replace("&", "&amp;").replace('"', "&quot;")


def render(tpl, **kw):
    out = tpl
    for k, v in kw.items():
        out = out.replace("{" + k + "}", v)
    return out


def by_slug(slug):
    for a in ARTICLES:
        if a["slug"] == slug:
            return a
    return None


def article_jsonld(a):
    canon = SITE + BASE + a["slug"] + "/"
    faq = ",".join(
        '{"@type":"Question","name":"%s","acceptedAnswer":{"@type":"Answer","text":"%s"}}'
        % (esc(q), esc(ans)) for q, ans in a["faqs"]
    )
    return (
        '<script type="application/ld+json">\n{'
        '"@context":"https://schema.org","@graph":['
        '{"@type":"Article","@id":"%s#article","headline":"%s","description":"%s",'
        '"inLanguage":"en","datePublished":"%s","dateModified":"%s",'
        '"author":{"@type":"Organization","name":"Aykiz Intelligence","url":"https://aykizintelligence.com/"},'
        '"publisher":{"@type":"Organization","name":"Aykiz Intelligence","url":"https://aykizintelligence.com/"},'
        '"mainEntityOfPage":"%s","image":"https://aykizintelligence.com/hirra/assets/og-hirra.png"},'
        '{"@type":"FAQPage","mainEntity":[%s]},'
        '{"@type":"BreadcrumbList","itemListElement":['
        '{"@type":"ListItem","position":1,"name":"Hirra","item":"%s/hirra/"},'
        '{"@type":"ListItem","position":2,"name":"Cat care guide","item":"%s"},'
        '{"@type":"ListItem","position":3,"name":"%s","item":"%s"}]}'
        ']}\n</script>'
    ) % (
        canon, esc(a["h1"]), esc(a["desc"]), UPDATED, UPDATED, canon, faq,
        SITE, SITE + BASE, esc(a["h1"]), canon,
    )


def render_article(a):
    canon = SITE + BASE + a["slug"] + "/"
    vcls = {"danger": "v-danger", "caution": "v-caution", "safe": "v-safe", "info": "v-info"}[a["verdict"]]
    body = []
    body.append('<div class="wrap">')
    body.append('<div class="crumb"><a href="/hirra/">Hirra</a> &rsaquo; <a href="/hirra/guide/">Cat care guide</a> &rsaquo; %s</div>' % a["cat"])
    body.append('<p class="kicker">%s</p>' % a["cat"])
    body.append("<h1>%s</h1>" % a["h1"])
    body.append('<p class="updated">Reviewed %s &middot; Not a substitute for veterinary advice</p>' % UPDATED)
    body.append('<span class="verdict %s">%s</span>' % (vcls, a["verdict_label"]))
    body.append('<div class="tldr"><p class="lab">Short answer</p><p>%s</p></div>' % a["tldr"])
    for h2, html in a["sections"]:
        body.append("<h2>%s</h2>" % h2)
        body.append(html)
    # emergency-aware disclaimer
    body.append(
        '<div class="disc"><strong>When in doubt, call a vet.</strong> This guide is general '
        "information, not a diagnosis, and cannot replace an examination. If your cat is in "
        "distress, contact a veterinarian or your nearest emergency clinic straight away.</div>"
    )
    # CTA
    body.append(
        '<div class="cta"><h3>Notice the quiet changes early</h3>'
        "<p>Hirra is a free, private cat-health app. A five-second daily check-in learns your "
        "cat's normal and flags the drifts in weight, thirst, appetite, and litter that owners "
        'miss, and its free "Is This Safe?" checker looks up foods in seconds. It never '
        "diagnoses. It helps you notice, and points you to a vet sooner.</p>"
        + APPSTORE_BADGE +
        '<div style="margin-top:12px;font-size:13px;color:var(--mist)">Free on the App Store &middot; iPhone &middot; No account</div></div>'
    )
    # FAQ
    body.append('<div class="faq"><h2>Common questions</h2>')
    for q, ans in a["faqs"]:
        body.append("<details><summary>%s</summary><p>%s</p></details>" % (q, ans))
    body.append("</div>")
    # related
    rel = [by_slug(s) for s in a.get("related", [])]
    rel = [r for r in rel if r]
    if rel:
        body.append('<div class="rel"><h2>Related guides</h2>')
        for r in rel:
            body.append('<a href="/hirra/guide/%s/">%s<span>%s</span></a>' % (r["slug"], r["h1"], r["cat"]))
        body.append("</div>")
    body.append("</div>")

    head = render(
        HEAD,
        TITLE=esc(a["title"] + " | Hirra"),
        DESC=esc(a["desc"]),
        CANON=canon,
        KEYWORDS=esc(a["keywords"]),
        OGTYPE="article",
        OGTITLE=esc(a["h1"]),
        CSS=CSS,
        JSONLD=article_jsonld(a),
        BADGE=APPSTORE_BADGE,
    )
    return head + "\n".join(body) + FOOTER


def render_hub():
    canon = SITE + BASE
    groups = {}
    for a in ARTICLES:
        groups.setdefault(a["cat"], []).append(a)
    order = ["Food safety", "Household safety", "Symptoms", "Care basics"]
    body = ['<div class="wrap">']
    body.append('<div class="hero">')
    body.append('<p class="kicker">Hirra cat care guide</p>')
    body.append("<h1>Cat health and food safety, in plain language</h1>")
    body.append(
        '<p class="lead">Clear, calm answers to the questions cat owners actually search: is this '
        "food safe, and what does this symptom mean. Written to help you notice early and know "
        "when to call a vet.</p>")
    body.append("</div>")
    for g in order:
        if g not in groups:
            continue
        body.append('<div class="group"><h2>%s</h2>' % g)
        for a in groups[g]:
            dcls = {"danger": "d-danger", "caution": "d-caution", "safe": "d-safe", "info": "d-info"}[a["verdict"]]
            body.append(
                '<a class="cardlink" href="/hirra/guide/%s/"><span class="dot %s"></span>'
                '<span><span class="t">%s</span><span class="s">%s</span></span></a>'
                % (a["slug"], dcls, a["h1"], a["tldr"][:110].rsplit(" ", 1)[0] + "...")
            )
        body.append("</div>")
    # CTA
    body.append(
        '<div class="cta"><h3>Get Hirra free</h3>'
        "<p>A private cat-health app that learns your cat's normal and flags the quiet early "
        "signs. Free daily check-in and food checker, no account.</p>"
        + APPSTORE_BADGE + "</div>")
    body.append("</div>")

    items = ",".join(
        '{"@type":"ListItem","position":%d,"url":"%s%s%s/","name":"%s"}'
        % (i + 1, SITE, BASE, a["slug"], esc(a["h1"])) for i, a in enumerate(ARTICLES)
    )
    jsonld = (
        '<script type="application/ld+json">\n{'
        '"@context":"https://schema.org","@graph":['
        '{"@type":"Organization","@id":"https://aykizintelligence.com/#org","name":"Aykiz Intelligence",'
        '"url":"https://aykizintelligence.com/","sameAs":["https://apps.apple.com/us/app/hirra-cat-health-tracker/id6782975522"]},'
        '{"@type":"WebSite","@id":"https://aykizintelligence.com/#website","url":"https://aykizintelligence.com/",'
        '"name":"Aykiz Intelligence","publisher":{"@id":"https://aykizintelligence.com/#org"}},'
        '{"@type":"MobileApplication","@id":"https://aykizintelligence.com/hirra/#app","name":"Hirra: Cat Health Tracker",'
        '"applicationCategory":"HealthApplication","operatingSystem":"iOS 17","offers":{"@type":"Offer","price":"0","priceCurrency":"USD"},'
        '"installUrl":"%s","url":"https://aykizintelligence.com/hirra/"},'
        '{"@type":"CollectionPage","@id":"%s#page","name":"Hirra cat care guide","url":"%s",'
        '"about":"Cat health, food safety, and symptom guidance for cat owners",'
        '"isPartOf":{"@id":"https://aykizintelligence.com/#website"},'
        '"publisher":{"@id":"https://aykizintelligence.com/#org"},'
        '"mainEntity":{"@type":"ItemList","itemListElement":[%s]}}'
        ']}\n</script>'
    ) % (APPSTORE, canon, canon, items)
    head = render(
        HEAD,
        TITLE="Cat Care Guide: Food Safety and Symptoms | Hirra",
        DESC="Plain-language answers on what foods are safe for cats and what common symptoms mean, from the makers of Hirra, a private cat-health app.",
        CANON=canon,
        KEYWORDS="cat care guide, cat food safety, cat symptoms, is it safe for cats, cat health",
        OGTYPE="website",
        OGTITLE="Hirra cat care guide",
        CSS=CSS,
        JSONLD=jsonld,
        BADGE=APPSTORE_BADGE,
    )
    return head + "\n".join(body) + FOOTER


def main():
    here = os.path.dirname(os.path.abspath(__file__))
    # hub
    with open(os.path.join(here, "index.html"), "w") as f:
        f.write(render_hub())
    print("wrote index.html (hub)")
    # articles
    for a in ARTICLES:
        d = os.path.join(here, a["slug"])
        os.makedirs(d, exist_ok=True)
        with open(os.path.join(d, "index.html"), "w") as f:
            f.write(render_article(a))
        print("wrote %s/index.html" % a["slug"])
    # sitemap fragment
    print("\n--- paste into ../../sitemap.xml ---")
    print("""  <url>
    <loc>%s%s</loc>
    <lastmod>%s</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>""" % (SITE, BASE, UPDATED))
    for a in ARTICLES:
        print("""  <url>
    <loc>%s%s%s/</loc>
    <lastmod>%s</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>""" % (SITE, BASE, a["slug"], UPDATED))


if __name__ == "__main__":
    main()
