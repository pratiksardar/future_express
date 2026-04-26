# Future Express - 6-Day Sprint Playbook

**Quick reference guide for rapid user research and product decisions during 6-day sprints.**

---

## Sprint Planning: Research-Informed Feature Selection

### Before Each Sprint: The 5-Minute User Check

Ask these questions:

1. **Who is this for?** (Which persona: Degen Trader, Finance Pro, Mainstream User, AI Enthusiast, News Junkie)
2. **What problem does it solve?** (Specific pain point from UX research)
3. **How will we know it works?** (Metric target)
4. **What's the smallest version?** (MVP scope)
5. **What could go wrong?** (Risk mitigation)

---

## Persona Quick Reference

### When to Prioritize Each Persona:

| Sprint Goal | Primary Persona | Why |
|-------------|----------------|-----|
| Increase retention | Degen Trader | They have highest engagement potential |
| Improve monetization | Finance Professional | Highest willingness to pay ($9-49/mo) |
| Grow user base | Mainstream User | Largest addressable market |
| Build credibility | AI Enthusiast | They share/amplify product |
| Establish brand | News Junkie | They become loyal advocates |

### Persona Decision Matrix:

**Building a new feature? Ask:**
- Degen Trader: "Does this help me make money faster?"
- Finance Pro: "Will my boss respect me for using this?"
- Mainstream User: "Can I understand this without feeling stupid?"
- AI Enthusiast: "Is this technically impressive?"
- News Junkie: "Does this feel like quality journalism?"

**If ≥3 personas say "yes," it's probably worth building.**

---

## Rapid User Research Methods (Day 1-2 of Sprint)

### Method 1: 5-Second Test
**Time:** 30 minutes
**When to use:** Testing first impressions, homepage clarity
**How:**
1. Show design for 5 seconds
2. Hide it
3. Ask: "What do you remember? What is this product?"
4. Iterate on messaging

**Tools:** UsabilityHub, Lyssna, or just screenshots + Discord

---

### Method 2: Hallway Testing
**Time:** 1-2 hours
**When to use:** Quick validation of new UI/flow
**How:**
1. Grab 5 people (teammates, friends, strangers)
2. Give them a task: "Find an article about crypto"
3. Watch where they struggle
4. Fix obvious issues same day

**Red flags:**
- User asks "What am I supposed to do?"
- Multiple clicks to find primary action
- User gives up within 30 seconds

---

### Method 3: Guerrilla Twitter Testing
**Time:** 2-4 hours (passive)
**When to use:** Validating new feature concept
**How:**
1. Post mockup/prototype to Twitter
2. Ask: "Would you use this? Why or why not?"
3. Read replies for objections and enthusiasm
4. DM 5 interested people for 10-min calls

**Example tweet:** "Should Future Express add real-time alerts when odds move >10%? Reply with YES or describe what you'd actually want instead."

---

### Method 4: Analytics Deep Dive
**Time:** 1 hour
**When to use:** Before building anything
**How:**
1. Open Mixpanel/PostHog
2. Look at funnel drop-offs
3. Find biggest leak
4. Build feature to plug that leak

**Example findings:**
- "60% of users don't click any article" → Problem: Headlines unclear
- "80% bounce after 1 article" → Problem: No "read next" suggestions
- "Only 5% make predictions" → Problem: Feature buried or confusing

---

### Method 5: Support Ticket Mining
**Time:** 30 minutes
**When to use:** Finding real user pain points
**How:**
1. Read last 20 support tickets/Discord questions
2. Group by theme
3. Build feature that eliminates top 3 issues

**Example patterns:**
- "How do I make a prediction?" (10 tickets) → Onboarding problem
- "Why did odds change?" (8 tickets) → Need explanation feature
- "Can I export data?" (5 tickets) → Pro feature opportunity

---

## Daily Research Rituals

### Monday: Set User-Centric Goals
- Sprint goal framed as user benefit, not feature
- Bad: "Build prediction game"
- Good: "Let non-crypto users learn by making risk-free predictions"

### Tuesday: Prototype + Test
- Build ugly prototype (Figma, HTML mockup, even paper)
- Test with 3-5 users
- Iterate based on feedback

### Wednesday: Analytics Check
- Review yesterday's metrics
- Adjust implementation if early data shows issues

### Thursday: Build + Dogfood
- Team uses the feature themselves
- Internal feedback loop
- Fix obvious bugs

### Friday: Ship + Monitor
- Deploy to production
- Watch analytics live
- Be ready to hotfix

