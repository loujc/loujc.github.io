---
# Leave the homepage title empty to use the site title
title: ''
summary: 'Jincheng Lou - ChipBagel Founder & CEO and Ph.D. candidate at Peking University.'
date: 2026-07-11T00:00:00+08:00
type: landing

sections:
  - block: resume-biography-3
    content:
      # Choose a user profile to display (a folder name within `content/authors/`)
      username: me
      text: ''
      # Show a call-to-action button under your biography? (optional)
      button:
        text: Download CV
        url: uploads/cv.pdf
      availability_cta:
        text: View availability
        hint: Find a time for a conversation
        url: '#availability'
      avatar_spotlight_label: Toggle portrait spotlight
      headings:
        about: About
        interests: Research Interests
    design:
      # Name heading sizing to accommodate long or short names
      name:
        size: md # Options: xs, sm, md, lg (default), xl

      # Avatar customization
      avatar:
        size: medium # Options: small (150px), medium (200px, default), large (320px), xl (400px), xxl (500px)
        shape: rounded # Options: circle (default), square, rounded
  - block: availability-calendar
    id: availability
    content:
      title: Availability
      text: Public busy times for scheduling, shown in China Standard Time.
      location_note: 'Weekdays: usually at Peking University Haidian Campus; weekends uncertain.'
      privacy_note: Only occupied periods are published. Titles, locations, notes, and participants remain private.
      disclaimer: Blank space is indicative only; please contact me to confirm before scheduling.
      loading: Loading anonymized availability…
      unavailable: Availability is temporarily unavailable. Please contact me to confirm a time.
      stale: Availability has not refreshed recently. Please contact me to confirm a time.
      busy_label: Occupied
      no_busy: No occupied periods shown
      outside_window: Not published
      previous_week: Previous week
      next_week: Next week
      today: Today
      updated: 'Last anonymized update: {time}'
      week_of: 'Week of {date}'
      now: 'Now · {time}'
      meeting_title: Request a meeting
      meeting_intro: Choose a candidate time from my current public availability. I will confirm it by email.
      meeting_duration: Duration
      meeting_duration_30: 30 minutes
      meeting_duration_60: 60 minutes
      meeting_date: Date
      meeting_time: Candidate time
      meeting_name: Your name
      meeting_email: Reply email
      meeting_purpose: What would you like to discuss? (optional)
      meeting_review: Review request
      meeting_open_email: Open email draft
      meeting_copy: Copy request
      meeting_copied: Request copied
      meeting_no_slots: No candidate times are available for this duration.
      meeting_loading: Checking candidate times…
      meeting_unavailable: Meeting requests are temporarily unavailable. You can still email me directly.
      meeting_changed: That candidate is no longer available. Please choose another time.
      meeting_notice: This is a meeting request, not a confirmed booking. Send the email draft and wait for my reply.
      meeting_candidate: Candidate
      meeting_local_time: Your local time
      meeting_snapshot: Availability checked
      meeting_email_subject: Meeting request from {name}
      meeting_email_fallback: Email directly
  - block: resume-experience
    id: experience
    content:
      username: me
    design:
      date_format: 'January 2006'
  - block: collection
    id: publications
    content:
      title: Publications
      count: 0
      filters:
        folders:
          - publications
    design:
      view: citation
  - block: collection
    id: projects
    content:
      title: Selected Projects
      text: Open-source systems spanning autonomous research, agentic chip design, and AI-native media tools.
      filters:
        folders:
          - projects
    design:
      view: article-grid
      columns: 3
      fill_image: false
      show_date: false
      show_read_time: false
      show_read_more: false
---
