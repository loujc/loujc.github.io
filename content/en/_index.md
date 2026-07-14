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
  - block: resume-experience
    id: experience
    content:
      username: me
    design:
      date_format: 'January 2006'
  - block: availability-calendar
    id: availability
    content:
      title: Availability
      text: Public busy times for scheduling, shown in China Standard Time.
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
