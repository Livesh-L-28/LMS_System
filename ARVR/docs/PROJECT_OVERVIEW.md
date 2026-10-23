# Project Overview: AR/VR Academy Platform

**Document ID:** `PROJ-OVER-001`  
**Classification:** System Overview & Functional Capability Register  
**Verification Category:** Verified in source code analysis  

---

## 1. Academy Mission & Value Proposition

The AR/VR Academy Platform serves as the central learning management and operational nervous system for immersive spatial computing education. In spatial computing training (Unity XR Interaction Toolkit, Meta Quest Passthrough, Apple visionOS development, WebXR), physical presence in the hardware lab is mandatory. 

The platform guarantees institutional credibility through:
1. **Physical Geofenced Attendance:** Automated verification ensuring students are physically present in the lab during Forenoon (FN) and Afternoon (AN) windows before task submission is unlocked.
2. **Interactive Curriculum Roadmap:** 10-day progressive milestone timeline guiding students from basic scene setups to full spatial interactors and capstone examinations.
3. **Evidence-Based Evaluation:** Direct screenshot and build artifact reviews with instant feedback and grade presets.
4. **Automated Completion & Certification:** Enforces institutional attendance thresholds ($\ge 75\%$ or $100\%$) and exam completion rules to issue tamper-proof certificate serial numbers.

---

## 2. Portal Breakdown & User Personas

```mermaid
graph TD
    UserLanding["Platform Entrance (app/page.tsx)"]
    
    subgraph StudentPersona ["Student Persona"]
        S1["Register / Login via PIN"]
        S2["Live Countdown Attendance (FN/AN)"]
        S3["Mobile 1-Tap Floating Bar"]
        S4["Journey Roadmap Timeline"]
        S5["Practical Task Dropzone & Antivirus Badge"]
        S6["Real-Time Performance Dashboard"]
    end
    
    subgraph TrainerPersona ["Trainer Persona"]
        T1["Review Batch Submissions"]
        T2["Status Filter (ALL / PENDING / GRADED)"]
        T3["Split-Pane Evaluation Drawer"]
        T4["1-Click Grade Presets (O, A+, A, B+, B, C)"]
        T5["Score Slider & Feedback Suggestion Chips"]
    end
    
    subgraph AdminPersona ["Administrator Persona"]
        A1["Batch Calendar & Exam Date Math"]
        A2["Bulk CSV Roster Import"]
        A3["Geofence & Wi-Fi Policy Console"]
        A4["Google Drive Workspace Linking"]
        A5["Morning Watchdog Diagnostics"]
        A6["Automated Certificate & Excel Export"]
    end

    UserLanding --> StudentPersona
    UserLanding --> TrainerPersona
    UserLanding --> AdminPersona
```
