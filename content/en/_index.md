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
