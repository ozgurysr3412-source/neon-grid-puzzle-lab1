# Open A/B Evidence -> Prototype Changes

This note summarizes publicly available A/B or randomized experiment findings and how they are translated into concrete design/code decisions in this prototype.

## 1) Friction Timing (Game Gating) - Cookie Cats

Source:
- Cookie Cats open dataset (90,189 players) and gate placement experiment fields (`gate_30` vs `gate_40`):  
  [Kaggle-linked dataset mirror repo](https://github.com/Jigisha-p/A-B-Testing-Mobile-Game---Cookie-Cat)

Reproduced metrics (`npm run analyze:cookiecats`):
- D1 retention: `44.82%` (`gate_30`) vs `44.23%` (`gate_40`)  
  Absolute diff `+0.59pp` (not strongly significant in this sample script: `p=0.074`).
- D7 retention: `19.02%` (`gate_30`) vs `18.20%` (`gate_40`)  
  Absolute diff `+0.82pp`, relative lift `+4.51%`, significant (`p=0.00155`).

Action in prototype:
- Reduced early frustration through easier opening sets:
  - `GENERATION.STARTER_SET_COUNT`
  - `GENERATION.STARTER_LARGE_LOCK`
- Guarantees at least a minimum number of currently placeable options in each draw:
  - `GENERATION.MIN_PLACEABLE_PIECES_OPEN/TIGHT`

## 2) Difficulty Personalization - Large RCT in F2P

Source:
- Ascarza, Netzer, Runge (2024/2025), randomized field experiment in a popular F2P mobile game:
  - [Working paper PDF (HBS)](https://www.hbs.edu/ris/Publication%20Files/Personalized%20Game%20Design_628b85ef-5028-4032-a0b7-4d0f3edf33a1.pdf)
  - [Published article page (IJRM)](https://doi.org/10.1016/j.ijresmar.2025.01.006)

Key findings used:
- Experiment scale: 300k+ players tracked over 12 weeks.
- Easier dynamic difficulty reduced immediate “need-to-pay” behavior in a round but increased engagement/retention and improved longer-term spending.

Action in prototype:
- Added adaptive generation policy based on pressure signals:
  - Board fill thresholds (`MID`, `TIGHT`)
  - Recovery weights (`SIZE_WEIGHTS_RECOVERY`) triggered after consecutive non-clear turns.
- High-pressure clears receive extra reward (`SCORING.HIGH_PRESSURE_CLEAR_BONUS`) to reinforce recovery skill.

## 3) Habit Loop A/B Tests - Duolingo (Published Talk Summary)

Source:
- Public write-up of Duolingo product A/B tests and reported uplifts:
  [Econsultancy summary](https://econsultancy.com/six-a-b-tests-used-by-duolingo-to-tap-into-habit-forming-behaviour/)

Reported uplifts (selected):
- Streak visibility: `+3% DAU`, `+1% D14`.
- Streak emphasis after lesson: `+1% DAU`, `+3% D14`.
- Weekend amulet: `+4% D14`, `-5% streak loss`.
- Better badge structure: `+2% DAU`, `+2% D14`.

Action in prototype:
- Added lightweight habit-supportive loops (without paywall pressure):
  - Daily run mode with deterministic seed.
  - Daily streak tracking.
  - One mission per run with clear target and completion reward.
  - Weekly top list (local, rolling by week key).

## 4) Notification Timing RCT - Push Interventions

Source:
- Bell et al. (JMIR 2023), micro-randomized trial of app notifications:
  [Paper PDF](https://researchonline.lshtm.ac.uk/4670200/1/Bell-etal-2023-How-notifications-affect-engagement-with.pdf)

Key findings used:
- Receiving a notification increased app-open probability in the next hour by `3.5x`.
- 24h effect still positive (`1.3x`) but no significant long-term disengagement reduction across static policies.

Action in prototype:
- Added only reminder hooks conceptually via meta telemetry/debug; avoided heavy notification-spam assumptions.
- Design emphasis remains on in-session core loop quality over intrusive re-engagement.

## 5) Personalization Revenue Potential in Puzzle Context

Source:
- Pape et al. (IJIO 2025), mobile puzzle personalization study:
  [ScienceDirect open abstract](https://www.sciencedirect.com/science/article/pii/S0167718724000833)

Key finding used:
- Model-based personalization indicated strong revenue upside potential from better difficulty fit.

Action in prototype:
- Difficulty fairness and adaptive piece generation were prioritized as first-class systems, kept tunable in one config file.

## Implementation Coverage Across Requested Workstreams

1. **Temel Oynanış Güvenilirliği**
- Added state validation checks and smoke simulation script.

2. **Kontrol Hissi (Drag/Drop)**
- Added board snap tolerance, invalid-drop feedback, and hint action.

3. **Parça Üretimi ve Adalet**
- Added adaptive weighted generator + minimum-placeable guarantee.

4. **Skor/Combo Ekonomisi**
- Added chain and pressure bonuses; mission completion reward.

5. **Geri Bildirim (VFX/SFX/Haptik)**
- Added invalid-drop shake, floating score texts, haptic hooks.

6. **UI/UX Okunabilirlik**
- Added sub-HUD (mode, streak, mission, turn), hint button, cleaner game-over context.

7. **Meta/Retention Özellikleri**
- Added daily seeded mode, streak progression, weekly local top list, mission loop.

8. **Teknik Sağlamlık ve Araçlar**
- Added reproducible analytics script, smoke tests, telemetry store, debug panel.
