---
title: ''
summary: '楼锦程，ChipBagel 创始人兼 CEO，北京大学集成电路学院博士生。'
date: 2026-07-11T00:00:00+08:00
type: landing

sections:
  - block: resume-biography-3
    content:
      username: me
      text: ''
      button:
        text: 下载简历
        url: uploads/cv.pdf
      headings:
        about: 关于我
        interests: 研究方向
    design:
      name:
        size: md
      avatar:
        size: medium
        shape: rounded
  - block: resume-experience
    id: experience
    content:
      username: me
    design:
      date_format: '2006 年 1 月'
  - block: availability-calendar
    id: availability
    content:
      title: 空闲时间
      text: 公开可约时间，统一按中国标准时间显示。
      privacy_note: 仅公开已占用时段，行程标题、地点、备注和参与者始终保密。
      disclaimer: 空白时段仅供参考，预约前请与我确认。
      loading: 正在加载匿名化日程…
      unavailable: 空闲时间暂时无法获取，请直接联系我确认。
      stale: 日程最近未能及时刷新，请直接联系我确认。
      busy_label: 已占用
      no_busy: 暂无公开的占用时段
      outside_window: 未公开
      previous_week: 上一周
      next_week: 下一周
      today: 本周
      updated: '最近匿名更新时间：{time}'
      week_of: '{date}所在周'
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
      title: 精选项目
      text: 覆盖自主科研、Agentic 芯片设计与 AI 原生内容工具的开源项目。
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
