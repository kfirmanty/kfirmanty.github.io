# WALKTHROUGH — Virtualny Inspektorat

## Premise

You have been summoned to obtain your **Zasviedczenie** (Certificate of Existence). Without it, you cannot prove you exist. Your appointment was scheduled seven years ago.

---

## Scene 1: Reception (temple_exterior)

**You spawn on** a stone platform before a golden temple on water. Floating orbs drift in the distance.

**onStart dialogue:** Three text boxes establish the premise — you've been summoned, your appointment is seven years overdue, you need a Certificate of Existence.

### Flavor objects to verify:
1. **Sign (right side, near stairs)** — hover: "Read the Sign" — text about office hours being "ALWAYS AND NEVER"
2. **Bulletin Board (left side)** — hover: "Read the Bulletin Board" — contradictory notices about Form C-12 (you need it to exist, but you need to exist to get it)
3. **Number Dispenser (near front of stairs)** — hover: "Take a Number" — pulses gently — your number is infinity minus one, currently serving 3

### Main puzzle:
- **Click the bobbing stone head** (hover: "Speak to the Receptionist")
- Dialogue 1: "TAKE A NUMBER... Your number is INFINITY..."
- Dialogue 2: "You appear to have an APPOINTMENT. Seven years overdue..."
- Dialogue 3: Security question — "State the purpose of your visit."
  - **"To obtain my certificate"** → CORRECT → transitions to temple_interior
  - "To seek the truth" → wrong (Philosophy dept closed seven centuries ago)
  - "To gain power" → wrong (clearance level: NONE)
  - "I don't remember" → wrong (amnesia not valid ID)

---

## Scene 2: Hall of Forms (temple_interior)

**You spawn in** a dark marble room with glowing floor tiles, floating orbs, and a crystal with rotating torus rings on an altar at the back.

**Title notification:** "HALL OF FORMS"

