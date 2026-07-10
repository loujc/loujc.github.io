---
title: 'LEGO: An LLM Skill-Based Front-End Design Generation Platform'
authors:
  - me
  - Ruohan Xu
  - Jiecheng Ma
  - Runzhe Tao
  - Xinyu Qu
  - Yibo Lin
date: '2026-05-01T00:00:00Z'
publishDate: '2026-05-01T00:00:00Z'
publication_types: ['paper-conference']
publication:
  name: 2026 International Symposium of Electronics Design Automation
  short_name: ISEDA
peer_reviewed: true
open_access: false
awards:
  - name: Best Paper Nomination
    level: selected
abstract: >-
  Existing LLM-based EDA agents are often isolated, task-specific systems, leading to repeated engineering effort and limited reuse of successful design and debugging strategies. LEGO is a unified skill-based platform that decomposes the digital front-end flow into six steps and represents agent capabilities as standardized, composable circuit skills. The platform extracts 42 executable skills from 11 representative open-source projects. On a hard subset of 41 VerilogEval v2 problems, individual skills improve Pass@1 from 0 to 0.805 over the base coding-agent setup.
summary: A plug-and-play agent platform that packages EDA methods as reusable circuit skills for front-end design generation.
tags:
  - Agentic EDA
  - RTL Generation
  - LLM Agents
featured: true
links:
  - type: code
    url: https://github.com/loujc/LEGO-An-LLM-Skill-Based-Front-End-Design-Generation-Platform
---

LEGO provides a shared execution layer for composing methods from otherwise
isolated EDA-agent projects. The open-source repository contains the platform,
skill library, and evaluation setup.
