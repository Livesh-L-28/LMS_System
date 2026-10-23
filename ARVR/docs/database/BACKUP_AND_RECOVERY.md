# Database Backup, Disaster Recovery & High Availability

**Document ID:** `DB-BCK-005`  
**Classification:** Disaster Recovery & Business Continuity  
**Target Engine:** MongoDB Atlas Cloud Cluster  
**Verification Category:** Verified live & configuration-dependent  

---

## 1. High Availability & Cloud Replica Set

The platform relies on a distributed 3-node MongoDB Atlas replica set ensuring automatic failover and zero data loss:

| Component | Node Specification | Primary Function |
| :--- | :--- | :--- |
| **Primary Node** | MongoDB Atlas Replica Leader | Handles all application read and write operations; generates append-only replication oplog. |
| **Secondary Node 1** | Hot Standby Replica | Replicates oplog in real-time; immediately eligible for election if Primary fails. |
| **Secondary Node 2** | Hot Standby Replica | Maintains quorum; acts as second election voting member and read replica candidate. |

### 1.1 Automated Failover Performance
- **Heartbeat Interval:** 2 seconds.
- **Failover Threshold:** Sub-5 seconds ($< 5\text{s}$) to detect node failure, conduct Raft election, and promote a new Primary.
- **Client Resilience:** Next.js application instances handle node transitions transparently via `withPrismaRetry` exponential backoff without dropping active sessions.

---

## 2. Backup & Point-in-Time Recovery (PITR)

### 2.1 Continuous Cloud Backup (Atlas)
- **Snapshot Frequency:** Automated continuous snapshots with point-in-time recovery (PITR) granular to the second.
- **Retention Schedule:**
  - Hourly snapshots: Retained for 24 hours.
  - Daily snapshots: Retained for 30 days.
  - Monthly snapshots: Retained for 1 year.
- **Recovery Time Objective (RTO):** $< 15\text{ minutes}$ for full cluster restoration.
- **Recovery Point Objective (RPO):** $< 1\text{ minute}$ of transactional data loss.

---

## 3. Database Isolation Strategy

- **Staging Database:** Namespace `lmssystem_staging` in MongoDB Atlas.
- **Production Database:** Namespace `lmssystem` in MongoDB Atlas.
- **Network Access Control:** Restricted via Atlas IP Access Lists (Render outbound egress IPs and authorized developer VPNs).
- **Zero-Secret Rule:** Database connection strings containing user credentials (`mongodb+srv://...`) are injected exclusively via runtime environment variables (`DATABASE_URL`) and never committed to version control.
