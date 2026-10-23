# Core Business Logic & Institutional Calculations

**Document ID:** `BACK-LOGIC-002`  
**Classification:** Business Rules & Computational Specifications  
**Verification Category:** Verified in source (`lib/batchUtils.ts`, `app/api/admin/batches/[batchId]/check-completion/route.ts`)  

---

## 1. Batch & Training Calendar Math

### 1.1 Canonical Batch Name Formula
Every training batch is assigned a standardized nomenclature:
$$\text{Batch Name} = \text{ARVR-}[\text{LevelCode}]-[\text{BatchNo}]-[\text{DDMMMYY}]$$
- **LevelCode:** Derived from Level configuration: `L1` (Level 1), `L2` (Level 2), `L3` (Level 3).
- **BatchNo:** 3-digit zero-padded sequence (`001`, `002`, etc.).
- **DDMMMYY:** Uppercase start date representation (e.g., `18AUG26`).
- **Verified Output Example:** `ARVR-L1-001-18AUG26`.

### 1.2 Capstone Final Examination Design
- **Institutional Rule:** The final day of every batch ($N = \text{trainingDays}$) is strictly designated as the **Final Examination**.
- **Automated Title:** `Final Examination: [Level] Comprehensive Practical Assessment`.
- **Exam Date:** Always matches the batch `endDate`.

---

## 2. Attendance & Certification Eligibility Engine

### 2.1 Session Calculation
$$\text{Max Scheduled Sessions} = \sum_{d=1}^{N} \Big( (d.\text{hasForenoon} \neq \text{false} ? 1 : 0) + (d.\text{hasAfternoon} \neq \text{false} ? 1 : 0) \Big)$$
- If unscheduled in the calendar, defaults to $N \times 2$.
- Student attendance percentage:
$$\text{Attendance \%} = \min\left(100, \text{round}\left( \frac{\text{Attended Count}}{\text{Max Scheduled Sessions}} \times 100 \right)\right)$$

### 2.2 Certificate Validity & Eligibility Criteria
A student is automatically issued a valid certificate if and only if all of the following conditions are met:
1. **Attendance Threshold:** Attendance percentage $\ge \text{ATTENDANCE\_THRESHOLD}$ (default configured in `SystemSetting`, typically $100\%$ or $75\%$).
2. **Final Exam Attendance:** The student marked attendance on the official Exam Date (unless explicitly bypassed via `overrideExamAttendance`).
3. **Task Completion:** At least 1 submitted practical task is in status `ACCEPTED` or `GRADED`.
4. **Trainer Evaluation:** At least 1 evaluation record exists for the student.
5. **Manual Override:** System administrators may set `isManualOverride = true` with a mandatory `overrideReason` to grant a certificate to students with medical exemptions.

### 2.3 Letter Grade Calculation Table

| Numerical Score Range | Grade Assigned | Description | Preset Score |
| :---: | :---: | :--- | :---: |
| **90 – 100** | `O` | Outstanding Achievement | 95 |
| **80 – 89** | `A+` | Excellent Visual & Spatial Fidelity | 88 |
| **70 – 79** | `A` | Proficient Practical Implementation | 80 |
| **60 – 69** | `B+` | Good Application Logic | 72 |
| **50 – 59** | `B` | Satisfactory Minimum Criteria | 65 |
| **0 – 49** | `C` | Re-evaluation Required / Remedial | 55 |

*Note: If the student completed the Final Exam, the Final Grade is awarded directly from the Final Exam evaluation record. If unexamined, the grade is derived from the arithmetic mean of all evaluated daily tasks.*

### 2.4 Certificate Serial Number Sequencing
Certificates are generated within an atomic database transaction (`prisma.$transaction`) with the following sequence:
$$\text{Certificate Number} = \text{ARVR-}[\text{CleanBatchCode}]-[\text{Sequence Number (4 digits)}]$$
- **Example:** `ARVR-L100118AU-0001`