### Saturday: Reflect + Document
- What worked? What didn't?
- Update persona assumptions if needed
- Plan next sprint

---

## User Interview Script (15-Minute Version)

**For when you need quick qualitative feedback:**

### Opening (2 min)
"Hi! Thanks for testing. I'm going to show you something and watch how you use it. Think out loud. There are no wrong answers—if you get confused, that's our fault, not yours."

### Task (10 min)
"Imagine you want to [specific goal relevant to feature]. Show me how you'd do that."

**Watch for:**
- Do they find the feature without help?
- Do they understand what it does?
- Do they complete the task?
- Do they seem frustrated or delighted?

### Wrap-Up (3 min)
1. "On a scale of 1-10, how likely are you to use this?"
2. "What would make you rate it a 10?"
3. "Anything confusing or annoying?"

**Document:** 1-paragraph summary per user. Share with team immediately.

---

## Feature Prioritization: The ICE Score

**When choosing what to build this sprint:**

**Impact:** How many users benefit? (1-10)
**Confidence:** How sure are we this will work? (1-10)
**Ease:** How easy is it to build? (1-10)

**ICE Score = (Impact × Confidence) / Effort**

**Example:**
- Real-time odds: Impact 9, Confidence 8, Ease 5 → ICE = 14.4
- Dark mode: Impact 4, Confidence 10, Ease 3 → ICE = 13.3
- Social comments: Impact 6, Confidence 5, Ease 7 → ICE = 4.3

**Rule:** Build highest ICE score features first.

---

## Metrics Cheat Sheet

### Health Metrics (Check Daily)
- **DAU / MAU ratio** (Target: 30%+) = How sticky is the product?
- **Session length** (Target: 5+ min) = Are users engaged?
- **Bounce rate** (Target: <60%) = Is homepage working?

### Growth Metrics (Check Weekly)
- **New signups** (Track trend)
- **Activation rate** (% who read ≥1 article) (Target: 80%+)
- **Referral signups** (Organic growth signal)

### Retention Metrics (Check Weekly)
- **D1 retention** (Target: 40%+)
- **D7 retention** (Target: 25%+)
- **D28 retention** (Target: 15%+)

### Monetization Metrics (Check Weekly)
- **Free → Trial conversion** (Target: 8%+)
- **Trial → Paid conversion** (Target: 40%+)
- **MRR growth** (Month-over-month)

### Red Flags (Act Immediately If You See)
- D1 retention drops below 30%
- Bounce rate spikes above 70%
- Page load time >3 seconds
- Error rate >1%

---

## A/B Testing Quick Guide

### What to Test (High-Impact Experiments)

**Onboarding:**
- Headline variants ("AI Newspaper" vs "Prediction Market News")
- CTA button text ("Start Reading" vs "See Latest News")
- Explainer video vs text vs nothing

**Paywalls:**
- Trial length (7 days vs 14 days)
- Pricing display ($9/mo vs $90/yr)
- Feature list (short vs detailed)

**Engagement:**
- Email subject lines
- Notification timing (morning vs evening)
- Article layouts (compact vs spacious)

### How to Run an A/B Test (Fast)

