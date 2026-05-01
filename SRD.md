# Software Requirements Document (SRD)
## HelpQ

**Document Version:** 1.1  
**Date Created:** April 15, 2026  
**Last Updated:** May 1, 2026  
**Status:** In Progress  
**Author(s):** Jerry, Sofia, Julia, Ceya

---

## 1. Introduction

### 1.1 Purpose
This Software Requirements Document (SRD) defines the current requirements for HelpQ, a real-time office-hours queue management web application. The system helps instructors and TAs manage high-volume help sessions while giving students clear visibility into wait position and queue progress.

### 1.2 Scope
Included in scope:
- Session creation and management for hosts (instructors/TAs)
- Real-time student queue join and status tracking
- Student queue entries with name and question details
- Queue moderation controls to reduce spam/misuse
- Basic queue metrics (active queue size and average wait estimate)

Out of scope for the current class project:
- University SSO integration and LMS integration
- Video call or chat tutoring features
- Native mobile app stores (web-first responsive app only)
- Advanced analytics dashboards beyond core sprint goals

### 1.3 Intended Audience
This document is intended for:
- CSC 307 instructors and graders
- Student development team members
- Project stakeholders and peer reviewers

### 1.4 Document Organization
This document is organized into the following sections:
- Introduction and Overview
- Functional Requirements
- Non-Functional Requirements
- Use Cases
- System Constraints
- Acceptance Criteria
- Glossary

---

## 2. Overall Description

### 2.1 Product Overview
HelpQ is a collaborative office-hours queue tool for courses with many students seeking help at once. Students join a session queue with their question, and hosts process requests in an organized, real-time workflow.

### 2.2 Product Perspective
The product is a standalone web application designed as a practical alternative to informal office-hours management methods (paper sign-ups, verbal lines, or ad hoc chat messages). In this iteration, it focuses on fast queue operations and visibility for both student and host roles.

### 2.3 Product Features (Summary)
- Feature 1: Host-created office-hours sessions with join code/link
- Feature 2: Real-time queue with live position updates
- Feature 3: Student question submission for each queue entry
- Feature 4: Queue controls for hosts (serve, remove, complete)

### 2.4 User Classes and Characteristics
HelpQ supports two primary role types plus first-time users:
- Students who need predictable and transparent help access
- Hosts (TAs/Professors) who coordinate high-volume queue traffic
- First-Time Users who need low-friction onboarding and clear UI cues

| User Class | Characteristics | Primary Goals |
|-----------|-----------------|---------------|
| Student | Joins sessions quickly, wants visibility and fairness | Enter queue fast, track position, know when their turn is near |
| Host (TA/Professor) | Runs office hours under time pressure | Create/manage sessions, process queue efficiently, reduce duplicate overhead |
| First-Time User | New to the queue workflow | Understand how to join/create sessions and submit clear help requests |

### 2.5 Operating Environment
HelpQ is delivered as a browser-based application.

**Hardware Requirements:** Any modern laptop or smartphone with internet access  
**Software Requirements:** Modern web browser (Chrome, Firefox, Safari, Edge)  
**Network Requirements:** Stable internet connection for real-time queue synchronization

### 2.6 Design and Implementation Constraints
- Must be feasible for a student team to implement within one academic term
- Must use technologies approved in CSC 307 project guidelines
- Must support concurrent queue updates from multiple users
- Must prevent queue misuse/spam entries with practical safeguards
- Must prioritize clear and accessible UI over advanced but risky integrations
- Planned stack: React, Node.js + Express, PostgreSQL, Socket.IO, Tailwind CSS

### 2.7 Product Vision (TE2)
For professors, TAs, and students who struggle with chaotic high-volume office-hours sessions, **HelpQ** is a **real-time office-hours queue management web application** which **structures help requests, gives students live position visibility, and lets hosts process queues efficiently**. Unlike **informal sign-up sheets or ad hoc chat-based Q&A**, our product **provides a synchronized, role-based queue workflow with real-time updates and basic anti-spam controls**.

---

## 3. Functional Requirements

### 3.1 Core Features

#### FR-1: Session Creation and Join
- **Description:** Hosts create an office-hours session; students join with a session identifier.
- **Actor(s):** Host, Student
- **Preconditions:** Host is authenticated; session does not already exist with the same active identifier.
- **Steps:**
  1. Host creates a session and receives a shareable join code/link.
  2. Student enters the join code/link.
  3. System validates session availability and admits student.
  4. Student sees queue entry form and current queue state.
