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
      availability_cta:
        text: 查看可约时间
        hint: 找一个合适的时间聊聊
        url: '#availability'
      avatar_spotlight_label: 切换人像聚光灯
      headings:
        about: 关于我
        interests: 研究方向
    design:
      name:
        size: md
      avatar:
        size: medium
        shape: rounded
  - block: availability-calendar
    id: availability
    content:
      title: 空闲时间
      text: 公开可约时间，统一按中国标准时间显示。
      location_note: 工作日基本常驻北大海淀校区，周末未知。
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
      now: '现在 · {time}'
      meeting_title: 申请会议
      meeting_intro: 根据当前公开空闲时间选择一个候选时段，我会通过邮件确认。
      meeting_duration: 时长
      meeting_duration_30: 30 分钟
      meeting_duration_60: 60 分钟
      meeting_date: 日期
      meeting_time: 候选时间
      meeting_name: 你的姓名
      meeting_email: 回复邮箱
      meeting_purpose: 想聊什么？（可选）
      meeting_review: 核对申请
      meeting_open_email: 打开邮件草稿
      meeting_copy: 复制申请内容
      meeting_copied: 申请内容已复制
      meeting_no_slots: 这个时长暂时没有可选候选时间。
      meeting_loading: 正在检查候选时间…
      meeting_unavailable: 会议申请暂时不可用，你仍可直接给我发邮件。
      meeting_changed: 这个候选时间已经不可用，请重新选择。
      meeting_notice: 这只是会议申请，不代表预约成功。请发送邮件草稿，并等待我的回复确认。
      meeting_candidate: 候选时间
      meeting_local_time: 你的本地时间
      meeting_snapshot: 日程校验时间
      meeting_email_subject: 来自 {name} 的会议申请
      meeting_email_fallback: 直接发邮件
  - block: resume-experience
    id: experience
    content:
      username: me
    design:
      date_format: '2006 年 1 月'
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
