# 🩺 Ayu Disha — Investor Pitch

> *"Clinic-OS for Bharat. Built for doctors who treat 700 million people that Practo never reached."*

---

## Slide 1 — The Hook

**Every day, a village doctor in Bihar sees 60 patients.**
He writes every prescription on paper.
He has no idea which patients didn't return.
He loses ₹40,000/month in unbilled consultations.
He has never heard of Practo.

**We built Ayu Disha for him.**

---

## Slide 2 — The Problem

### India has 2 healthcare systems

| Urban India | Bharat (Tier 2, 3, Rural) |
|---|---|
| Apollo, Fortis, Max | PHCs, AYUSH clinics, solo practitioners |
| Practo, HealthPlix | **Nothing. Paper. WhatsApp. Memory.** |
| English-speaking, tech-savvy doctors | Vernacular-first, bandwidth-constrained |
| Can afford ₹5,000/month SaaS | Can't pay more than ₹200/month |

> **600 million+ patients in India are served by clinics that run entirely on pen and paper in 2025.**

### The real cost of no clinic software:
- 🔴 Doctors **miss 20-30% of billable consultations** (no tracking)
- 🔴 Patients **can't recall their own prescriptions** 2 days later
- 🔴 ASHA workers **walk blind** into villages with no patient history
- 🔴 Disease outbreaks go **undetected** for weeks because no one aggregates local data

---

## Slide 3 — The Solution

# Ayu Disha
### *Clinic Operating System for Rural & Semi-Urban India*

A **multi-role, offline-capable, vernacular-friendly** health management platform with three interfaces:

| Role | Platform | Core Value |
|---|---|---|
| **Doctor / Clinician** | Web Dashboard | Queue management, EMR, billing, diagnostics |
| **Patient** | Mobile App (Android) | Appointments, records, AI symptom check |
| **ASHA Worker** | Mobile App (Android) | Community health tracking, home visit logs |

**One platform. Three users. One connected healthcare loop.**

---

## Slide 4 — Product Demo

### Clinician Web Dashboard
- ⚡ **Live OPD Queue** — Token-based queue, real-time status updates
- 📋 **Digital EMR** — Diagnosis entry with ICD-10 codes, prescription generation
- 💊 **AI Diagnostic Assist** — Symptom → probable diagnosis suggestions
- 📊 **Analytics** — Revenue, patient return rates, disease frequency heatmaps
- 🖨️ **WhatsApp prescription delivery** — No app needed for the patient

### Patient Mobile App
- 📅 Book appointments, get token numbers
- 📁 Store all past prescriptions & lab reports
- 🤖 AI symptom checker before visiting the clinic
- 🔗 **ABHA Integration** — Links with national health ID seamlessly

### ASHA Worker App
- 🏘️ Track village-level patient health journeys
- 📍 Log home visits with GPS and notes
- 🔔 Alerts for patients who missed follow-ups

---

## Slide 5 — Why Now?

### The Government Has Built the Highway. We Build the Car.

The **Ayushman Bharat Digital Mission (ABDM)** has:
- Issued **700M+ ABHA IDs** to Indian citizens
- Mandated that all health software be ABDM-compliant by 2026
- Created a **₹15,000 Cr+ incentive ecosystem** for digital health adoption

> **The government forced the market to exist. Now it needs software to fill it.**

Ayu Disha is built to be **ABDM-compliant from Day 1**, making it the natural choice for clinics that need to digitize to receive government benefits.

---

## Slide 6 — Market Size

### Total Addressable Market (TAM)

| Segment | Count | Avg Revenue Potential |
|---|---|---|
| Private solo practitioners (India) | ~1.2 Million | ₹1,200/yr |
| AYUSH / alternative medicine clinics | ~800,000 | ₹800/yr |
| PHC & government sub-centres | ~180,000 | ₹0 (gov grant-funded) |
| Small hospitals (< 30 beds) | ~70,000 | ₹6,000/yr |

**TAM: ~$400M/year** in India alone (clinic software + health data licensing + pharma analytics)

**SAM (Serviceable, Tier 2-3 focus): ~$80M/year**

**SOM (Realistic 3-year target): ~$4M ARR** with 100,000 clinics at ₹3,600/year

---

## Slide 7 — Competition & Differentiation

### Why not just use Practo / HealthPlix?

| Feature | Practo | HealthPlix | **Ayu Disha** |
|---|---|---|---|
| Target user | Urban specialist | Urban GP | **Rural/semi-urban doctor** |
| Price | ₹3,000-8,000/mo | ₹2,000-5,000/mo | **₹0 freemium / ₹299/mo** |
| Offline mode | ❌ | ❌ | **✅ SQLite-first sync** |
| Vernacular UI | ❌ | ❌ | **✅ Hindi, Tamil, Telugu** |
| ASHA worker module | ❌ | ❌ | **✅ Built-in** |
| WhatsApp prescriptions | ❌ | ❌ | **✅ No app needed** |
| ABDM compliant | Partial | Partial | **✅ Native** |

