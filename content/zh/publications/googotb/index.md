---
title: 'GoGoTB: Agentic RTL Verification with Specification-Grounded Coverage Closure'
authors:
  - Xin Xin
  - me
  - Junhui Li
  - Jinglin Yan
  - Panda Xiao
  - Di Wu
  - Haixiao Li
  - Weicong Lu
  - Weijian Fan
  - Xinyu Qu
  - Yuxiang Zhao
  - Min Yu
  - Zhixiong Di
  - Yibo Lin
date: '2026-07-28T00:00:00Z'
publishDate: '2026-07-28T00:00:00Z'
publication_types: ['preprint']
publication:
  name: arXiv preprint
  short_name: arXiv:2607.26181
peer_reviewed: false
open_access: true
abstract: >-
  Functional verification dominates integrated circuit (IC) front-end engineering effort, and a single missed bug that escapes to silicon can trigger a costly respin. Recent large language models (LLMs) offer new opportunities to automate this process, yet existing LLM-based approaches generate each component through independent single-turn calls with no shared context, leaving interface mismatches undetected and reported coverage disconnected from specification requirements. To address these challenges, we present GoGoTB, an agentic framework that achieves end-to-end verification closure through three subsystems: an agentic execution control layer, an evolvable knowledge system, and specification-grounded coverage closure. The execution control layer separates deterministic enforcement from LLM reasoning at every tool and stage boundary. The knowledge system dispatches methodology and design-specific expertise on demand. The coverage framework anchors every bin to a named specification behavior so that each residual gap has a diagnosable root cause and a targeted remedy. Tested on 8 register transfer level (RTL) designs without any human intervention, GoGoTB achieves 100% environment generation success and averages 98.4% line, 97.2% branch, 97.0% toggle, and 83.2% functional coverage. No prior work successfully generates a complete verification environment or achieves meaningful coverage on the same benchmarks.
summary: An agentic framework for end-to-end RTL verification with specification-grounded coverage closure.
tags:
  - Agentic EDA
  - RTL Verification
  - Coverage Closure
featured: false
links:
  - type: preprint
    provider: arxiv
    id: '2607.26181'
---