### Flavor objects to verify:
1. **Regulation Sign (left wall)** — hover: "Read the Regulation" — Regulation §12.4 about triplicate forms (original for Archive, first copy for the Void, second for you but you can't keep it)
2. **Patience Sign (above entrance wall)** — hover: "Read the Sign" — "BE PATIENT. Your wait is important to us. Your existence, less so."

### Decoy forms to verify (all are examine-only, NOT pickups):
3. **Form Z-7/a (pink, left-back area)** — hover: "Take Form Z-7/a" — text says you need Z-7/b, they differ by a single load-bearing comma
4. **Form Z-7/c (purple, left-front area)** — hover: "Take Form Z-7/c" — three steps ahead of where you are
5. **Form Z-0 (cyan, right-front area)** — hover: "Take Form Z-0" — Proof of Nonexistence, useful but not what you came for

### Main puzzle:
1. **Pick up Form Z-7/b** (yellow, right-back area near altar) — hover: "Take Form Z-7/b" — pickup, item name "FORM Z-7/b"
2. **Click the crystal** (hover: "Insert Form into Processing Terminal")
   - WITHOUT form: "The Processing Terminal hums expectantly. It requires a valid form..."
   - WITH form: Processing complete, issued Form Z-7/c, proceed to Waiting Area → **transitions to lake**

---

## Scene 3: Waiting Area (lake)

**You spawn on** a hilly landscape with a lake, palm trees, scattered ruins, and a Nessie-like creature in the water.

**Title notification:** "WAITING AREA"

### Flavor objects to verify:
1. **NOW SERVING display (left, near spawn)** — hover: "Check the Display" — NOW SERVING: 3, your number: infinity minus one, hasn't changed since the Third Age
2. **Stone Bench with plaque (left, near spawn)** — hover: "Read the Plaque" — reserved for Petitioner #2, status PENDING since First Era
3. **Petrified Petitioner (head on the bench)** — hover: "Examine the Petrified Petitioner" — turned to stone from waiting, clutching ticket #2
4. **Waiting Sign (right, near spawn)** — hover: "Read the Sign" — patience is mandatory, Complaints Department doesn't accept complaints

### Main interactions:
1. **Speak to the Eternal Petitioner** (the Nessie creature's head, long interact distance of 12)
   - Dialogue about being ticket #437, system is "THEMATIC" not sequential
   - Advises finding the Stamp at the old Shrine
   - Has been waiting so long legs became roots
2. **Pick up the Stamp of Passage** at the small shrine (far back of map, across terrain) — hover: "Take the Stamp of Passage"
3. **Portal (torus, far left-back, near ruined column)** — hover: "Present Stamp at Portal"
   - WITHOUT stamp: "STAMP REQUIRED FOR PASSAGE. Unauthorized passage is unauthorized."
   - WITH stamp: Access granted, authorization level MINIMAL → **transitions to garden**

---

## Scene 4: The Archive (garden)

**You spawn on** a lush green terrain with trees, flowers, a fountain, ruins, and arches.

**onStart dialogue:** Two boxes — you've entered the Archive (records department), nature has taken over, filing system is "BOTANICAL."

**Title notification:** "THE ARCHIVE"

### Flavor/clue objects to verify:
1. **Stone Sign (right, near spawn)** — hover: "Read the Stone Sign" — Archive procedure in 5 steps (present Olfactory Credential → get clue → speak Word → get Access Code → use on Fountain)
2. **Obelisk (left-back, leaning)** — hover: "Read the Obelisk" — **CRITICAL CLUE**: Official Mineral Registry lists Obsidian (black), Chrysalis (golden), **Malachite (green, "the living stone")**, Alabaster (white). Notes "the Archivist marked it as 'the green one.'"

### Main puzzle chain (4 steps):

**Step 1: Pick up the Olfactory Credential**
- Glowing pink sphere in the flower patch (left area) — hover: "Take the Olfactory Credential"

**Step 2: Speak to the Archivist**
- Stone head on pedestal (right-center) — hover: "Speak to the Archivist"
- WITHOUT credential: "The Archivist's stone nostrils flare... requires some kind of olfactory credential."
- WITH credential: 4 dialogue nodes
  - Files by SMELL — only reliable system
  - Word catalogued under "GREEN MINERALS"
  - Can't remember exact word, says check the Obelisk, "the green one"
  - Beyond Arch find Access Code, bring to Fountain, code is expired but system not updated
  - Sets state: `keeper_spoke = true`

**Step 3: Speak the Word at the Sealed Arch**
- Pediment structure with columns (right-back) — hover: "Speak to the Sealed Arch"
- WITHOUT `keeper_spoke`: "The Arch is sealed. VOICE-ACTIVATED SECURITY. Authorized Word required."
- WITH `keeper_spoke`: Voice-activation system crackles to life
  - **"Malachite"** → CORRECT → "WORD ACCEPTED. Pronunciation rated: ADEQUATE." → sets `arch_open = true`
  - "Obsidian" → wrong (black, not the Word, noted in your file)
  - "Chrysalis" → wrong (golden, not the color of the Archive's heart)
  - "Alabaster" → wrong (white and forgettable)

**Step 4: Take the Access Code**
- Torus shape behind the arch (further back) — hover: "Take the Access Code"
- WITHOUT `arch_open`: "The Access Code hovers beyond the Sealed Arch. You cannot reach it without the WORD."
- WITH `arch_open`: Pickup, item name "ACCESS CODE (EXPIRED)"

**Step 5: Use Access Code at Fountain**
- Fountain basin (center of map) — hover: "Enter Access Code at Fountain"
- WITHOUT access code: "ACCESS CODE REQUIRED. Code available beyond the Sealed Arch. Arch requires the Word. Good luck."
- WITH access code: Code expired seven centuries ago but system agrees this is FINE → **transitions to vault**

---

## Scene 5: Verification Department (vault)

**You spawn in** a dark crystal cave with glowing pillars, crystal formations, and a massive crystal wall barrier dividing the room.

**onStart dialogue:** Two boxes — you've descended into the Verification Department, three tablets on walls, Auditor waits beyond barrier.

**Title notification:** "VAULT" *(id is "vault")*

### Flavor objects to verify:
1. **Employee of Eternity frame (left wall)** — hover: "Read the Plaque" — frame is empty, position vacant since employment was invented
2. **Regulation Poster (right wall)** — hover: "Read the Poster" — "EXISTENCE IS A PRIVILEGE, NOT A RIGHT" — "This poster exists. You may not."

### Verification Tablets (read all 3!):
1. **Tablet A (left wall, front section)** — hover: "Read Verification Tablet A" — "the Petitioner EXISTS. Date of existence: always. Record is FINAL."
2. **Tablet B (right wall, middle)** — hover: "Read Verification Tablet B" — "the Petitioner does NOT exist and has NEVER existed. Record is FINAL."
3. **Tablet C (left wall, back section)** — hover: "Read Verification Tablet C"
   - WITHOUT `vault_open`: "The security barrier blocks access to this tablet."
   - WITH `vault_open`: "existence is a FORMALITY and the distinction is PURELY ADMINISTRATIVE. Record is FINAL."

### Main puzzle:

**Step 1: Break the Security Barrier**
- Crystal wall (center of room) — hover: "Present Stamp at Security Barrier"
- WITHOUT stamp: "STAMP OF PASSAGE REQUIRED. This is a SECURITY BARRIER, not a suggestion."
- WITH stamp (carried from lake): Stamp validated, barrier shatters → sets `vault_open = true`
- **Now Tablet C and the Auditor become accessible**

**Step 2: Read all three tablets** (A, B, and now C) to understand the contradiction

**Step 3: Speak to the Auditor**
- Stone head on pedestal (far back of room) — hover: "Speak to the Auditor"
- WITHOUT `vault_open`: "The Auditor looms beyond the security barrier..."
- WITH `vault_open`: 3 dialogue nodes
  - Documents reviewed, there is an "inconsistency"
  - Tablet A says exist, Tablet B says don't, Tablet C says distinction is administrative
  - "Which statement is CORRECT?"
    - **"All of the above"** → CORRECT → "Per Regulation §47.3(b), all contradictory records are simultaneously valid. Standard status." → **transitions to spire**
    - "I exist (Tablet A)" → wrong (Tablet B also FINAL, can't choose one truth)
    - "I don't exist (Tablet B)" → wrong (who is standing here filing this claim?)
    - "It doesn't matter (Tablet C)" → wrong (administrative matters are the ONLY matters)

---

## Scene 6: Director's Office (spire)

**You spawn on** an elevated platform above the clouds, with columns, a grand altar/pedestal, floating orbs, and a large stone head at the far back.

**onStart dialogue:** Two boxes — you've reached the Director's Office above everything, certificate awaits.

**Title notification:** "DIRECTOR'S OFFICE" *(id is "spire")*

### Flavor objects to verify:
1. **Memorial A (left-front)** — hover: "Read the Memorial" — Inspektorat processed exactly ONE form, which was lost, committee formed to find it but committee required a form
2. **Memorial B (right-front)** — hover: "Read the Memorial" — when world dissolved into Vapor, office hours remained ALWAYS AND NEVER, queue continues
3. **Director's Desk (center, on upper platform)** — hover: "Examine the Director's Desk" — drawers labeled PENDING, ALSO PENDING, PENDING (REVIEW OF PENDING STATUS)
4. **Motivational Sign (back wall, above)** — hover: "Read the Motivational Sign" — "YOUR WAIT IS OVER. (A new wait will begin shortly.)"
5. **Map (left-front, lower level)** — hover: "Read the Map" — impossible structure map, YOU ARE HERE arrow points to NOWHERE

### Main puzzle:

**Step 1: Pick up Certificate of Existence**
- Glowing pink sphere on altar (upper platform) — hover: "Take the Certificate of Existence"

**Step 2: Speak to the Director**
- Large stone head (far back, above upper platform) — hover: "Speak to the Director"
- WITHOUT certificate: "The Director appears to be napping. Sign: DO NOT DISTURB WITHOUT PROPER DOCUMENTATION."
- WITH certificate: 4 dialogue nodes
  - Was NOT sleeping, was CONTEMPLATING POLICY
  - Mildly impressed you survived the whole Inspektorat
  - Has the certificate, just needs to stamp it, one final "FORMALITY"
  - "What is the PURPOSE of your visit today?"
    - **"To obtain my certificate"** → CORRECT → the one you're already holding, how PECULIAR, STAMPED, you now officially EXIST, name misspelled, this is STANDARD
    - "To discover the truth" → wrong (Philosophy dept closed)
    - "To restore the Inspektorat" → wrong (never stopped operating)
    - "I have forgotten" → wrong (wrong place or right place, Inspektorat doesn't distinguish)
- **onSuccess:** Notification (12 seconds): "THE END — Your Certificate of Existence has been stamped. Your name is misspelled. Please allow 6-8 eternities for processing. Do NOT file a complaint."

### The Loop (optional):
- **Complaints Desk (right-front, lower level)** — hover: "File a Complaint" — always available
  - Dialogue warns returning to Reception, all progress RECONSIDERED
  - **"File the complaint"** → CORRECT → complaint FILED → **transitions back to temple_exterior** (the eternal loop!)
  - "Accept the misspelling" → wrong answer (stays, Inspektorat appreciates your COMPLIANCE)

---

## Complete Item Checklist

| # | Item | Found In | Used In | State Key |
|---|------|----------|---------|-----------|
| 1 | Form Z-7/b | temple_interior (altar area) | temple_interior (crystal terminal) | `has_form_z7b` |
| 2 | Stamp of Passage | lake (shrine, far back) | lake (portal) + vault (crystal wall) | `has_stamp` |
| 3 | Olfactory Credential | garden (flower patch) | garden (Archivist) | `has_credential` |
| 4 | Access Code (Expired) | garden (behind arch) | garden (fountain) | `has_access_code` |
| 5 | Certificate of Existence | spire (altar) | spire (Director) | `has_certificate` |

## State Flags Checklist

| Flag | Set By | Required By |
|------|--------|-------------|
| `keeper_spoke` | garden: Archivist dialogue | garden: Sealed Arch |
| `arch_open` | garden: Sealed Arch correct answer | garden: Access Code pickup |
| `vault_open` | vault: crystal wall + stamp | vault: Tablet C + Auditor |