> **We are not competing with Practo. We are serving the 95% of Indian clinics Practo chose to ignore.**

---

## Slide 8 — Tech Stack & Moats

### What we built (and why it matters)

**Backend:** Python (FastAPI) + PostgreSQL + Firebase Auth
- REST APIs for all three user types
- Real-time queue via WebSockets
- AI diagnostic service (`diagnostic.py`) — local inference, no cloud costs

**Mobile:** React Native (Expo) — one codebase, Android-first
- Offline SQLite database syncs when internet available
- Works on ₹5,000 Android phones

**Web:** React (Vite) — Clinician dashboard
- Role-based access: Doctor, Admin, Nurse
- Designed for 10-inch tablets common in clinics

### Our Moats
1. **Data moat:** Every clinic that joins contributes anonymized local disease pattern data
2. **Network effect:** ASHA workers bring in village patients; patients bring in clinics
3. **Switching cost:** After 6 months of digital records, a clinic will never go back to paper
4. **Regulatory moat:** ABDM compliance is hard — we're built for it from the ground up

---

## Slide 9 — Business Model

### Multiple revenue streams, zero dependency on a single one

| Stream | Model | When |
|---|---|---|
| **Freemium SaaS** | Free for <50 patients/day; ₹299/mo for premium | Day 1 |
| **Government contracts** | Partner with NHM/state health missions for PHC digitization | Year 1 |
| **Pharma analytics** | Anonymized, aggregated prescribing pattern data to pharma companies | Year 2 |
| **Lab & pharmacy referrals** | Commission on lab test bookings & medicine orders | Year 1 |
| **Insurance integrations** | Claim submission APIs for PM-JAY, Ayushman | Year 2 |

**Unit economics (target Year 2):**
- CAC: ₹800/clinic (via ASHA worker referrals — viral, zero-cost)
- LTV: ₹10,800/clinic over 3 years
- **LTV:CAC = 13.5x** 🚀

---

## Slide 10 — Traction

### What we've built (not just deck slides)

✅ **Working MVP** — Full-stack application live and running
- Backend API (FastAPI) — All endpoints functional
- Clinician Web Dashboard — Queue + EMR + billing live
- Patient Mobile App — Appointments + records (Expo/React Native)
- ASHA Worker Module — Community tracking live
- AI Diagnostic Module — Integrated and functional

✅ **Multi-role architecture** — Doctor, Patient, ASHA, Admin roles
✅ **Real-time queue management** — WebSocket-based live updates
✅ **Firebase Auth** — Production-grade authentication live

**Next 60 days:**
- [ ] Pilot with 5 clinics in Tier-2 city
- [ ] ABDM sandbox integration
- [ ] WhatsApp Business API integration

---

## Slide 11 — Team

> *(Customize this section with actual team details)*

**Why us?**
- We come from the same communities we're building for
- We've seen paper prescriptions get lost, misread, ignored
- We're technical builders — **the product you saw is real, not a mockup**
- We understand the ABDM ecosystem and regulatory landscape

---

## Slide 12 — The Ask

### Seed Round: ₹1.5 Crore (~$180,000)

| Use of Funds | Amount | Purpose |
|---|---|---|
| **Product** | ₹50L | ABDM compliance, vernacular UI, offline sync hardening |
| **Pilot Expansion** | ₹30L | On-ground ops in 3 states, 500 clinics |
| **Team** | ₹40L | 2 engineers, 1 field ops lead |
| **Marketing** | ₹20L | ASHA worker referral program, state health department partnerships |
| **Legal & Compliance** | ₹10L | ABDM certification, data privacy (DPDP Act) |

**In return:** Equity or convertible note — open to discussion.

**18-month milestones:**
- 10,000 clinics onboarded
- ₹1.2 Cr ARR
- 3 state government MoUs signed
- Series A ready

---

## Slide 13 — Vision

> **"In 5 years, every doctor in India — whether in Mumbai or a Manipur village — should be able to open Ayu Disha on a ₹5,000 phone and give their patient the same quality of digitally-managed care that a Fortis doctor gives."**

This isn't just a startup.

It's **health equity through software.**

India has 1.4 billion people. 900 million of them deserve better than a prescription scribbled on torn paper.

**We're building for them.**

---

## Appendix

### Key Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Low digital literacy in target segment | ASHA workers as on-ground trainers; WhatsApp-first UX |
| Price sensitivity | Freemium tier; government subsidies |
| Connectivity issues | Offline-first SQLite sync architecture |
| Regulatory complexity | ABDM-native from Day 1; legal advisor on team |
| Scaling cold-start problem | Partner with state NHM programs for initial clinic onboarding |

### Relevant Government Tailwinds
- **PM Digital Health Mission** — ₹1,600 Cr budget for health digitization
- **ABDM mandate** — All clinics must be ABDM-linked to receive Ayushman payments
- **PM-JAY expansion** — 500M+ new beneficiaries need digital claim processing
- **NHM funding** — ₹37,000 Cr/year for primary healthcare, increasingly tied to digital reporting
