# Pipedriver Requirements and Technical Specification

---

## Part 1: Requirements Specification (User-Oriented)

### 1. Purpose
Pipedriver is a standalone, mobile-optimised tool to enhance campaign management, contact targeting, and outreach tracking layered on top of Pipedrive CRM.

### 2. Core User Roles
- **Consultant (Owner)** – creates and runs campaigns
- **Golden Ticket Owner** – senior accountable party for priority contacts/campaigns

### 3. Key Features

#### 3.1 Campaigns
- Fields: Name, Sector, Country, Theme, Description, Start/End Dates, Owner, Golden Ticket Owner
- Statuses: Candidate, Planning, In Progress, On Hold, Complete, Cancelled
- Optional Targets: Number of Contacts, Number of Meetings
- Displayed in a Kanban-style board, ordered by status
- Each campaign card shows:
  - Title
  - Owner & Golden Ticket Owner
  - Target counts (optional)
  - Stats: Number of Contacts, Activities, Warm Leads
  - Favourite toggle

#### 3.2 Contacts
- Contacts can be searched locally, then in Pipedrive
- If not found, can be created locally
- On becoming a Warm Lead:
  - Contact is created or updated in Pipedrive
  - Label set to "Warm Lead"
  - Campaign field updated
  - Recurring Activity Frequency set to 3 months
  - All related activities synced to Pipedrive
- Contact view:
  - Unified, scrollable card
  - Shows: Name, Org, Pipedrive existence, activity status (colour coded)
  - Tagging: Cold (default), Warm, Lost Cause
  - Buttons for common actions:
    - Email Sent
    - Meeting Requested
    - Meeting Planned (asks for date)
    - Meeting Completed (asks for note)
    - ...Other Actions

#### 3.3 My 500 View
- Shows contacts owned by the user (from app and Pipedrive)
- Sort order:
  1. Recurring Activity Frequency
  2. Last Activity Date
  3. Existing Customer status
  4. Existing Customer Org status
- Visual indicators for activity and lead status
- Alerts for no recent activity

#### 3.4 Activity Tracking
- Activity buttons trigger creation of local activity records
- Once contact becomes Warm, activities replicated in Pipedrive
- Momentum dashboard (compact, visual)
- Timeline view in contact

#### 3.5 Admin Settings
- Manage sectors, themes, labels, statuses, etc., if not present in Pipedrive

---

## Part 2: Technical Specification

### 1. Stack & Platform
- **Frontend:** React + Next.js
- **UI Framework:** Tailwind CSS + shadcn/ui
- **Backend:** Node.js or serverless (TBD)
- **Pipedrive Integration:** via Pipedrive API (OAuth + REST)

### 2. Entities

#### 2.1 Campaign
- ID, Name, Sector, Country, Theme, Description
- StartDate, EndDate
- Owner (user ID), GoldenTicketOwner (user ID)
- Status (enum)
- ContactTargetCount, MeetingTargetCount

#### 2.2 Contact
- ID, Name, Organisation, Email, Linked Pipedrive Contact ID
- Pipedrive Status (boolean)
- Tags: Cold (default), Warm, Lost Cause
- Campaign Link (ID)
- ActivityLog[]
- Status Indicators: Colour-coded

#### 2.3 Activity
- ID, Contact ID, Type (enum), Date, Note (optional), CreatedBy
- SyncedToPipedrive (boolean)

#### 2.4 User
- ID, Name, Email, Role
- Associated Contacts (500 View)
- Associated Campaigns

### 3. Logic & Rules
- Campaign Cards sorted by Status (Kanban columns)
- Contacts sorted on 500 Page using composite logic:
  - Recurring Activity Frequency (ASC)
  - Last Activity Date (ASC)
  - Existing Customer? (boolean)
  - Existing Customer Org? (boolean)
- Warm Conversion triggers:
  - Pipedrive contact/org update
  - Activity replication
  - Label and campaign field sync
- Visual indicators:
  - Grey = no activity
  - Yellow = some activity
  - Green = Warm Lead

### 4. API Integration (Pipedrive)
- Search: Contacts, Organisations
- Create/Update: Contacts, Organisations
- Create: Activities (type mapped)
- Update: Labels, Custom Fields (Campaign, Recurring Activity Frequency)

### 5. UI Components
- Kanban Board (Campaigns)
- Search/Import Modal (Contacts)
- Unified Contact Card (slideover/modal)
- Momentum Dashboards
- Settings Panel
- Tabs for Campaign / 500 views

### 6. Notifications
- Alert flags for contacts with no recent activity
- Prompts for notes when completing key actions
- Optional follow-up prompts (TBD)