1. **Hypothesis:** "Changing [X] will improve [metric] by [Y]%"
2. **Sample size:** Need at least 100 users per variant
3. **Duration:** Run for 7 days minimum
4. **Statistical significance:** Use calculator (e.g., Evan's Awesome A/B Tools)
5. **Decision:** If p-value <0.05 and improvement ≥10%, ship winner

### Common Mistakes
- Testing too many things at once
- Stopping test too early (need statistical significance)
- Not documenting results
- Ignoring qualitative feedback

---

## Usability Heuristics Checklist

**Before shipping any feature, check these:**

### Visibility
- [ ] User knows where they are in the app
- [ ] Current page/section is clearly highlighted
- [ ] Important actions are visible without scrolling

### Feedback
- [ ] Loading states show progress
- [ ] Buttons show hover/active states
- [ ] Success/error messages are clear
- [ ] Form validation is immediate

### Control
- [ ] User can undo actions
- [ ] Can go back to previous page
- [ ] Can cancel in-progress actions
- [ ] Keyboard shortcuts work

### Consistency
- [ ] Similar actions look similar
- [ ] Same terminology throughout
- [ ] Design patterns match across pages

### Error Prevention
- [ ] Confirmation for destructive actions
- [ ] Input validation prevents errors
- [ ] Constraints guide valid input
- [ ] Clear error messages with solutions

### Recognition Over Recall
- [ ] Icons have labels
- [ ] Tooltips explain unfamiliar terms
- [ ] Recently viewed items are accessible
- [ ] Search autocomplete suggests options

### Flexibility
- [ ] Works on mobile, tablet, desktop
- [ ] Keyboard navigation supported
- [ ] Customizable settings (theme, notifications)

### Aesthetic & Minimalist
- [ ] No unnecessary UI elements
- [ ] Information hierarchy is clear
- [ ] White space used effectively

---

## Research Debt Checklist

**Are we building blindly? Check if you have:**

- [ ] Talked to ≥5 users in the last month
- [ ] Reviewed analytics in the last week
- [ ] Read support tickets in the last week
- [ ] Tested new feature with real users before shipping
- [ ] Documented assumptions and validated them

**If you checked <3 boxes, you're accumulating research debt. Stop and do user research first.**

---

## Emergency Playbook: Metrics Are Tanking

### If Retention Drops Suddenly:

1. **Check for bugs** (errors in logs?)
2. **Review recent changes** (what shipped in last 48 hours?)
3. **Ask churned users** (email survey: "Why did you stop using Future Express?")
4. **Run win-back campaign** ("We miss you—here's what's new")

### If Conversion Drops Suddenly:

1. **Check payment flow** (is Stripe working?)
2. **Review pricing page analytics** (where do users drop off?)
3. **A/B test paywall variants**
4. **Add exit survey** ("What stopped you from upgrading?")

### If Engagement Drops Suddenly:

1. **Check content quality** (are articles interesting?)
2. **Review personalization** (are recommendations working?)
3. **Test notification timing** (are we spamming users?)
4. **Add engagement survey** ("What would make you visit more often?")

---

## Sprint Retrospective Template

**At the end of each sprint, answer these:**

### What We Learned About Users This Sprint
- [User insight #1]
- [User insight #2]
- [User insight #3]

### What Worked
- [Feature/approach that succeeded]
- [Why it worked]
- [Metric improvement]

### What Didn't Work
- [Feature/approach that failed]
- [Why it failed]
- [What we'll do differently]

### Assumptions We Validated
- [Hypothesis] → [Result]

### Assumptions We Invalidated
- [Hypothesis] → [Result]

### Next Sprint Priorities
1. [Top priority based on this sprint's learnings]
2. [Second priority]
3. [Third priority]

---

## User Research Anti-Patterns (Don't Do This)

### ❌ Build First, Test Later
"Let's ship this and see what happens."
**Why it fails:** Waste time building wrong thing.
**Do instead:** Prototype → Test → Build.

### ❌ Ask Users What They Want
"What features do you want?"
**Why it fails:** Users are bad at predicting their needs.
**Do instead:** Observe behavior, solve problems.

### ❌ Only Talk to Power Users
"Let's interview our top 10 users."
**Why it fails:** They're not representative.
**Do instead:** Mix of new, casual, power, and churned users.

### ❌ Ignore Quantitative Data
"Analytics lie—we just need to talk to users."
**Why it fails:** Anecdotes aren't scalable.
**Do instead:** Combine quant + qual insights.

### ❌ Test Only with Team/Friends
"Let's dogfood this feature."
**Why it fails:** You're not the user.
**Do instead:** Test with strangers who match persona.

### ❌ Analysis Paralysis
"We need more data before deciding."
**Why it fails:** Perfect research delivered late has no impact.
**Do instead:** Make best decision with available data, iterate fast.

---

## Resource Links

### User Testing Tools
- **Loom:** Record user interviews
- **Maze:** Rapid usability testing
- **UsabilityHub:** 5-second tests, click tests
- **Hotjar:** Heatmaps, session recordings
- **Typeform:** Beautiful surveys

### Analytics Tools
- **Mixpanel:** Event tracking
- **PostHog:** Open-source analytics
- **Google Analytics:** Traffic analysis
- **Stripe Dashboard:** Payment metrics

### Research Communities
- **r/userexperience** (Reddit)
- **User Research Discord**
- **JTBD Community**
- **Lenny's Newsletter** (product strategy)

---

## TL;DR: The 5 Research Commandments

1. **Talk to users every sprint** (≥5 conversations)
2. **Test before you build** (prototype → validate → code)
3. **Watch behavior, not opinions** (what they do > what they say)
4. **Combine data + stories** (analytics + interviews)
5. **Ship fast, learn fast** (perfect is the enemy of done)

---

*"The goal of user research isn't to build what users ask for. It's to understand their problems deeply enough to build what they actually need."*

**Last Updated:** March 7, 2026