- **Postconditions:** Active session exists and joined students are associated with it.
- **Alternate Flows:** If session code is invalid/closed, system shows a clear error and recovery actions.

#### FR-2: Queue Entry and Live Position Updates
- **Description:** Students submit a queue entry with name and question and receive real-time position updates.
- **Actor(s):** Student
- **Preconditions:** Student has joined an active session.
- **Steps:**
  1. Student submits queue entry data (name + question summary).
  2. System validates entry and inserts it at queue tail.
  3. System broadcasts updated queue state via Socket.IO.
  4. Student dashboard updates with current position and estimated wait.
- **Postconditions:** Student queue entry is persisted and visible to all relevant users.

#### FR-3: Host Queue Moderation and Completion
- **Description:** Hosts manage queue flow by serving, removing, or resolving entries.
- **Actor(s):** Host
- **Preconditions:** Host is in an active session with at least one queue entry.
- **Steps:**
  1. Host views ordered queue with student names and question summaries.
  2. Host selects next student and marks entry as "in progress."
  3. Host marks entry as complete or removes invalid/spam entries.
  4. System broadcasts queue changes to all connected clients.
- **Postconditions:** Queue remains consistent, up to date, and manageable during office hours.

### 3.2 User Stories (TE2)

Each story follows the required format and includes a designated main author.

1. **Main Author: Jerry**  
   As a host, I want to create an office-hours session so that students have a structured place to join for help.

2. **Main Author: Jerry**  
   As a host, I want to view all waiting students in order so that I can help people fairly and efficiently.

3. **Main Author: Jerry**  
   As a host, I want to mark students as in-progress or complete so that the queue always reflects the current state of office hours.

4. **Main Author: Sofia**  
   As a student, I want to join a session with a code or link so that I can enter the correct office-hours queue quickly.

5. **Main Author: Sofia**  
   As a student, I want to submit my name and question when joining the queue so that the host understands what help I need.

6. **Main Author: Sofia**  
   As a student, I want to view my current queue position in real time so that I can plan my waiting time.

7. **Main Author: Julia**  
   As a student, I want to see whether my request is waiting, in progress, or completed so that I know when to be ready.

8. **Main Author: Julia**  
   As a host, I want to remove duplicate or spam queue entries so that misuse does not disrupt office hours.

9. **Main Author: Julia**  
   As a host, I want a quick summary of active queue size so that I can estimate pace and communicate wait expectations.

10. **Main Author: Ceya**  
    As a first-time student user, I want a simple queue-entry form with clear field validation so that I can submit a valid request on the first try.

11. **Main Author: Ceya**  
    As a first-time host user, I want guided session setup prompts so that I can start office hours without confusion.

12. **Main Author: Ceya**  
    As a student, I want to receive a notification when my turn is near so that I can return to the queue view in time.
### 3.3 User Interface Requirements
[Describe UI mockups or wireframe requirements, if applicable]

### 3.4 Data Requirements
[Describe what data the system must manage, store, or manipulate]

---

## 4. Non-Functional Requirements

### 4.1 Performance Requirements
- **Response Time:** 95% of API requests should respond within 500 ms under normal class-project load.
- **Throughput:** Support at least 50 concurrent active users across all project teams/testers.
- **Load Handling:** Graceful degradation with informative error messaging under peak testing periods.

### 4.2 Security Requirements
- **Authentication:** Users must log in before accessing session and queue management features.
- **Authorization:** Users may only view and modify queue data for sessions they are permitted to join or host.
- **Data Protection:** Use HTTPS in deployment and avoid storing plaintext credentials.

### 4.3 Reliability Requirements
- **Availability:** Target 99% uptime during demo and grading windows.
- **Recovery Time Objective (RTO):** Service restored within 2 hours after major outage.
- **Recovery Point Objective (RPO):** Maximum 24 hours of data loss in worst-case failure.

### 4.4 Usability Requirements
- **User Training:** New users should complete core onboarding within 5 minutes.
- **Accessibility:** Follow basic WCAG-friendly practices (contrast, labels, keyboard navigation).
- **Documentation:** Provide concise usage steps and troubleshooting notes in project README.

