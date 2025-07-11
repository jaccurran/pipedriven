# Early-Stage Lead Sourcing System - Functional & Technical Specification

## Overview

This system supports early-stage outreach and lead sourcing before formal opportunities are created in Pipedrive. It supplements Pipedrive by managing campaigns, personal contact banks, and activity tracking, with integration into Pipedrive for People, Organisations, and Activities only.

---

## Functional Specification

### 1. Campaign Management

- Create and manage campaigns (sector, theme, geography, etc.)
- Assign 10–30 contacts per campaign
- Track outreach method per contact:
  - Campaign email
  - Direct email
  - LinkedIn
  - Referral
  - Conference
- Log notes and meeting outcomes
- View campaign performance (e.g. meetings booked/requested)

---

### 2. Personal Contact Bank

- Each user maintains a private bank of ~500 contacts
- System generates a "who to contact next" list based on:
  - Time since last contact
  - Warmness
  - Past business generated
  - Relevance to live campaigns
- Track contact method and notes
- Set follow-up reminders
- Add contacts to campaigns
- Flag contact as warm or escalate to booked meeting

---

### 3. Activity Feed

- Daily list of suggested contacts to reach out to
- Filters:
  - Campaign
  - Contact priority
  - Last activity
- Actions:
  - Log outreach
  - Add notes
  - Schedule or record meetings
  - Flag as warm

---

### 4. Pipedrive Integration

#### Trigger

- Triggered when:
  - A contact is flagged as **warm**
  - A **meeting is booked**

#### Objects Affected

1. **Person**
   - Create/update via:
     - `POST /persons`
     - `PUT /persons/{id}`
   - Fields:
     - `name`, `email`, `phone`, `label`, `owner_id`, `campaign_source` (custom field)

2. **Organisation**
   - Create/update via:
     - `POST /organizations`
     - `PUT /organizations/{id}`
   - Fields:
     - `name`, `owner_id`, `address`

3. **Activity**
   - Create via:
     - `POST /activities`
   - Fields:
     - `type`, `subject`, `due_date`, `person_id`, `org_id`, `note`

---

### 5. User Roles

- **Golden Ticket Team**
  - Manage campaigns
  - Assign contacts
- **Consultants/Sales**
  - Manage personal contact bank
  - Execute outreach
  - Log activities

*No permission segmentation in the UI — filtered by user ownership.*

---

### 6. Reporting & Metrics

- KPIs:
  - Meetings requested
  - Meetings booked
- Filters:
  - By campaign
  - By user
  - By method of contact

---

### 7. Interface Requirements

#### Mobile-first UX

- “Who should I contact today?” feed
- Tap-to-log outreach
- Prioritised task view

#### Desktop UX

- Campaign management
- Contact upload (CSV)
- Reporting dashboard

---

### 8. Exclusions

- No Deal creation in Pipedrive
- No opportunity or pipeline management
- No calendar/email integration (initially)

---

### 9. Future Enhancements (Optional)

- Contact scoring model
- Campaign heatmaps
- Calendar/email sync
- Voice note logging

---

## Technical Specification

### 1. Tech Stack

| Layer        | Technology      |
|--------------|-----------------|
| Frontend     | React, TypeScript |
| Backend      | Node.js (with TypeScript) |
| Database     | PostgreSQL      |
| External API | Pipedrive API v1 |

---

### 2. Data Models (PostgreSQL)

#### Users

```sql
users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT CHECK (role IN ('consultant', 'golden_ticket')) NOT NULL
)
```

#### Campaigns

```sql
campaigns (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  sector TEXT,
  theme TEXT,
  start_date DATE,
  end_date DATE
)
```

#### Contacts

```sql
contacts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  organisation TEXT,
  warmness_score INTEGER DEFAULT 0,
  last_contacted DATE,
  added_to_campaign BOOLEAN DEFAULT FALSE
)
```

#### Campaign_Contacts (junction table)

```sql
campaign_contacts (
  id SERIAL PRIMARY KEY,
  campaign_id INTEGER REFERENCES campaigns(id),
  contact_id INTEGER REFERENCES contacts(id),
  outreach_method TEXT,
  last_outreach TIMESTAMP,
  notes TEXT
)
```

#### Activities

```sql
activities (
  id SERIAL PRIMARY KEY,
  contact_id INTEGER REFERENCES contacts(id),
  user_id INTEGER REFERENCES users(id),
  type TEXT CHECK (type IN ('call', 'email', 'meeting', 'linkedin', 'referral', 'conference')),
  subject TEXT,
  note TEXT,
  due_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
)
```

---

### 3. API Routes (Backend)

#### Campaigns

- `GET /campaigns`
- `POST /campaigns`
- `POST /campaigns/:id/assign-contacts`

#### Contacts

- `GET /contacts`
- `GET /contacts/suggested` (based on prioritisation rules)
- `POST /contacts`
- `PUT /contacts/:id`

#### Activities

- `GET /activities`
- `POST /activities`

#### Integration

- `POST /pipedrive/sync` (triggered when contact flagged as warm or meeting booked)

---

### 4. Pipedrive Sync Logic

1. Match or create Organisation using `/organizations/find` and `POST /organizations`
2. Match or create Person using `/persons/find` and `POST /persons`
3. Update Person with labels or custom fields via `PUT /persons/{id}`
4. Create Activity with meeting or outreach info via `POST /activities`

---

### 5. Deployment Notes

- Use environment variables for Pipedrive API token
- Queue or debounce outbound API calls to avoid rate limits
- Add logging for failed syncs and retries
- Host on a platform compatible with Node.js/PostgreSQL (e.g. Railway, Render, Vercel for frontend)
