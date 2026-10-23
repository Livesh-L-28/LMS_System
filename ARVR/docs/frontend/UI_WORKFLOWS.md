# End-to-End User Interface Workflows

**Document ID:** `FRONT-WORK-005`  
**Classification:** User Experience & Interaction Specifications  
**Verification Category:** Verified in source (`StudentPortal.tsx`, `TrainerPortal.tsx`, `StaffPortal.tsx`)  

---

## 1. Student Daily Learning & Submission Workflow

```mermaid
graph TD
    Login["1. Student Sign In (Register No + 6-digit PIN)"] --> Home["2. Land on Student Workspace"]
    Home --> AttCheck["3. Attendance Sub-tab"]
    
    AttCheck --> WindowOpen{"Is FN or AN Window Open?"}
    WindowOpen -->|Yes| MarkAtt["Click 'Mark Attendance' (or Mobile Bar)"]
    WindowOpen -->|No / Urgent| WaitTimer["Inspect Live Countdown Badge"]
    
    MarkAtt --> GeoCheck["Browser requests Geolocation (GPS)"]
    GeoCheck --> AttSuccess["Server verifies < 100m & records attendance\nHaptic Vibration [40, 60, 40]ms"]
    
    AttSuccess --> CurriculumView["4. Journey Sub-tab (Syllabus Roadmap)"]
    CurriculumView --> ReviewDay["Select Active Day Node & Read Practical Tasks"]
    
    ReviewDay --> TaskSubmit["5. Submission Sub-tab"]
    TaskSubmit --> GateCheck{"Are both FN & AN marked for today?"}
    GateCheck -->|No| LockedZone["Task Zone Gated: Complete attendance first"]
    GateCheck -->|Yes| DropZone["Drag & Drop Unity XR Screenshot"]
    
    DropZone --> ThumbPreview["Instant Live Thumbnail Preview (ObjectURL)\nZero-Trust Antivirus Scan Badge"]
    ThumbPreview --> FillDesc["Enter Implementation Notes & Commit Link"]
    FillDesc --> SubmitBtn["Click 'Submit Practical Evidence'"]
    SubmitBtn --> StatusSubmitted["Status transitions to 'SUBMITTED'"]
```

---

## 2. Trainer Split-Pane Evaluation Workflow

```mermaid
graph TD
    TrainerNav["1. Trainer signs in & navigates to #evaluations"] --> TableView["2. Renders Submissions Queue"]
    TableView --> FilterPills["3. Select Filter: ALL / PENDING / GRADED"]
    FilterPills --> SearchBox["4. Search student by Name or Register No"]
    
    SearchBox --> ClickRow["5. Click student submission row"]
    ClickRow --> OpenDrawer["6. Open Split-Pane Drawer (max-w-4xl)"]
    
    subgraph SplitPaneLayout ["Split-Pane Drawer Layout"]
        LeftPane["Left Column:\n- Full screenshot evidence preview\n- High-res zoom link\n- Student description\n- Submission timestamp"]
        RightPane["Right Column:\n- 6 Quick Grade preset chips (O, A+, A, B+, B, C)\n- Interactive score slider (0 - 100)\n- 5 One-click feedback suggestion chips\n- Custom comment text area"]
    end
    
    OpenDrawer --> SplitPaneLayout
    SplitPaneLayout --> QuickGrade["Click 'A+' chip (auto-sets score: 88)"]
    QuickGrade --> QuickChip["Click chip: 'Code structure is well organized'"]
    QuickChip --> SubmitEval["Click 'Submit Evaluation'"]
    SubmitEval --> UpdatedQueue["Drawer closes -> Submission moves to 'GRADED'"]
```

---

## 3. Administrator Batch & Certificate Workflow

1. **Batch Creation:** Admin opens `/#batches`, inputs Batch Name, Level (`Level 1`, `Level 2`, `Level 3`), start date, and training days count.
2. **Calendar Auto-Generation:** System calculates batch end date ($D_N = \text{startDate} + N - 1$), tags the final day as the Final Examination, and populates the 10-day curriculum.
3. **Roster Bulk Import:** Admin opens `/#students`, pastes a CSV table or uploads a file. System validates email and register number format, filters duplicate entries, and enrolls the class in 1 transaction.
4. **Attendance Threshold & Completion Auditor:** Admin opens `/#certificates` and clicks "Run Completion Audit". System checks if students achieved $\ge 100\%$ attendance and completed the Final Exam.
5. **Excel Export:** Generates an official multi-column `.xlsx` spreadsheet workbook formatted with Slate-800 header styling, student names, register numbers, dates, final grades, and certificate serials.