### 4.5 Portability and Compatibility
- **Supported Browsers:** Latest two major versions of Chrome, Firefox, Safari, and Edge.
- **Mobile Support:** Responsive web layout for modern iOS and Android browsers.
- **Operating Systems:** macOS, Windows, and Linux for development/testing.

### 4.6 Maintainability and Supportability
- **Code Quality Standards:** Enforce linting, formatting, and PR review before merge.
- **Documentation Standards:** Keep SRD and README updated with major requirement changes.
- **Support Requirements:** Team responds to critical demo-blocking issues within 24 hours.

---

## 5. Use Cases

### Use Case 1: [Use Case Name]

| Element | Description |
|---------|-------------|
| **Use Case ID** | UC-001 |
| **Actor(s)** | [Primary actor] |
| **Preconditions** | [Initial conditions] |
| **Main Flow** | 1. Actor does X<br/>2. System responds with Y<br/>3. Actor does Z |
| **Alternate Flow** | [If applicable] |
| **Postconditions** | [End state] |
| **Business Rules** | [Any rules that apply] |

### Use Case 2: [Use Case Name]
[Follow the format above]

### Use Case Diagram
[Add a visual representation of use cases and actors, if applicable]

---

## 6. System Constraints

### 6.1 Technical Constraints
[e.g., Must use specific technology stack, database, API standards]

### 6.2 Business Constraints
[e.g., Budget, timeline, regulatory compliance]

### 6.3 Legal/Compliance Constraints
[e.g., GDPR, CCPA, industry standards]

### 6.4 Development Constraints
[e.g., Team size, development methodology, course requirements]

---

## 7. Acceptance Criteria

### 7.1 Functional Acceptance
- [ ] All functional requirements (FR-1 through FR-N) are implemented and tested
- [ ] All use cases complete successfully
- [ ] System handles normal workflows without errors
- [ ] Error handling is implemented for edge cases

### 7.2 Non-Functional Acceptance
- [ ] Performance benchmarks are met
- [ ] Security requirements are verified through testing
- [ ] Accessibility standards are met
- [ ] Documentation is complete and accurate

### 7.3 Quality Acceptance
- [ ] Code passes linting and style checks
- [ ] Unit test coverage > [specify %]
- [ ] Integration tests pass
- [ ] No critical bugs remain

### 7.4 User Acceptance
- [ ] Users can complete key tasks without assistance
- [ ] System behavior matches documented requirements
- [ ] Feedback from test users is positive

---

## 8. Assumptions and Dependencies

### 8.1 Assumptions
- [Assumption 1: e.g., Users will have stable internet connection]
- [Assumption 2: e.g., Database will be hosted on AWS]
- [Assumption 3]

### 8.2 Dependencies
- [Dependency on external service/system X]
- [Dependency on framework/library Y]
- [Dependency on team/resource Z]

---

## 9. Glossary

| Term | Definition |
|------|-----------|
| [Term 1] | [Definition] |
| [Term 2] | [Definition] |
| API | Application Programming Interface |
| SLA | Service Level Agreement |
| RTO | Recovery Time Objective |
| RPO | Recovery Point Objective |

---

## 10. Appendices

### 10.1 References
- [Reference Document 1]
- [Reference Document 2]
- [Course Materials: CSC 307]

### 10.2 Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | April 15, 2026 | Team | Initial document creation |
| 1.1 | May 1, 2026 | Jerry, Sofia, Julia, Ceya | Added TE2 product vision, 12 user stories with authors, and current functional/non-functional requirements |

### 10.3 Sign-Off

**Project Manager:** _________________ Date: _________

**Product Owner:** _________________ Date: _________

**Technical Lead:** _________________ Date: _________

---

## Notes for Completion

When filling in this template, consider:

1. **Be Specific:** Replace all placeholder text with concrete details about your project
2. **Use Clear Language:** Avoid jargon or explain technical terms in the glossary
3. **Be Measurable:** Requirements should be testable and verifiable
4. **Prioritize:** Consider marking requirements as Must-Have, Should-Have, or Nice-to-Have
5. **Review:** Have stakeholders review and approve the SRD before development begins
6. **Maintain:** Update this document as requirements change during development

---

*This is a living document and should be reviewed and updated regularly throughout the project lifecycle.*
